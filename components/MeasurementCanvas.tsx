'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool, Point, Measurement, CalibrationData, CanvasItem } from '@/types';
import {
  calculatePixelDistance,
  calculatePixelArea,
  pixelsToReal,
  pixelAreaToReal,
  formatLength,
  formatArea,
  getNextColor,
  generateId,
} from '@/utils/measurements';
import { Check, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrawState {
  isDrawing: boolean;
  points: Point[];
  calibrationPoints: Point[];
}

type CropHandle = 'tl' | 'tr' | 'bl' | 'br' | 'l' | 'r' | 't' | 'b';

interface CropState {
  itemId: string;
  // Crop rect edges in world (virtual canvas) coordinates
  left: number; top: number; right: number; bottom: number;
  // Full natural image bounds in world coords (so handles can expand beyond current crop)
  fullLeft: number; fullTop: number; fullRight: number; fullBottom: number;
  // Active handle drag
  activeHandle: CropHandle | null;
  dragStartPt: Point | null;
  dragStartEdges: { left: number; top: number; right: number; bottom: number } | null;
}

export interface MeasurementCanvasRef {
  fitAll: () => void;
  /** Returns a base64 JPEG of the current canvas view */
  getThumbnail: () => string;
}

interface Props {
  canvasItems: CanvasItem[];
  activeTool: Tool;
  calibration: CalibrationData | null;
  measurements: Measurement[];
  selectedMeasurementId: string | null;
  selectedItemId: string | null;
  onMeasurementsChange: (m: Measurement[]) => void;
  onCalibrationDrawn: (px: number) => void;
  onSelectMeasurement: (id: string | null) => void;
  onSelectItem: (id: string | null) => void;
  onItemsChange: (items: CanvasItem[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MeasurementCanvas = forwardRef<MeasurementCanvasRef, Props>(function MeasurementCanvas(
  {
    canvasItems,
    activeTool,
    calibration,
    measurements,
    selectedMeasurementId,
    selectedItemId,
    onMeasurementsChange,
    onCalibrationDrawn,
    onSelectMeasurement,
    onSelectItem,
    onItemsChange,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [drawState, setDrawState] = useState<DrawState>({ isDrawing: false, points: [], calibrationPoints: [] });
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [cropState, setCropState] = useState<CropState | null>(null);
  // Item being moved - local override so parent only updates on mouseup
  const [draggedItem, setDraggedItem] = useState<{ id: string; x: number; y: number } | null>(null);
  // Measurement being moved - local override so parent only updates on mouseup
  const [draggedMeasurement, setDraggedMeasurement] = useState<{ id: string; points: Point[] } | null>(null);

  const isPanRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  // Space bar temporarily activates pan (like Figma)
  const spaceHeldRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' && !spaceHeldRef.current) {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        // If we were panning via space, release the pan
        if (isPanRef.current) {
          isPanRef.current = false;
          panStartRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  const itemDragRef = useRef<{
    itemId: string;
    screenStart: Point;
    origX: number;
    origY: number;
  } | null>(null);
  const measurementDragRef = useRef<{
    measurementId: string;
    screenStart: Point;
    origPoints: Point[];
  } | null>(null);
  // Track whether the last-placed point is still being held/dragged for fine-tuning
  const adjustingLastPointRef = useRef(false);
  // Mirror of drawState kept in sync on every render so event handlers always read fresh values
  const drawStateRef = useRef(drawState);
  drawStateRef.current = drawState;

  // ── Crop state initialization ─────────────────────────────────────────────────
  // Re-initialize whenever the active tool switches to crop or the selected item changes.
  // Using a ref to read latest canvasItems without adding it to the effect deps
  // (we don't want to reset the crop rect mid-drag if items re-render).
  const canvasItemsRef = useRef(canvasItems);
  canvasItemsRef.current = canvasItems;

  useEffect(() => {
    if (activeTool === 'crop' && selectedItemId) {
      const item = canvasItemsRef.current.find((i) => i.id === selectedItemId);
      if (item) setCropState(initCropState(item));
    } else if (activeTool !== 'crop') {
      setCropState(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, selectedItemId]);

  // ── Image loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    canvasItems.forEach((item) => {
      if (imageCache.current.has(item.id)) return;
      const img = new window.Image();
      img.src = item.imageUrl;
      img.onload = () => {
        imageCache.current.set(item.id, img);
        draw();
      };
    });
    // Remove stale cache entries
    const ids = new Set(canvasItems.map((i) => i.id));
    imageCache.current.forEach((_, id) => { if (!ids.has(id)) imageCache.current.delete(id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasItems]);

  // ── Fit all items ────────────────────────────────────────────────────────────

  const fitAll = useCallback(() => {
    const container = containerRef.current;
    if (!container || canvasItems.length === 0) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    canvasItems.forEach((item) => {
      const dw = item.crop.width * item.scale;
      const dh = item.crop.height * item.scale;
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + dw);
      maxY = Math.max(maxY, item.y + dh);
    });

    const bw = maxX - minX;
    const bh = maxY - minY;
    if (bw === 0 || bh === 0) return;

    const scale = Math.min(cw / bw, ch / bh) * 0.92;
    setTransform({
      scale,
      offsetX: (cw - bw * scale) / 2 - minX * scale,
      offsetY: (ch - bh * scale) / 2 - minY * scale,
    });
  }, [canvasItems]);

  const getThumbnail = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const MAX = 400;
    const ratio = Math.min(MAX / canvas.width, MAX / canvas.height, 1);
    const thumb = document.createElement('canvas');
    thumb.width = Math.round(canvas.width * ratio);
    thumb.height = Math.round(canvas.height * ratio);
    const ctx = thumb.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return thumb.toDataURL('image/jpeg', 0.8);
  }, []);

  useImperativeHandle(ref, () => ({ fitAll, getThumbnail }), [fitAll, getThumbnail]);

  // ── Resize observer ──────────────────────────────────────────────────────────

  useEffect(() => {
    const ro = new ResizeObserver(fitAll);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fitAll]);

  // ── Draw ─────────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#e9eaec';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height, transform);

    const { scale, offsetX, offsetY } = transform;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw canvas items (sorted by zIndex)
    const sorted = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);
    sorted.forEach((item) => {
      const imgEl = imageCache.current.get(item.id);
      if (!imgEl) return;

      // Apply drag override
      const ix = draggedItem?.id === item.id ? draggedItem.x : item.x;
      const iy = draggedItem?.id === item.id ? draggedItem.y : item.y;
      const dw = item.crop.width * item.scale;
      const dh = item.crop.height * item.scale;

      // Drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 12 / scale;
      ctx.shadowOffsetY = 4 / scale;
      ctx.drawImage(imgEl, item.crop.x, item.crop.y, item.crop.width, item.crop.height, ix, iy, dw, dh);
      ctx.restore();

      // Selection outline
      if (selectedItemId === item.id && (activeTool === 'select' || activeTool === 'crop')) {
        ctx.save();
        ctx.strokeStyle = activeTool === 'crop' ? '#F59E0B' : '#3B82F6';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([]);
        ctx.strokeRect(ix - 1 / scale, iy - 1 / scale, dw + 2 / scale, dh + 2 / scale);
        // Corner handles (select mode only)
        if (activeTool === 'select') {
          const hs = 7 / scale;
          [[ix, iy], [ix + dw, iy], [ix, iy + dh], [ix + dw, iy + dh]].forEach(([hx, hy]) => {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#3B82F6';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath();
            ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
            ctx.fill();
            ctx.stroke();
          });
        }
        ctx.restore();
      }

      // Crop overlay — handle-based UI
      if (activeTool === 'crop' && cropState?.itemId === item.id) {
        const cs = cropState;
        ctx.save();

        // 1. Draw the full image dimmed (reveals pixels outside current crop)
        ctx.globalAlpha = 0.35;
        ctx.drawImage(
          imgEl, 0, 0, item.naturalWidth, item.naturalHeight,
          cs.fullLeft, cs.fullTop,
          item.naturalWidth * item.scale, item.naturalHeight * item.scale,
        );
        ctx.globalAlpha = 1;

        // 2. Draw the crop region at full opacity (bright window)
        const srcX = (cs.left - cs.fullLeft) / item.scale;
        const srcY = (cs.top - cs.fullTop) / item.scale;
        const srcW = (cs.right - cs.left) / item.scale;
        const srcH = (cs.bottom - cs.top) / item.scale;
        ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, cs.left, cs.top, cs.right - cs.left, cs.bottom - cs.top);

        // 3. Dim overlay outside crop (evenodd cutout)
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.rect(cs.fullLeft, cs.fullTop, cs.fullRight - cs.fullLeft, cs.fullBottom - cs.fullTop);
        ctx.rect(cs.left, cs.top, cs.right - cs.left, cs.bottom - cs.top);
        ctx.fill('evenodd');

        // 4. Crop border
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5 / scale;
        ctx.setLineDash([]);
        ctx.strokeRect(cs.left, cs.top, cs.right - cs.left, cs.bottom - cs.top);

        // 5. Rule-of-thirds grid lines (subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.75 / scale;
        const cw2 = cs.right - cs.left, ch2 = cs.bottom - cs.top;
        [1 / 3, 2 / 3].forEach((t) => {
          ctx.beginPath(); ctx.moveTo(cs.left + cw2 * t, cs.top); ctx.lineTo(cs.left + cw2 * t, cs.bottom); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cs.left, cs.top + ch2 * t); ctx.lineTo(cs.right, cs.top + ch2 * t); ctx.stroke();
        });

        // 6. Handles — corners + edge midpoints
        const hs = 7 / scale;
        const handles: [number, number][] = [
          [cs.left, cs.top], [cs.right, cs.top], [cs.left, cs.bottom], [cs.right, cs.bottom],
          [(cs.left + cs.right) / 2, cs.top], [(cs.left + cs.right) / 2, cs.bottom],
          [cs.left, (cs.top + cs.bottom) / 2], [cs.right, (cs.top + cs.bottom) / 2],
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2 / scale;
          ctx.beginPath();
          ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
          ctx.fill();
          ctx.stroke();
        });

        ctx.restore();
      }
    });

    // Measurements (apply drag override for the one being moved)
    measurements.forEach((m) => {
      const override = draggedMeasurement?.id === m.id ? { ...m, points: draggedMeasurement.points } : m;
      drawMeasurement(ctx, override, m.id === selectedMeasurementId, scale);
    });

    // In-progress drawing
    if (drawState.isDrawing) {
      if (activeTool === 'calibrate' && drawState.calibrationPoints.length > 0) {
        drawCalibrationLine(ctx, drawState.calibrationPoints, mousePos, scale);
      } else if (activeTool === 'distance' && drawState.points.length > 0) {
        drawInProgressLine(ctx, drawState.points, mousePos, scale, calibration);
      } else if (activeTool === 'area' && drawState.points.length > 0) {
        drawInProgressPolygon(ctx, drawState.points, mousePos, scale, calibration);
      }
    }

    ctx.restore();
  }, [transform, drawState, measurements, selectedMeasurementId, selectedItemId, mousePos, activeTool, canvasItems, cropState, draggedItem, draggedMeasurement, calibration]);

  useEffect(() => { draw(); }, [draw]);

  // ── Coordinate helpers ───────────────────────────────────────────────────────

  const canvasToVirtual = useCallback(
    (cx: number, cy: number): Point => ({
      x: (cx - transform.offsetX) / transform.scale,
      y: (cy - transform.offsetY) / transform.scale,
    }),
    [transform]
  );

  const getScreenPos = (e: React.MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getTouchPos = (touch: Touch): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  // ── Item hit testing ─────────────────────────────────────────────────────────

  const hitTestItems = useCallback(
    (pt: Point): CanvasItem | null => {
      const sorted = [...canvasItems].sort((a, b) => b.zIndex - a.zIndex);
      for (const item of sorted) {
        const ix = draggedItem?.id === item.id ? draggedItem.x : item.x;
        const iy = draggedItem?.id === item.id ? draggedItem.y : item.y;
        const dw = item.crop.width * item.scale;
        const dh = item.crop.height * item.scale;
        if (pt.x >= ix && pt.x <= ix + dw && pt.y >= iy && pt.y <= iy + dh) return item;
      }
      return null;
    },
    [canvasItems, draggedItem]
  );

  // ── Mouse events ─────────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    const screenPt = getScreenPos(e);
    const vpt = canvasToVirtual(screenPt.x, screenPt.y);

    // Middle mouse or Space held = always pan
    if (e.button === 1 || spaceHeldRef.current) {
      isPanRef.current = true;
      panStartRef.current = { x: screenPt.x, y: screenPt.y, ox: transform.offsetX, oy: transform.offsetY };
      return;
    }

    // ── Pan tool ─────────────────────────────────────────────────────────────
    if (activeTool === 'pan') {
      isPanRef.current = true;
      panStartRef.current = { x: screenPt.x, y: screenPt.y, ox: transform.offsetX, oy: transform.offsetY };
      return;
    }

    // ── Select tool ──────────────────────────────────────────────────────────
    if (activeTool === 'select') {
      const hit = hitTestItems(vpt);
      if (hit) {
        onSelectItem(hit.id);
        onSelectMeasurement(null);
        itemDragRef.current = {
          itemId: hit.id,
          screenStart: screenPt,
          origX: hit.x,
          origY: hit.y,
        };
      } else {
        // Check measurement hit
        const mHit = findMeasurementAt(vpt);
        if (mHit) {
          onSelectMeasurement(mHit.id);
          onSelectItem(null);
          measurementDragRef.current = {
            measurementId: mHit.id,
            screenStart: screenPt,
            origPoints: mHit.points,
          };
        } else {
          onSelectItem(null);
          onSelectMeasurement(null);
          // Select tool does NOT pan — use the pan tool or Space+drag for that
        }
      }
      return;
    }

    // ── Delete tool ──────────────────────────────────────────────────────────
    if (activeTool === 'delete') {
      const mHit = findMeasurementAt(vpt);
      if (mHit) {
        onMeasurementsChange(measurements.filter((m) => m.id !== mHit.id));
        onSelectMeasurement(null);
      }
      return;
    }

    // ── Crop tool ────────────────────────────────────────────────────────────
    if (activeTool === 'crop') {
      // First check if clicking a handle on the active crop state
      if (cropState) {
        const handle = hitTestCropHandle(vpt, cropState, transform.scale);
        if (handle) {
          setCropState((prev) => prev ? {
            ...prev,
            activeHandle: handle,
            dragStartPt: vpt,
            dragStartEdges: { left: prev.left, top: prev.top, right: prev.right, bottom: prev.bottom },
          } : null);
          return;
        }
      }
      // Click on item → select and initialize crop state
      const hit = hitTestItems(vpt);
      if (hit) {
        setCropState(initCropState(hit));
        onSelectItem(hit.id);
      } else {
        setCropState(null);
        onSelectItem(null);
      }
      return;
    }

    // ── Calibrate ────────────────────────────────────────────────────────────
    if (activeTool === 'calibrate') {
      if (!drawState.isDrawing) {
        setDrawState({ isDrawing: true, points: [], calibrationPoints: [vpt] });
      } else if (drawState.calibrationPoints.length === 1) {
        // Place second point — finalization happens on mouseup so the user can drag to adjust
        setDrawState((p) => ({ ...p, calibrationPoints: [p.calibrationPoints[0], vpt] }));
      }
      adjustingLastPointRef.current = true;
      return;
    }

    // ── Distance ─────────────────────────────────────────────────────────────
    if (activeTool === 'distance') {
      if (!drawState.isDrawing) {
        setDrawState({ isDrawing: true, points: [vpt], calibrationPoints: [] });
      } else {
        setDrawState((p) => ({ ...p, points: [...p.points, vpt] }));
      }
      adjustingLastPointRef.current = true;
      return;
    }

    // ── Area ─────────────────────────────────────────────────────────────────
    if (activeTool === 'area') {
      if (!drawState.isDrawing) {
        setDrawState({ isDrawing: true, points: [vpt], calibrationPoints: [] });
      } else {
        setDrawState((p) => ({ ...p, points: [...p.points, vpt] }));
      }
      adjustingLastPointRef.current = true;
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const screenPt = getScreenPos(e);
    const vpt = canvasToVirtual(screenPt.x, screenPt.y);
    setMousePos(vpt);

    // Canvas pan
    if (isPanRef.current && panStartRef.current) {
      const { ox, oy, x, y } = panStartRef.current;
      setTransform((prev) => ({
        ...prev,
        offsetX: ox + screenPt.x - x,
        offsetY: oy + screenPt.y - y,
      }));
      return;
    }

    // Item drag
    if (itemDragRef.current) {
      const { itemId, screenStart, origX, origY } = itemDragRef.current;
      const dx = (screenPt.x - screenStart.x) / transform.scale;
      const dy = (screenPt.y - screenStart.y) / transform.scale;
      setDraggedItem({ id: itemId, x: origX + dx, y: origY + dy });
      return;
    }

    // Measurement drag
    if (measurementDragRef.current) {
      const { measurementId, screenStart, origPoints } = measurementDragRef.current;
      const dx = (screenPt.x - screenStart.x) / transform.scale;
      const dy = (screenPt.y - screenStart.y) / transform.scale;
      setDraggedMeasurement({
        id: measurementId,
        points: origPoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
      });
      return;
    }

    // Crop handle drag
    if (cropState?.activeHandle && cropState.dragStartPt && cropState.dragStartEdges) {
      const { activeHandle: h, dragStartPt, dragStartEdges: se, fullLeft, fullTop, fullRight, fullBottom } = cropState;
      const dx = vpt.x - dragStartPt.x;
      const dy = vpt.y - dragStartPt.y;
      const MIN = 20 / transform.scale;
      let { left, top, right, bottom } = se;
      if (h === 'tl' || h === 'bl' || h === 'l') left = Math.max(fullLeft, Math.min(se.left + dx, right - MIN));
      if (h === 'tr' || h === 'br' || h === 'r') right = Math.min(fullRight, Math.max(se.right + dx, left + MIN));
      if (h === 'tl' || h === 'tr' || h === 't') top = Math.max(fullTop, Math.min(se.top + dy, bottom - MIN));
      if (h === 'bl' || h === 'br' || h === 'b') bottom = Math.min(fullBottom, Math.max(se.bottom + dy, top + MIN));
      setCropState((prev) => prev ? { ...prev, left, top, right, bottom } : null);
    }

    // Point drag-to-adjust: move the last placed point while button is held
    if (adjustingLastPointRef.current) {
      if ((activeTool === 'distance' || activeTool === 'area') && drawState.isDrawing) {
        setDrawState((p) => {
          if (p.points.length === 0) return p;
          const pts = [...p.points];
          pts[pts.length - 1] = vpt;
          return { ...p, points: pts };
        });
      } else if (activeTool === 'calibrate' && drawState.isDrawing) {
        setDrawState((p) => {
          const calPts = [...p.calibrationPoints];
          if (calPts.length === 0) return p;
          calPts[calPts.length - 1] = vpt;
          return { ...p, calibrationPoints: calPts };
        });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // End canvas pan
    if (isPanRef.current) {
      isPanRef.current = false;
      panStartRef.current = null;
    }

    // End item drag
    if (itemDragRef.current && draggedItem) {
      const { itemId } = itemDragRef.current;
      onItemsChange(
        canvasItems.map((item) =>
          item.id === itemId ? { ...item, x: draggedItem.x, y: draggedItem.y } : item
        )
      );
      setDraggedItem(null);
      itemDragRef.current = null;
    }

    // End measurement drag
    if (measurementDragRef.current && draggedMeasurement) {
      const { measurementId } = measurementDragRef.current;
      onMeasurementsChange(
        measurements.map((m) =>
          m.id === measurementId ? { ...m, points: draggedMeasurement.points } : m
        )
      );
      setDraggedMeasurement(null);
      measurementDragRef.current = null;
    }

    // End crop handle drag
    if (cropState?.activeHandle) {
      setCropState((prev) => prev ? { ...prev, activeHandle: null, dragStartPt: null, dragStartEdges: null } : null);
    }

    // Commit the adjusted point position
    if (adjustingLastPointRef.current) {
      adjustingLastPointRef.current = false;
      // For calibrate: if both points are placed, fire calibration now
      if (activeTool === 'calibrate' && drawStateRef.current.calibrationPoints.length === 2) {
        onCalibrationDrawn(calculatePixelDistance(drawStateRef.current.calibrationPoints));
        setDrawState({ isDrawing: false, points: [], calibrationPoints: [] });
      }
    }

    if (e.button === 1) {
      isPanRef.current = false;
      panStartRef.current = null;
    }
  };

  const handleDoubleClick = (_e: React.MouseEvent) => {
    // The second click of a double-click fires a mousedown which added an extra point.
    // Use drawStateRef for the freshest value, then remove that extra point.
    const ds = drawStateRef.current;
    if (activeTool === 'distance' && ds.isDrawing && ds.points.length >= 2) {
      const pts = ds.points.slice(0, -1);
      finalizeMeasurement('distance', pts.length >= 2 ? pts : ds.points);
      return;
    }
    if (activeTool === 'area' && ds.isDrawing && ds.points.length >= 3) {
      const pts = ds.points.slice(0, -1);
      finalizeMeasurement('area', pts.length >= 3 ? pts : ds.points);
      return;
    }
  };

  // ── Touch events ─────────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Pinch zoom — 2 fingers
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const rect = canvasRef.current!.getBoundingClientRect();
      pinchRef.current = {
        dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        midX: (t1.clientX + t2.clientX) / 2 - rect.left,
        midY: (t1.clientY + t2.clientY) / 2 - rect.top,
      };
      return;
    }
    if (e.touches.length !== 1) return;
    e.preventDefault();

    const screenPt = getTouchPos(e.touches[0]);
    const vpt = canvasToVirtual(screenPt.x, screenPt.y);

    // Crop tool — hit-test handle first, then item
    if (activeTool === 'crop') {
      if (cropState) {
        const handle = hitTestCropHandle(vpt, cropState, transform.scale, 24);
        if (handle) {
          setCropState((prev) => prev ? {
            ...prev,
            activeHandle: handle,
            dragStartPt: vpt,
            dragStartEdges: { left: prev.left, top: prev.top, right: prev.right, bottom: prev.bottom },
          } : null);
          return;
        }
      }
      const hit = hitTestItems(vpt);
      if (hit) { setCropState(initCropState(hit)); onSelectItem(hit.id); }
      else { setCropState(null); onSelectItem(null); }
      return;
    }

    // Select tool — item drag or pan
    if (activeTool === 'select') {
      const hit = hitTestItems(vpt);
      if (hit) {
        onSelectItem(hit.id);
        itemDragRef.current = { itemId: hit.id, screenStart: screenPt, origX: hit.x, origY: hit.y };
      } else {
        isPanRef.current = true;
        panStartRef.current = { x: screenPt.x, y: screenPt.y, ox: transform.offsetX, oy: transform.offsetY };
      }
      return;
    }

    // Drawing tools — tap to add a point (same logic as mouse: adjust on hold)
    if (activeTool === 'calibrate') {
      if (!drawState.isDrawing) setDrawState({ isDrawing: true, points: [], calibrationPoints: [vpt] });
      else if (drawState.calibrationPoints.length === 1) {
        // Place second point; finalization happens on touchend so the user can drag to adjust
        setDrawState((p) => ({ ...p, calibrationPoints: [p.calibrationPoints[0], vpt] }));
      }
      adjustingLastPointRef.current = true;
      return;
    }
    if (activeTool === 'distance') {
      if (!drawState.isDrawing) setDrawState({ isDrawing: true, points: [vpt], calibrationPoints: [] });
      else setDrawState((p) => ({ ...p, points: [...p.points, vpt] }));
      adjustingLastPointRef.current = true;
      return;
    }
    if (activeTool === 'area') {
      if (!drawState.isDrawing) setDrawState({ isDrawing: true, points: [vpt], calibrationPoints: [] });
      else setDrawState((p) => ({ ...p, points: [...p.points, vpt] }));
      adjustingLastPointRef.current = true;
      return;
    }

    // Default / pan tool
    isPanRef.current = true;
    panStartRef.current = { x: screenPt.x, y: screenPt.y, ox: transform.offsetX, oy: transform.offsetY };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, cropState, drawState, transform, canvasToVirtual, hitTestItems]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Pinch zoom
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = newDist / pinchRef.current.dist;
      const { midX, midY } = pinchRef.current;
      setTransform((prev) => {
        const newScale = Math.min(Math.max(prev.scale * factor, 0.01), 30);
        const ratio = newScale / prev.scale;
        return { scale: newScale, offsetX: midX - ratio * (midX - prev.offsetX), offsetY: midY - ratio * (midY - prev.offsetY) };
      });
      pinchRef.current = { ...pinchRef.current, dist: newDist };
      return;
    }
    if (e.touches.length !== 1) return;
    e.preventDefault();

    const screenPt = getTouchPos(e.touches[0]);
    const vpt = canvasToVirtual(screenPt.x, screenPt.y);
    setMousePos(vpt);

    if (isPanRef.current && panStartRef.current) {
      const { ox, oy, x, y } = panStartRef.current;
      setTransform((prev) => ({
        ...prev,
        offsetX: ox + screenPt.x - x,
        offsetY: oy + screenPt.y - y,
      }));
      return;
    }

    if (itemDragRef.current) {
      const { itemId, screenStart, origX, origY } = itemDragRef.current;
      const dx = (screenPt.x - screenStart.x) / transform.scale;
      const dy = (screenPt.y - screenStart.y) / transform.scale;
      setDraggedItem({ id: itemId, x: origX + dx, y: origY + dy });
      return;
    }

    if (cropState?.activeHandle && cropState.dragStartPt && cropState.dragStartEdges) {
      const { activeHandle: h, dragStartPt, dragStartEdges: se, fullLeft, fullTop, fullRight, fullBottom } = cropState;
      const dx = vpt.x - dragStartPt.x;
      const dy = vpt.y - dragStartPt.y;
      const MIN = 20 / transform.scale;
      let { left, top, right, bottom } = se;
      if (h === 'tl' || h === 'bl' || h === 'l') left = Math.max(fullLeft, Math.min(se.left + dx, right - MIN));
      if (h === 'tr' || h === 'br' || h === 'r') right = Math.min(fullRight, Math.max(se.right + dx, left + MIN));
      if (h === 'tl' || h === 'tr' || h === 't') top = Math.max(fullTop, Math.min(se.top + dy, bottom - MIN));
      if (h === 'bl' || h === 'br' || h === 'b') bottom = Math.min(fullBottom, Math.max(se.bottom + dy, top + MIN));
      setCropState((prev) => prev ? { ...prev, left, top, right, bottom } : null);
      return;
    }

    // Point drag-to-adjust: slide the last placed point while finger is held down
    if (adjustingLastPointRef.current) {
      if ((activeTool === 'distance' || activeTool === 'area') && drawStateRef.current.isDrawing) {
        setDrawState((p) => {
          if (p.points.length === 0) return p;
          const pts = [...p.points];
          pts[pts.length - 1] = vpt;
          return { ...p, points: pts };
        });
      } else if (activeTool === 'calibrate' && drawStateRef.current.isDrawing) {
        setDrawState((p) => {
          const calPts = [...p.calibrationPoints];
          if (calPts.length === 0) return p;
          calPts[calPts.length - 1] = vpt;
          return { ...p, calibrationPoints: calPts };
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, cropState, transform, canvasToVirtual]);

  const handleTouchEnd = useCallback((_e: TouchEvent) => {
    pinchRef.current = null;

    if (isPanRef.current) {
      isPanRef.current = false;
      panStartRef.current = null;
    }

    if (itemDragRef.current && draggedItem) {
      const { itemId } = itemDragRef.current;
      onItemsChange(canvasItems.map((item) => item.id === itemId ? { ...item, x: draggedItem.x, y: draggedItem.y } : item));
      setDraggedItem(null);
      itemDragRef.current = null;
    }

    if (cropState?.activeHandle) {
      setCropState((prev) => prev ? { ...prev, activeHandle: null, dragStartPt: null, dragStartEdges: null } : null);
    }

    // Commit the adjusted point position (mirror of mouseup logic)
    if (adjustingLastPointRef.current) {
      adjustingLastPointRef.current = false;
      if (activeTool === 'calibrate' && drawStateRef.current.calibrationPoints.length === 2) {
        onCalibrationDrawn(calculatePixelDistance(drawStateRef.current.calibrationPoints));
        setDrawState({ isDrawing: false, points: [], calibrationPoints: [] });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, cropState, draggedItem, canvasItems, onItemsChange, onCalibrationDrawn]);

  // ── Register touch handlers with { passive: false } ───────────────────────────
  // React registers JSX touch handlers as passive by default (breaks preventDefault).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // ── Apply / cancel crop ──────────────────────────────────────────────────────

  const applyCrop = useCallback(() => {
    if (!cropState) return;
    const item = canvasItems.find((i) => i.id === cropState.itemId);
    if (!item) return;
    // Convert from world coords → natural image coords
    const newCropX = (cropState.left - cropState.fullLeft) / item.scale;
    const newCropY = (cropState.top - cropState.fullTop) / item.scale;
    const newCropW = (cropState.right - cropState.left) / item.scale;
    const newCropH = (cropState.bottom - cropState.top) / item.scale;
    onItemsChange(
      canvasItems.map((i) =>
        i.id === item.id
          ? {
              ...i,
              x: cropState.left,
              y: cropState.top,
              crop: {
                x: Math.max(0, newCropX),
                y: Math.max(0, newCropY),
                width: Math.min(newCropW, item.naturalWidth - Math.max(0, newCropX)),
                height: Math.min(newCropH, item.naturalHeight - Math.max(0, newCropY)),
              },
            }
          : i
      )
    );
    setCropState(null);
  }, [cropState, canvasItems, onItemsChange]);

  const cancelCrop = useCallback(() => {
    setCropState(null);
  }, []);

  // Reset crop to full image
  const resetCrop = useCallback(
    (itemId: string) => {
      const item = canvasItems.find((i) => i.id === itemId);
      if (!item) return;
      onItemsChange(
        canvasItems.map((i) =>
          i.id === itemId
            ? { ...i, crop: { x: 0, y: 0, width: i.naturalWidth, height: i.naturalHeight } }
            : i
        )
      );
    },
    [canvasItems, onItemsChange]
  );
  void resetCrop; // exposed to parent via ref if needed

  // ── Mouse wheel zoom ─────────────────────────────────────────────────────────

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.06 : 1 / 1.06;
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * factor, 0.01), 30);
      const ratio = newScale / prev.scale;
      return { scale: newScale, offsetX: mx - ratio * (mx - prev.offsetX), offsetY: my - ratio * (my - prev.offsetY) };
    });
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') {
        setDrawState({ isDrawing: false, points: [], calibrationPoints: [] });
        setCropState(null);
      }
      if ((e.key === 'Enter') && drawState.isDrawing) {
        if (activeTool === 'distance' && drawState.points.length >= 2)
          finalizeMeasurement('distance', drawState.points);
        else if (activeTool === 'area' && drawState.points.length >= 3)
          finalizeMeasurement('area', drawState.points);
      }
      if (e.key === 'Enter' && cropState) {
        applyCrop();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawState, activeTool, measurements, calibration, cropState]);

  // ── Finalize measurement ─────────────────────────────────────────────────────

  const finalizeMeasurement = (type: 'distance' | 'area', pts: Point[]) => {
    const color = getNextColor(measurements.length);
    if (type === 'distance') {
      const px = calculatePixelDistance(pts);
      onMeasurementsChange([
        ...measurements,
        {
          id: generateId(),
          type: 'distance',
          points: pts,
          pixelLength: px,
          realLength: calibration ? pixelsToReal(px, calibration) : null,
          unit: calibration?.unit ?? null,
          label: `D${measurements.length + 1}`,
          color,
        },
      ]);
    } else {
      const px = calculatePixelArea(pts);
      onMeasurementsChange([
        ...measurements,
        {
          id: generateId(),
          type: 'area',
          points: pts,
          pixelArea: px,
          realArea: calibration ? pixelAreaToReal(px, calibration) : null,
          unit: calibration?.unit ?? null,
          label: `A${measurements.length + 1}`,
          color,
        },
      ]);
    }
    setDrawState({ isDrawing: false, points: [], calibrationPoints: [] });
  };

  // ── Measurement hit test ─────────────────────────────────────────────────────

  const findMeasurementAt = (pt: Point): Measurement | null => {
    const thr = 15 / transform.scale;
    for (let i = measurements.length - 1; i >= 0; i--) {
      const m = measurements[i];
      if (m.type === 'distance') {
        for (let j = 1; j < m.points.length; j++)
          if (distToSegment(pt, m.points[j - 1], m.points[j]) < thr) return m;
      } else {
        if (pointInPolygon(pt, m.points)) return m;
        for (let j = 0; j < m.points.length; j++) {
          const next = m.points[(j + 1) % m.points.length];
          if (distToSegment(pt, m.points[j], next) < thr) return m;
        }
      }
    }
    return null;
  };

  // ── Cursor ───────────────────────────────────────────────────────────────────

  const getCursor = () => {
    if (itemDragRef.current || measurementDragRef.current) return 'grabbing';
    if (isPanRef.current) return 'grabbing';
    if (activeTool === 'pan') return 'grab';
    if (activeTool === 'select') {
      const hoverM = findMeasurementAt(mousePos);
      const hoverItem = hitTestItems(mousePos);
      if (hoverM || hoverItem) return 'grab';
      return 'default';
    }
    if (activeTool === 'delete') return 'not-allowed';
    if (activeTool === 'crop') {
      if (cropState) {
        const h = hitTestCropHandle(mousePos, cropState, transform.scale);
        if (h === 'tl' || h === 'br') return 'nwse-resize';
        if (h === 'tr' || h === 'bl') return 'nesw-resize';
        if (h === 't' || h === 'b') return 'ns-resize';
        if (h === 'l' || h === 'r') return 'ew-resize';
      }
      return 'crosshair';
    }
    return 'crosshair';
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const showCropConfirm = !!cropState;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: getCursor(), touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Crop confirm bar */}
      {showCropConfirm && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 text-white rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-sm z-10">
          <span className="text-xs font-medium mr-1">Recorte listo</span>
          <button
            onClick={applyCrop}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl px-3 py-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Aplicar
          </button>
          <button
            onClick={cancelCrop}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl px-3 py-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
          <span className="text-white/40 text-xs ml-1">Enter / Esc</span>
        </div>
      )}

      {/* Drawing instructions */}
      {drawState.isDrawing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs rounded-xl px-4 py-2 pointer-events-none backdrop-blur-sm">
          {activeTool === 'distance' && <>Clic para añadir punto · <strong>Doble clic</strong> o <strong>Enter</strong> para finalizar · Esc para cancelar</>}
          {activeTool === 'area' && <>Clic para añadir vértice · <strong>Doble clic</strong> o <strong>Enter</strong> para cerrar · Esc para cancelar</>}
          {activeTool === 'calibrate' && drawState.calibrationPoints.length === 1 && <>Clic en el segundo punto de referencia</>}
        </div>
      )}

      {/* Crop instructions */}
      {activeTool === 'crop' && !cropState && !drawState.isDrawing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs rounded-xl px-4 py-2 pointer-events-none backdrop-blur-sm">
          Haz clic sobre una imagen para recortarla
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {[
          { label: '+', action: () => setTransform((p) => ({ ...p, scale: Math.min(p.scale * 1.25, 30) })) },
          { label: '−', action: () => setTransform((p) => ({ ...p, scale: Math.max(p.scale / 1.25, 0.01) })) },
          { label: '⊡', action: fitAll, title: 'Ajustar todo' },
        ].map((b) => (
          <button
            key={b.label}
            onClick={b.action}
            title={b.title}
            className="w-8 h-8 bg-white rounded-lg shadow border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold text-base"
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 right-3 bg-white/90 rounded-lg px-2 py-1 text-xs text-gray-500 shadow border border-gray-100">
        {Math.round(transform.scale * 100)}%
      </div>
    </div>
  );
});

export default MeasurementCanvas;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, transform: { scale: number; offsetX: number; offsetY: number }) {
  const gridUnit = 100;
  const gsize = gridUnit * transform.scale;
  if (gsize < 10) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  const startX = ((transform.offsetX % gsize) + gsize) % gsize;
  const startY = ((transform.offsetY % gsize) + gsize) % gsize;
  for (let x = startX; x < w; x += gsize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = startY; y < h; y += gsize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
}

function drawMeasurement(ctx: CanvasRenderingContext2D, m: Measurement, isSelected: boolean, scale: number) {
  const pts = m.points;
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = m.color;
  ctx.lineWidth = (isSelected ? 3 : 2) / scale;
  ctx.setLineDash(isSelected ? [8 / scale, 4 / scale] : []);

  if (m.type === 'distance') {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2); ctx.fillStyle = m.color; ctx.fill(); });
    const mid = midpoint(pts[0], pts[pts.length - 1]);
    const label = m.realLength !== null && m.unit ? formatLength(m.realLength, m.unit) : `${m.pixelLength.toFixed(0)}px`;
    drawLabel(ctx, `${label} (${m.label})`, mid.x, mid.y, m.color, scale);
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = m.color + '28';
    ctx.fill();
    ctx.stroke();
    pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2); ctx.fillStyle = m.color; ctx.fill(); });
    const c = centroid(pts);
    const label = m.realArea !== null && m.unit ? formatArea(m.realArea, m.unit) : `${m.pixelArea.toFixed(0)}px²`;
    drawLabel(ctx, `${label} (${m.label})`, c.x, c.y, m.color, scale);
  }
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale: number) {
  const fs = 12 / scale;
  ctx.font = `bold ${fs}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const px = 5 / scale, py = 3 / scale;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2 - px, y - fs / 2 - py, tw + px * 2, fs + py * 2, 3 / scale);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawInProgressLine(ctx: CanvasRenderingContext2D, pts: Point[], mouse: Point, scale: number, calibration: CalibrationData | null) {
  ctx.save();
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([6 / scale, 3 / scale]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.stroke();
  pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2); ctx.fillStyle = '#3B82F6'; ctx.fill(); });
  // Live distance label near the cursor
  const pxDist = calculatePixelDistance([...pts, mouse]);
  const label = calibration ? formatLength(pixelsToReal(pxDist, calibration), calibration.unit) : `${pxDist.toFixed(0)} px`;
  const lastPt = pts[pts.length - 1];
  const mid = midpoint(lastPt, mouse);
  drawLabel(ctx, label, mid.x, mid.y, '#3B82F6', scale);
  ctx.restore();
}

function drawInProgressPolygon(ctx: CanvasRenderingContext2D, pts: Point[], mouse: Point, scale: number, calibration: CalibrationData | null) {
  ctx.save();
  ctx.strokeStyle = '#10B981';
  ctx.fillStyle = '#10B98118';
  ctx.lineWidth = 2 / scale;
  ctx.setLineDash([6 / scale, 3 / scale]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4 / scale, 0, Math.PI * 2); ctx.fillStyle = '#10B981'; ctx.fill(); });
  // Live area label at polygon centroid (needs ≥2 placed points to form a triangle with mouse)
  if (pts.length >= 2) {
    const allPts = [...pts, mouse];
    const pxArea = calculatePixelArea(allPts);
    const label = calibration ? formatArea(pixelAreaToReal(pxArea, calibration), calibration.unit) : `${pxArea.toFixed(0)} px²`;
    const c = centroid(allPts);
    drawLabel(ctx, label, c.x, c.y, '#10B981', scale);
  }
  ctx.restore();
}

function drawCalibrationLine(ctx: CanvasRenderingContext2D, pts: Point[], mouse: Point, scale: number) {
  const end = pts.length > 1 ? pts[1] : mouse;
  ctx.save();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.5 / scale;
  ctx.setLineDash([8 / scale, 4 / scale]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  [pts[0], end].forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2); ctx.fillStyle = '#F59E0B'; ctx.fill(); });
  const mid = midpoint(pts[0], end);
  drawLabel(ctx, `${calculatePixelDistance([pts[0], end]).toFixed(0)}px`, mid.x, mid.y, '#F59E0B', scale);
  ctx.restore();
}

// ─── Geometry utils ───────────────────────────────────────────────────────────

function midpoint(a: Point, b: Point): Point { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function centroid(pts: Point[]): Point { return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length }; }

function initCropState(item: CanvasItem): CropState {
  const fullLeft = item.x - item.crop.x * item.scale;
  const fullTop = item.y - item.crop.y * item.scale;
  return {
    itemId: item.id,
    left: item.x,
    top: item.y,
    right: item.x + item.crop.width * item.scale,
    bottom: item.y + item.crop.height * item.scale,
    fullLeft,
    fullTop,
    fullRight: fullLeft + item.naturalWidth * item.scale,
    fullBottom: fullTop + item.naturalHeight * item.scale,
    activeHandle: null,
    dragStartPt: null,
    dragStartEdges: null,
  };
}

function hitTestCropHandle(pt: Point, cs: CropState, viewScale: number, hitPx = 12): CropHandle | null {
  const r = hitPx / viewScale;
  const mx = (cs.left + cs.right) / 2;
  const my = (cs.top + cs.bottom) / 2;
  const candidates: [CropHandle, number, number][] = [
    ['tl', cs.left, cs.top], ['tr', cs.right, cs.top],
    ['bl', cs.left, cs.bottom], ['br', cs.right, cs.bottom],
    ['t', mx, cs.top], ['b', mx, cs.bottom],
    ['l', cs.left, my], ['r', cs.right, my],
  ];
  for (const [key, hx, hy] of candidates) {
    if (Math.hypot(pt.x - hx, pt.y - hy) < r) return key;
  }
  return null;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function pointInPolygon(pt: Point, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
