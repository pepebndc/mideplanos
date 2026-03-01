'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import { Tool, Measurement, CalibrationData, CanvasItem, Project, SaveStatus } from '@/types';
import { renderPdfPageToDataUrl } from '@/utils/pdfUtils';
import { pixelsToReal, pixelAreaToReal, generateId } from '@/utils/measurements';
import { saveProject, listProjects, readFileAsDataURL } from '@/utils/storage';
import FileUpload from '@/components/FileUpload';
import Header from '@/components/Header';
import Toolbar from '@/components/Toolbar';
import MeasurementCanvas, { MeasurementCanvasRef } from '@/components/MeasurementCanvas';
import MeasurementsList from '@/components/MeasurementsList';
import ImageLayersPanel from '@/components/ImageLayersPanel';
import CalibrationDialog from '@/components/CalibrationDialog';
import ProjectsModal from '@/components/ProjectsModal';
import LeaveEditorModal from '@/components/LeaveEditorModal';
import Attribution from '@/components/Attribution';

type PdfRef = { file: File; page: number; totalPages: number };

export default function Home() {
  const router = useRouter();

  // ── Canvas state ────────────────────────────────────────────────────────────
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [pendingCalibration, setPendingCalibration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Mobile panel state ──────────────────────────────────────────────────────
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // ── Project state ───────────────────────────────────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Sin título');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingProjectName, setPendingProjectName] = useState('');

  const canvasRef = useRef<MeasurementCanvasRef>(null);
  const pdfRefs = useRef<Map<string, PdfRef>>(new Map());
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const panelDragStartY = useRef<number | null>(null);

  const handlePanelDragStart = useCallback((e: React.TouchEvent) => {
    panelDragStartY.current = e.touches[0].clientY;
    if (mobilePanelRef.current) mobilePanelRef.current.style.transition = 'none';
  }, []);

  const handlePanelDragMove = useCallback((e: React.TouchEvent) => {
    if (panelDragStartY.current === null) return;
    const dy = Math.max(0, e.touches[0].clientY - panelDragStartY.current);
    if (mobilePanelRef.current) mobilePanelRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const handlePanelDragEnd = useCallback((e: React.TouchEvent) => {
    if (panelDragStartY.current === null) return;
    const dy = Math.max(0, e.changedTouches[0].clientY - panelDragStartY.current);
    panelDragStartY.current = null;
    if (mobilePanelRef.current) {
      mobilePanelRef.current.style.transition = 'transform 300ms ease-out';
      mobilePanelRef.current.style.transform = '';
      if (dy > 80) setShowMobilePanel(false);
    }
  }, []);
  // Always-fresh ref so setTimeout callbacks never see stale closure values
  const liveRef = useRef({ canvasItems, measurements, calibration, currentProjectId, currentProjectName });
  liveRef.current = { canvasItems, measurements, calibration, currentProjectId, currentProjectName };

  // ── Undo history ────────────────────────────────────────────────────────────
  type HistoryEntry = { measurements: Measurement[]; canvasItems: CanvasItem[]; calibration: CalibrationData | null };
  const historyRef = useRef<HistoryEntry[]>([]);
  const MAX_HISTORY = 50;

  const pushToHistory = useCallback(() => {
    const { measurements: m, canvasItems: ci, calibration: cal } = liveRef.current;
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), { measurements: m, canvasItems: ci, calibration: cal }];
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setMeasurements(prev.measurements);
    setCanvasItems(prev.canvasItems);
    setCalibration(prev.calibration);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      const map: Record<string, Tool> = { s: 'select', h: 'pan', c: 'calibrate', d: 'distance', a: 'area', r: 'crop' };
      if (map[e.key.toLowerCase()]) setActiveTool(map[e.key.toLowerCase() as keyof typeof map]);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMeasurementId) {
        pushToHistory();
        setMeasurements((prev) => prev.filter((m) => m.id !== selectedMeasurementId));
        setSelectedMeasurementId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedMeasurementId, undo, pushToHistory]);

  // ── Core save function (reads from liveRef — never stale) ───────────────────
  const executeSave = useCallback(async () => {
    const { canvasItems: items, measurements: meas, calibration: cal, currentProjectId: pid, currentProjectName: pname } = liveRef.current;
    if (items.length === 0) return;

    // Auto-assign an ID/name if the project has never been saved
    let id = pid;
    let name = pname;
    if (!id) {
      id = generateId();
      name = items[0]?.name.replace(/\.[^.]+$/, '') || 'Mi plano';
      setCurrentProjectId(id);
      setCurrentProjectName(name);
    }

    setSaveStatus('saving');
    try {
      const thumbnail = canvasRef.current?.getThumbnail() ?? '';
      const existing = (await listProjects()).find((p) => p.id === id);
      await saveProject({
        id,
        name,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        thumbnail,
        canvasItems: items,
        measurements: meas,
        calibration: cal,
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('unsaved');
    }
  }, []);

  // ── Auto-save — fires 2 s after any change, always, from the first file ─────
  useEffect(() => {
    if (canvasItems.length === 0) return;
    setSaveStatus('unsaved');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(executeSave, 300);
    return () => clearTimeout(autoSaveTimer.current);
  }, [canvasItems, measurements, calibration, executeSave]);

  // ── Manual save (force-immediate) ──────────────────────────────────────────
  const handleSave = useCallback(async () => {
    clearTimeout(autoSaveTimer.current);
    await executeSave();
  }, [executeSave]);

  const confirmSaveName = useCallback(async () => {
    const name = pendingProjectName.trim() || 'Mi plano';
    const id = currentProjectId ?? generateId();
    setCurrentProjectId(id);
    setCurrentProjectName(name);
    setShowNameDialog(false);
    // Update liveRef immediately before saving
    liveRef.current = { ...liveRef.current, currentProjectId: id, currentProjectName: name };
    await executeSave();
  }, [pendingProjectName, currentProjectId, executeSave]);

  // ── Load project ────────────────────────────────────────────────────────────
  const handleLoadProject = useCallback((project: Project) => {
    historyRef.current = [];
    setCanvasItems(project.canvasItems);
    setMeasurements(project.measurements);
    setCalibration(project.calibration);
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setSaveStatus('saved');
    setSelectedItemId(null);
    setSelectedMeasurementId(null);
    setActiveTool('select');
    pdfRefs.current.clear(); // PDF refs are lost on load (we store rendered frames)
    setTimeout(() => canvasRef.current?.fitAll(), 80);
  }, []);

  // ── File loading ────────────────────────────────────────────────────────────
  const makeCanvasItem = useCallback(
    (imageUrl: string, naturalWidth: number, naturalHeight: number, name: string, extra?: Partial<CanvasItem>): CanvasItem => ({
      id: generateId(),
      name,
      imageUrl,
      naturalWidth,
      naturalHeight,
      x: canvasItems.length * 40,
      y: canvasItems.length * 40,
      scale: 1,
      crop: { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
      zIndex: canvasItems.length,
      ...extra,
    }),
    [canvasItems.length]
  );

  const loadFile = useCallback(
    async (file: File, addToExisting: boolean) => {
      setIsLoading(true);
      try {
        if (file.type === 'application/pdf') {
          const { dataUrl, width, height, totalPages } = await renderPdfPageToDataUrl(file, 1);
          const item = makeCanvasItem(dataUrl, width, height, file.name, { pdfPage: 1, pdfTotalPages: totalPages });
          pdfRefs.current.set(item.id, { file, page: 1, totalPages });
          if (addToExisting) {
            setCanvasItems((prev) => [...prev, item]);
          } else {
            const newId = generateId();
            const newName = file.name.replace(/\.[^.]+$/, '');
            setCanvasItems([item]);
            setMeasurements([]);
            setCalibration(null);
            setCurrentProjectId(newId);
            setCurrentProjectName(newName);
            setSaveStatus('idle');
          }
        } else {
          // Use FileReader (dataURL) so the URL is serialisable for storage
          const dataUrl = await readFileAsDataURL(file);
          await new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              const item = makeCanvasItem(dataUrl, img.naturalWidth, img.naturalHeight, file.name);
              if (addToExisting) {
                setCanvasItems((prev) => [...prev, item]);
              } else {
                const newId = generateId();
                const newName = file.name.replace(/\.[^.]+$/, '');
                setCanvasItems([item]);
                setMeasurements([]);
                setCalibration(null);
                setCurrentProjectId(newId);
                setCurrentProjectName(newName);
                setSaveStatus('idle');
              }
              resolve();
            };
            img.src = dataUrl;
          });
        }
        setActiveTool('select');
        setTimeout(() => canvasRef.current?.fitAll(), 80);
      } catch (err) {
        alert('Error al cargar el archivo. Comprueba que sea una imagen o PDF válido.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [makeCanvasItem]
  );

  const handleFirstFile = useCallback((file: File) => loadFile(file, false), [loadFile]);
  const handleAddFile = useCallback((file: File) => loadFile(file, true), [loadFile]);

  // ── PDF page navigation ─────────────────────────────────────────────────────
  const handlePageChange = useCallback(async (itemId: string, page: number) => {
    const ref = pdfRefs.current.get(itemId);
    if (!ref) return;
    setIsLoading(true);
    try {
      const { dataUrl, width, height } = await renderPdfPageToDataUrl(ref.file, page);
      pdfRefs.current.set(itemId, { ...ref, page });
      setCanvasItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, imageUrl: dataUrl, naturalWidth: width, naturalHeight: height, pdfPage: page, crop: { x: 0, y: 0, width, height } }
            : item
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Canvas items management ─────────────────────────────────────────────────
  const handleDeleteItem = useCallback((id: string) => {
    pushToHistory();
    setCanvasItems((prev) => prev.filter((i) => i.id !== id));
    pdfRefs.current.delete(id);
    if (selectedItemId === id) setSelectedItemId(null);
  }, [selectedItemId, pushToHistory]);

  const handleRenameItem = useCallback((id: string, name: string) => {
    setCanvasItems((prev) => prev.map((i) => i.id === id ? { ...i, name } : i));
  }, []);

  const handleReorderItem = useCallback((id: string, direction: 'up' | 'down') => {
    pushToHistory();
    setCanvasItems((prev) => {
      const sorted = [...prev].sort((a, b) => b.zIndex - a.zIndex);
      const idx = sorted.findIndex((i) => i.id === id);
      if (direction === 'up' && idx > 0) {
        const a = sorted[idx], b = sorted[idx - 1];
        return prev.map((i) => i.id === a.id ? { ...i, zIndex: b.zIndex } : i.id === b.id ? { ...i, zIndex: a.zIndex } : i);
      }
      if (direction === 'down' && idx < sorted.length - 1) {
        const a = sorted[idx], b = sorted[idx + 1];
        return prev.map((i) => i.id === a.id ? { ...i, zIndex: b.zIndex } : i.id === b.id ? { ...i, zIndex: a.zIndex } : i);
      }
      return prev;
    });
  }, [pushToHistory]);

  const handleResetCrop = useCallback((id: string) => {
    pushToHistory();
    setCanvasItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, crop: { x: 0, y: 0, width: item.naturalWidth, height: item.naturalHeight } }
          : item
      )
    );
  }, [pushToHistory]);

  const handleActivateCrop = useCallback((id: string) => {
    setActiveTool('crop');
    setSelectedItemId(id);
  }, []);

  // ── Calibration ─────────────────────────────────────────────────────────────
  const handleCalibrationDrawn = useCallback((px: number) => {
    setPendingCalibration(px);
    setActiveTool('select');
  }, []);

  const handleCalibrationConfirm = useCallback((cal: CalibrationData) => {
    pushToHistory();
    setCalibration(cal);
    setPendingCalibration(null);
    setMeasurements((prev) =>
      prev.map((m) =>
        m.type === 'distance'
          ? { ...m, realLength: pixelsToReal(m.pixelLength, cal), unit: cal.unit }
          : { ...m, realArea: pixelAreaToReal(m.pixelArea, cal), unit: cal.unit }
      )
    );
  }, [pushToHistory]);

  // ── Measurements ────────────────────────────────────────────────────────────
  const handleDeleteMeasurement = useCallback((id: string) => {
    pushToHistory();
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    setSelectedMeasurementId((prev) => (prev === id ? null : prev));
  }, [pushToHistory]);

  const handleRenameMeasurement = useCallback((id: string, label: string) => {
    setMeasurements((prev) => prev.map((m) => (m.id === id ? { ...m, label } : m)));
  }, []);

  const handleRecolorMeasurement = useCallback((id: string, color: string) => {
    setMeasurements((prev) => prev.map((m) => (m.id === id ? { ...m, color } : m)));
  }, []);

  const handleNewProject = useCallback(() => {
    historyRef.current = [];
    setShowProjectsModal(false);
    setCanvasItems([]);
    setMeasurements([]);
    setCalibration(null);
    setCurrentProjectId(null);
    setCurrentProjectName('Sin título');
    setSaveStatus('idle');
    setSelectedItemId(null);
    setSelectedMeasurementId(null);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedItem = canvasItems.find((i) => i.id === selectedItemId) ?? null;

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (canvasItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading && <LoadingOverlay />}
        <FileUpload
          onFileLoaded={handleFirstFile}
          onLoadProject={(p) => { handleLoadProject(p); }}
          onOpenProjects={() => setShowProjectsModal(true)}
        />
        {showProjectsModal && (
          <ProjectsModal
            currentProjectId={currentProjectId}
            onLoadProject={(p) => { handleLoadProject(p); setShowProjectsModal(false); }}
            onNewProject={handleNewProject}
            onClose={() => setShowProjectsModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-gray-50">
      <Header
        canvasItems={canvasItems}
        selectedItem={selectedItem}
        calibration={calibration}
        projectName={currentProjectName}
        saveStatus={saveStatus}
        onNewFile={handleNewProject}
        onAddFile={handleAddFile}
        onSave={handleSave}
        onOpenProjects={() => setShowProjectsModal(true)}
        onRenameProject={(name) => { setCurrentProjectName(name); liveRef.current = { ...liveRef.current, currentProjectName: name }; }}
        onPageChange={handlePageChange}
        onLogoClick={() => {
          if (canvasItems.length > 0) {
            setShowLeaveModal(true);
          } else {
            router.push('/');
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {/* Left toolbar — desktop only */}
        <div className="hidden md:block">
          <Toolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            hasCalibration={!!calibration}
            onRecalibrate={() => setActiveTool('calibrate')}
            variant="vertical"
          />
        </div>

        <div className="flex-1 relative overflow-hidden min-w-0">
          {isLoading && <LoadingOverlay />}
          <MeasurementCanvas
            ref={canvasRef}
            canvasItems={canvasItems}
            activeTool={activeTool}
            calibration={calibration}
            measurements={measurements}
            selectedMeasurementId={selectedMeasurementId}
            selectedItemId={selectedItemId}
            onMeasurementsChange={(m) => { pushToHistory(); setMeasurements(m); }}
            onCalibrationDrawn={handleCalibrationDrawn}
            onSelectMeasurement={setSelectedMeasurementId}
            onSelectItem={setSelectedItemId}
            onItemsChange={(items) => { pushToHistory(); setCanvasItems(items); }}
          />
        </div>

        {/* Right aside — desktop only */}
        <aside className="hidden md:flex w-64 flex-col overflow-hidden shrink-0" style={{ backgroundColor: '#F1EFEA', borderLeft: '1px solid #C8C4BB' }}>
          <ImageLayersPanel
            items={canvasItems}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onDeleteItem={handleDeleteItem}
            onReorderItem={handleReorderItem}
            onResetCrop={handleResetCrop}
            onActivateCrop={handleActivateCrop}
            onRenameItem={handleRenameItem}
          />
          <MeasurementsList
            measurements={measurements}
            calibration={calibration}
            selectedId={selectedMeasurementId}
            onSelectMeasurement={setSelectedMeasurementId}
            onDeleteMeasurement={handleDeleteMeasurement}
            onRenameMeasurement={handleRenameMeasurement}
            onRecolorMeasurement={handleRecolorMeasurement}
          />
          <div className="shrink-0" style={{ borderTop: '1px solid #C8C4BB' }}>
            <Attribution className="px-4 py-3" />
          </div>
        </aside>

        {/* Mobile panel backdrop */}
        {showMobilePanel && (
          <div
            className="md:hidden absolute inset-0 z-30 bg-black/25"
            onClick={() => setShowMobilePanel(false)}
          />
        )}

        {/* Mobile panel — bottom sheet */}
        <div
          ref={mobilePanelRef}
          className={`md:hidden absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${showMobilePanel ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'}`}
          style={{ maxHeight: '65vh', backgroundColor: '#F1EFEA' }}
        >
          {/* Drag handle — touch to dismiss */}
          <div
            className="flex justify-center items-center py-3 shrink-0 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handlePanelDragStart}
            onTouchMove={handlePanelDragMove}
            onTouchEnd={handlePanelDragEnd}
          >
            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#C8C4BB' }} />
          </div>
          {/* Sheet header */}
          <div
            className="flex items-center px-4 py-2 shrink-0"
            style={{ borderBottom: '1px solid #C8C4BB' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9A9590' }}>
              Capas y Medidas
            </span>
          </div>
          {/* Sheet content */}
          <div className="flex-1 overflow-y-auto">
            <ImageLayersPanel
              items={canvasItems}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onDeleteItem={handleDeleteItem}
              onReorderItem={handleReorderItem}
              onResetCrop={handleResetCrop}
              onActivateCrop={handleActivateCrop}
              onRenameItem={handleRenameItem}
            />
            <MeasurementsList
              measurements={measurements}
              calibration={calibration}
              selectedId={selectedMeasurementId}
              onSelectMeasurement={setSelectedMeasurementId}
              onDeleteMeasurement={handleDeleteMeasurement}
              onRenameMeasurement={handleRenameMeasurement}
              onRecolorMeasurement={handleRecolorMeasurement}
            />
          </div>
          {/* Footer: calibration status + attribution */}
          <div className="shrink-0 px-4 py-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid #C8C4BB', backgroundColor: '#F1EFEA' }}>
            <p className="text-[10px] font-medium" style={{ color: calibration ? '#1A2C3D' : '#9A9590' }}>
              {calibration
                ? `✓ Calibrado · ${calibration.pixelsPerUnit.toFixed(1)} px/${calibration.unit}`
                : '— Sin calibración · medidas en píxeles'}
            </p>
            <Attribution />
          </div>
        </div>
      </div>

      {/* Mobile bottom toolbar — visible only on mobile */}
      <div
        className="md:hidden flex items-center border-t border-gray-100 shrink-0"
        style={{ backgroundColor: 'white' }}
      >
        <Toolbar
          activeTool={activeTool}
          onToolChange={(tool) => { setActiveTool(tool); setShowMobilePanel(false); }}
          hasCalibration={!!calibration}
          onRecalibrate={() => { setActiveTool('calibrate'); setShowMobilePanel(false); }}
          variant="horizontal"
        />
        <div className="flex-1" />
        {/* Panel toggle button */}
        <button
          onClick={() => setShowMobilePanel((v) => !v)}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl mx-2 transition-colors shrink-0"
          style={{
            color: showMobilePanel ? '#1A2C3D' : '#9A9590',
            backgroundColor: showMobilePanel ? 'rgba(26,44,61,0.08)' : 'transparent',
          }}
          title="Capas y medidas"
          aria-label="Capas y medidas"
        >
          <Layers className="w-5 h-5" />
          {measurements.length > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5"
              style={{ backgroundColor: '#1A2C3D' }}
            >
              {measurements.length}
            </span>
          )}
        </button>
      </div>

      {/* Calibration dialog */}
      {pendingCalibration !== null && (
        <CalibrationDialog
          pixelLength={pendingCalibration}
          onConfirm={handleCalibrationConfirm}
          onCancel={() => setPendingCalibration(null)}
        />
      )}

      {/* Save name dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Guardar proyecto</h2>
            <p className="text-sm text-gray-500 mb-4">Dale un nombre a este proyecto para identificarlo fácilmente.</p>
            <input
              type="text"
              value={pendingProjectName}
              onChange={(e) => setPendingProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSaveName(); if (e.key === 'Escape') setShowNameDialog(false); }}
              placeholder="Nombre del proyecto…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNameDialog(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSaveName}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects modal */}
      {showProjectsModal && (
        <ProjectsModal
          currentProjectId={currentProjectId}
          onLoadProject={(p) => { handleLoadProject(p); setShowProjectsModal(false); }}
          onNewProject={handleNewProject}
          onClose={() => setShowProjectsModal(false)}
        />
      )}

      {/* Leave editor confirmation modal */}
      {showLeaveModal && (
        <LeaveEditorModal
          saveStatus={saveStatus}
          onConfirm={() => router.push('/')}
          onCancel={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/75 backdrop-blur-sm">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500 font-medium">Cargando…</p>
      </div>
    </div>
  );
}
