'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool, Point, Rect, Measurement, CalibrationData, CanvasItem } from '@/types';
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

interface CropState {
  itemId: string;
  startPt: Point | null;
  rect: Rect | null;
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

  const isPanRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const itemDragRef = useRef<{
    itemId: string;
    screenStart: Point;
    origX: number;
    origY: number;
  } | null>(null);
  const cropDrawingRef = useRef(false);

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

      // Crop overlay
      if (cropState?.itemId === item.id) {
        ctx.save();
        if (cropState.rect && cropState.rect.width > 4 && cropState.rect.height > 4) {
          const { x: rx, y: ry, width: rw, height: rh } = cropState.rect;
          // Dimmed area (evenodd hole)
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.rect(ix, iy, dw, dh);
          ctx.rect(rx, ry, rw, rh);
          ctx.fill('evenodd');
          // Crop border
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5 / scale;
          ctx.setLineDash([6 / scale, 3 / scale]);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.setLineDash([]);
          // Corner circles
          [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]].forEach(([hx, hy]) => {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(hx, hy, 4 / scale, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          // Just a hint border (item selected in crop mode)
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2 / scale;
          ctx.setLineDash([8 / scale, 4 / scale]);
          ctx.strokeRect(ix, iy, dw, dh);
          ctx.setLineDash([]);
          // Instruction label
          const fontSize = 13 / scale;
          const txt = 'Arrastra para recortar';
          ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const tw = ctx.measureText(txt).width;
          const px = 6 / scale, py = 4 / scale;
          ctx.fillStyle = 'rgba(245,158,11,0.9)';
          ctx.beginPath();
          ctx.roundRect(ix + dw / 2 - tw / 2 - px, iy + dh / 2 - fontSize / 2 - py, tw + px * 2, fontSize + py * 2, 4 / scale);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(txt, ix + dw / 2, iy + dh / 2);
        }
        ctx.restore();
      }
    });

    // Measurements
    measurements.forEach((m) => drawMeasurement(ctx, m, m.id === selectedMeasurementId, scale));

    // In-progress drawing
    if (drawState.isDrawing) {
      if (activeTool === 'calibrate' && drawState.calibrationPoints.length > 0) {
        drawCalibrationLine(ctx, drawState.calibrationPoints, mousePos, scale);
      } else if (activeTool === 'distance' && drawState.points.length > 0) {
        drawInProgressLine(ctx, drawState.points, mousePos, scale);
      } else if (activeTool === 'area' && drawState.points.length > 0) {
        drawInProgressPolygon(ctx, drawState.points, mousePos, scale);
      }
    }

