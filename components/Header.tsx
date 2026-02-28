'use client';

import { useRef } from 'react';
import { CalibrationData, CanvasItem, SaveStatus } from '@/types';
import { FolderOpen, Plus, ChevronLeft, ChevronRight, Save, FolderOpen as Projects, Check, Loader2 } from 'lucide-react';

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

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: 'Guardar',
  unsaved: 'Guardar',
  saving: 'Guardando…',
  saved: 'Guardado',
};

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

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onAddFile(file); e.target.value = ''; }
  };

  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shadow-sm z-10 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-sm tracking-tight">mideplanos</span>
      </div>

      <div className="h-5 w-px bg-gray-200 shrink-0" />

      {/* Project name + save status */}
      {canvasItems.length > 0 && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{projectName}</span>
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium shrink-0">
              <Check className="w-3 h-3" /> guardado
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" /> guardando…
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Cambios sin guardar" />
          )}
        </div>
      )}

      {/* PDF page navigation for selected item */}
      {selectedItem?.pdfTotalPages && selectedItem.pdfTotalPages > 1 && onPageChange && (
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 border border-gray-200">
          <button
            disabled={(selectedItem.pdfPage ?? 1) <= 1}
            onClick={() => onPageChange(selectedItem.id, (selectedItem.pdfPage ?? 1) - 1)}
            className="w-6 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 min-w-[60px] text-center">
            Pág {selectedItem.pdfPage ?? 1} / {selectedItem.pdfTotalPages}
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

      {/* Actions — right side */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {canvasItems.length > 0 && (
          <>
            {/* Save */}
            <button
              onClick={onSave}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors border ${
                saveStatus === 'saved'
                  ? 'text-green-600 bg-green-50 border-green-100 cursor-default'
                  : saveStatus === 'saving'
                  ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-default'
                  : 'text-white bg-blue-600 hover:bg-blue-700 border-blue-600'
              }`}
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {SAVE_LABEL[saveStatus]}
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

        {/* Projects */}
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors border border-gray-200"
        >
          <Projects className="w-4 h-4" />
          Proyectos
        </button>

        {/* New canvas */}
        <button
          onClick={onNewFile}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors border border-gray-200"
        >
          <FolderOpen className="w-4 h-4" />
          {canvasItems.length > 0 ? 'Nuevo' : 'Abrir'}
        </button>
      </div>
    </header>
  );
}
