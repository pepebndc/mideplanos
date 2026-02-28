'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

type PdfRef = { file: File; page: number; totalPages: number };

export default function Home() {
  // ── Canvas state ────────────────────────────────────────────────────────────
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [pendingCalibration, setPendingCalibration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Project state ───────────────────────────────────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Sin título');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingProjectName, setPendingProjectName] = useState('');

  const canvasRef = useRef<MeasurementCanvasRef>(null);
  const pdfRefs = useRef<Map<string, PdfRef>>(new Map());
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Always-fresh ref so setTimeout callbacks never see stale closure values
  const liveRef = useRef({ canvasItems, measurements, calibration, currentProjectId, currentProjectName });
  liveRef.current = { canvasItems, measurements, calibration, currentProjectId, currentProjectName };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const map: Record<string, Tool> = { s: 'select', c: 'calibrate', d: 'distance', a: 'area', r: 'crop' };
      if (map[e.key.toLowerCase()]) setActiveTool(map[e.key.toLowerCase() as keyof typeof map]);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMeasurementId) {
        setMeasurements((prev) => prev.filter((m) => m.id !== selectedMeasurementId));
        setSelectedMeasurementId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedMeasurementId]);

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
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2500);
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
    autoSaveTimer.current = setTimeout(executeSave, 2000);
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
    setCanvasItems(project.canvasItems);
    setMeasurements(project.measurements);
    setCalibration(project.calibration);
    setCurrentProjectId(project.id);
    setCurrentProjectName(project.name);
    setSaveStatus('idle');
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
    setCanvasItems((prev) => prev.filter((i) => i.id !== id));
    pdfRefs.current.delete(id);
    if (selectedItemId === id) setSelectedItemId(null);
  }, [selectedItemId]);

  const handleReorderItem = useCallback((id: string, direction: 'up' | 'down') => {
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
  }, []);

  const handleResetCrop = useCallback((id: string) => {
    setCanvasItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, crop: { x: 0, y: 0, width: item.naturalWidth, height: item.naturalHeight } }
          : item
      )
    );
  }, []);

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
    setCalibration(cal);
    setPendingCalibration(null);
    setMeasurements((prev) =>
      prev.map((m) =>
        m.type === 'distance'
          ? { ...m, realLength: pixelsToReal(m.pixelLength, cal), unit: cal.unit }
          : { ...m, realArea: pixelAreaToReal(m.pixelArea, cal), unit: cal.unit }
      )
    );
  }, []);

  // ── Measurements ────────────────────────────────────────────────────────────
  const handleDeleteMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    setSelectedMeasurementId((prev) => (prev === id ? null : prev));
  }, []);

  const handleRenameMeasurement = useCallback((id: string, label: string) => {
    setMeasurements((prev) => prev.map((m) => (m.id === id ? { ...m, label } : m)));
  }, []);

  const handleNewProject = useCallback(() => {
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
      <div className="h-screen flex flex-col">
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
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
        onPageChange={handlePageChange}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          hasCalibration={!!calibration}
          onRecalibrate={() => setActiveTool('calibrate')}
        />

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
            onMeasurementsChange={setMeasurements}
            onCalibrationDrawn={handleCalibrationDrawn}
            onSelectMeasurement={setSelectedMeasurementId}
            onSelectItem={setSelectedItemId}
            onItemsChange={setCanvasItems}
          />
        </div>

        <aside className="w-64 bg-white border-l border-gray-100 flex flex-col overflow-hidden shrink-0">
          <ImageLayersPanel
            items={canvasItems}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onDeleteItem={handleDeleteItem}
            onReorderItem={handleReorderItem}
            onResetCrop={handleResetCrop}
            onActivateCrop={handleActivateCrop}
          />
          <MeasurementsList
            measurements={measurements}
            calibration={calibration}
            selectedId={selectedMeasurementId}
            onSelectMeasurement={setSelectedMeasurementId}
            onDeleteMeasurement={handleDeleteMeasurement}
            onRenameMeasurement={handleRenameMeasurement}
          />
        </aside>
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