    ctx.restore();
  }, [transform, drawState, measurements, selectedMeasurementId, selectedItemId, mousePos, activeTool, canvasItems, cropState, draggedItem]);

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

    // Middle mouse = always pan
    if (e.button === 1) {
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
        // Check measurement selection
        const mHit = findMeasurementAt(vpt);
        if (mHit) {
          onSelectMeasurement(mHit.id);
          onSelectItem(null);
        } else {
          onSelectItem(null);
          onSelectMeasurement(null);
          isPanRef.current = true;
          panStartRef.current = { x: screenPt.x, y: screenPt.y, ox: transform.offsetX, oy: transform.offsetY };
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
      const hit = hitTestItems(vpt);
      if (hit) {
        const isAlreadySelected = cropState?.itemId === hit.id;
        if (isAlreadySelected) {
          // Start drawing crop rect
          const clamped = clampToItem(vpt, hit);
          setCropState({ itemId: hit.id, startPt: clamped, rect: null });
          cropDrawingRef.current = true;
        } else {
          // Select item for cropping
          setCropState({ itemId: hit.id, startPt: null, rect: null });
          onSelectItem(hit.id);
        }
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
        const pts = [drawState.calibrationPoints[0], vpt];
        onCalibrationDrawn(calculatePixelDistance(pts));
        setDrawState({ isDrawing: false, points: [], calibrationPoints: [] });
      }
      return;
    }

    // ── Distance ─────────────────────────────────────────────────────────────
    if (activeTool === 'distance') {
      if (!drawState.isDrawing) {
        setDrawState({ isDrawing: true, points: [vpt], calibrationPoints: [] });
      } else {
        setDrawState((p) => ({ ...p, points: [...p.points, vpt] }));
      }
      return;
    }

    // ── Area ─────────────────────────────────────────────────────────────────
    if (activeTool === 'area') {
      if (!drawState.isDrawing) {
        setDrawState({ isDrawing: true, points: [vpt], calibrationPoints: [] });
      } else {
        setDrawState((p) => ({ ...p, points: [...p.points, vpt] }));
      }
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const screenPt = getScreenPos(e);
    const vpt = canvasToVirtual(screenPt.x, screenPt.y);
    setMousePos(vpt);

    // Canvas pan
    if (isPanRef.current && panStartRef.current) {
      setTransform((prev) => ({
        ...prev,
        offsetX: panStartRef.current!.ox + screenPt.x - panStartRef.current!.x,
        offsetY: panStartRef.current!.oy + screenPt.y - panStartRef.current!.y,
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

    // Crop drawing
    if (cropDrawingRef.current && cropState?.startPt && cropState.itemId) {
      const item = canvasItems.find((i) => i.id === cropState.itemId);
      if (item) {
        const clamped = clampToItem(vpt, item);
        const rect = normalizeRectPts(cropState.startPt, clamped);
        setCropState((p) => p ? { ...p, rect } : null);
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

    // End crop drawing
    if (cropDrawingRef.current) {
      cropDrawingRef.current = false;
    }

    if (e.button === 1) {
      isPanRef.current = false;
      panStartRef.current = null;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const screenPt = getScreenPos(e);
    const vpt = canvasToVirtual(screenPt.x, screenPt.y);

    if (activeTool === 'distance' && drawState.isDrawing && drawState.points.length >= 2) {
      finalizeMeasurement('distance', drawState.points);
      return;
    }
    if (activeTool === 'area' && drawState.isDrawing && drawState.points.length >= 3) {
      finalizeMeasurement('area', drawState.points);
      return;
    }
    // Crop: double click on same item starts drawing (if already selected)
    if (activeTool === 'crop' && cropState) {
      const item = canvasItems.find((i) => i.id === cropState.itemId);
      if (item) {
        const clamped = clampToItem(vpt, item);
        setCropState({ itemId: item.id, startPt: clamped, rect: null });
        cropDrawingRef.current = true;
      }
    }
  };

  // ── Apply / cancel crop ──────────────────────────────────────────────────────

  const applyCrop = useCallback(() => {
    if (!cropState?.rect) return;
    const item = canvasItems.find((i) => i.id === cropState.itemId);
    if (!item) return;
    const { x: rx, y: ry, width: rw, height: rh } = cropState.rect;
    // Convert from virtual canvas coords → natural image coords
    const newCropX = item.crop.x + (rx - item.x) / item.scale;
    const newCropY = item.crop.y + (ry - item.y) / item.scale;
    const newCropW = rw / item.scale;
    const newCropH = rh / item.scale;
    onItemsChange(
      canvasItems.map((i) =>
        i.id === item.id
          ? {
              ...i,
              x: rx,
              y: ry,
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
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
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
        cropDrawingRef.current = false;
      }
      if ((e.key === 'Enter') && drawState.isDrawing) {
        if (activeTool === 'distance' && drawState.points.length >= 2)
          finalizeMeasurement('distance', drawState.points);
        else if (activeTool === 'area' && drawState.points.length >= 3)
          finalizeMeasurement('area', drawState.points);
      }
      if (e.key === 'Enter' && cropState?.rect) {
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
    if (itemDragRef.current) return 'grabbing';
    if (isPanRef.current) return 'grabbing';
    if (activeTool === 'select') return 'grab';
    if (activeTool === 'delete') return 'not-allowed';
    if (activeTool === 'crop') return cropDrawingRef.current ? 'crosshair' : 'default';
    return 'crosshair';
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const showCropConfirm = !!(cropState?.rect && cropState.rect.width > 10 && cropState.rect.height > 10);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: getCursor() }}
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
      {activeTool === 'crop' && cropState && !showCropConfirm && !drawState.isDrawing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs rounded-xl px-4 py-2 pointer-events-none backdrop-blur-sm">
          {cropState.startPt ? <>Arrastrando recorte…</> : <>Haz clic y arrastra sobre la imagen para definir el recorte</>}
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

function drawInProgressLine(ctx: CanvasRenderingContext2D, pts: Point[], mouse: Point, scale: number) {
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
  ctx.restore();
}

function drawInProgressPolygon(ctx: CanvasRenderingContext2D, pts: Point[], mouse: Point, scale: number) {
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

function clampToItem(pt: Point, item: CanvasItem): Point {
  const dw = item.crop.width * item.scale;
  const dh = item.crop.height * item.scale;
  return { x: Math.max(item.x, Math.min(item.x + dw, pt.x)), y: Math.max(item.y, Math.min(item.y + dh, pt.y)) };
}

function normalizeRectPts(p1: Point, p2: Point): Rect {
  return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p2.x - p1.x), height: Math.abs(p2.y - p1.y) };
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
