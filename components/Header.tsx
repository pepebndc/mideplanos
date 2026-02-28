'use client';

import { useRef, useState, useEffect } from 'react';
import { CalibrationData, CanvasItem, SaveStatus } from '@/types';
import { FolderOpen, Plus, ChevronLeft, ChevronRight, CloudUpload, CloudCheck, Loader2, Folder } from 'lucide-react';

interface HeaderProps {
  canvasItems: CanvasItem[];
  selectedItem: CanvasItem | null;
  calibration: CalibrationData | null;
  projectName: string;
  saveStatus: SaveStatus;
  onNewFile: () => void;
  onAddFile: (file: File) => void;
  onSave: () => void;
  onOpenProjects: () => void;
  onPageChange?: (itemId: string, page: number) => void;
}

export default function Header({
  canvasItems,
  selectedItem,
  calibration,
  projectName,
  saveStatus,
  onNewFile,
  onAddFile,
  onSave,
  onOpenProjects,
  onPageChange,
}: HeaderProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  // Track previous status to trigger the pop animation on transition
  const [animate, setAnimate] = useState(false);
  const prevStatus = useRef<SaveStatus>(saveStatus);

  useEffect(() => {
    if (prevStatus.current !== saveStatus) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 300);
      prevStatus.current = saveStatus;
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onAddFile(file); e.target.value = ''; }
  };

  const isSaved = saveStatus === 'saved' || saveStatus === 'idle';
  const isSaving = saveStatus === 'saving';
  const isUnsaved = saveStatus === 'unsaved';

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shadow-sm z-10 shrink-0">

      {/* Brand */}
      <div className="flex items-center gap-2 mr-1 shrink-0">
        {/* Dimension-line mark */}
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
          <line x1="2" y1="11" x2="30" y2="11" stroke="#1A2C3D" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="2" y1="6.5" x2="2" y2="15.5" stroke="#1A2C3D" strokeWidth="3" strokeLinecap="round" />
          <line x1="30" y1="6.5" x2="30" y2="15.5" stroke="#1A2C3D" strokeWidth="3" strokeLinecap="round" />
          <line x1="2" y1="22" x2="19" y2="22" stroke="#1A2C3D" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.35" />
          <line x1="2" y1="17.5" x2="2" y2="26.5" stroke="#1A2C3D" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" />
          <line x1="19" y1="17.5" x2="19" y2="26.5" stroke="#1A2C3D" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.35" />
        </svg>
        <span className="font-bold text-gray-900 text-sm tracking-tight" style={{ letterSpacing: '-0.02em' }}>mideplanos</span>
      </div>

      <div className="h-5 w-px bg-gray-200 shrink-0" />

      {/* Project name + inline save-status */}
      {canvasItems.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
            {projectName}
          </span>

          {/* Save-status pill */}
          <span
            className={`
              inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0
              transition-all duration-200
              ${animate ? 'scale-110' : 'scale-100'}
              ${isSaved ? 'text-green-600 bg-green-50' : isSaving ? 'text-blue-500 bg-blue-50' : isUnsaved ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50'}
            `}
          >
            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
            {isSaved && <CloudCheck className="w-3 h-3" />}
            {isUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
            {isSaving && 'Guardando…'}
            {isSaved && 'Guardado'}
            {isUnsaved && 'Sin guardar'}
          </span>
        </div>
      )}

      {/* PDF page navigation */}
      {selectedItem?.pdfTotalPages && selectedItem.pdfTotalPages > 1 && onPageChange && (
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 border border-gray-200 shrink-0">
          <button
            disabled={(selectedItem.pdfPage ?? 1) <= 1}
            onClick={() => onPageChange(selectedItem.id, (selectedItem.pdfPage ?? 1) - 1)}
            className="w-6 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 min-w-[56px] text-center">
            {selectedItem.pdfPage ?? 1} / {selectedItem.pdfTotalPages}
          </span>
          <button
            disabled={(selectedItem.pdfPage ?? 1) >= selectedItem.pdfTotalPages}
            onClick={() => onPageChange(selectedItem.id, (selectedItem.pdfPage ?? 1) + 1)}
            className="w-6 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calibration badge */}
      {calibration && canvasItems.length > 0 && (
        <span className="text-xs bg-green-50 text-green-700 rounded-full px-2.5 py-0.5 font-medium border border-green-100 shrink-0">
          1 {calibration.unit} = {calibration.pixelsPerUnit.toFixed(1)} px
        </span>
      )}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">

        {canvasItems.length > 0 && (
          <>
            {/* Save button — icon morphs with status */}
            <button
              onClick={onSave}
              disabled={isSaving || isSaved}
              title={isSaved ? 'Guardado' : isSaving ? 'Guardando…' : 'Guardar proyecto (Ctrl+S)'}
              className={`
                relative flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5
                border transition-all duration-200
                ${isSaved
                  ? 'text-green-600 bg-green-50 border-green-100 cursor-default'
                  : isSaving
                  ? 'text-blue-400 bg-blue-50 border-blue-100 cursor-default'
                  : 'text-white bg-blue-600 hover:bg-blue-700 border-blue-600 active:scale-95'
                }
              `}
            >
              <span className={`transition-transform duration-200 ${animate ? 'scale-125' : 'scale-100'}`}>
                {isSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isSaved
                  ? <CloudCheck className="w-4 h-4" />
                  : <CloudUpload className="w-4 h-4" />
                }
              </span>
              <span>
                {isSaving ? 'Guardando…' : isSaved ? 'Guardado' : 'Guardar'}
              </span>
            </button>

            {/* Add image */}
            <button
              onClick={() => addInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors border border-gray-200"
            >
              <Plus className="w-4 h-4" />
              Añadir
            </button>
            <input
              ref={addInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf"
              onChange={handleAddChange}
              className="hidden"
            />
          </>
        )}

        {/* Projects history */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors border border-gray-200"
        >
          <Folder className="w-4 h-4" />
          Proyectos
        </button>

        {/* New / open */}
        <button
          onClick={onNewFile}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors border border-gray-200"
        >
          <FolderOpen className="w-4 h-4" />
          Nuevo
        </button>
      </div>
    </header>
  );
}
