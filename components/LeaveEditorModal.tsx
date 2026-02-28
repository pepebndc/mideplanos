'use client';

import { SaveStatus } from '@/types';
import { ArrowLeft, CheckCircle2, Loader2, X } from 'lucide-react';

interface LeaveEditorModalProps {
  saveStatus: SaveStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LeaveEditorModal({ saveStatus, onConfirm, onCancel }: LeaveEditorModalProps) {
  const isSaved = saveStatus === 'saved' || saveStatus === 'idle';
  const isSaving = saveStatus === 'saving';
  const isUnsaved = saveStatus === 'unsaved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#1A2C3D' }}>
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-lg">Salir del editor</h2>
          </div>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Save status */}
          <div
            className="rounded-xl p-4 mb-5 border"
            style={{
              backgroundColor: isUnsaved
                ? 'rgba(180,140,40,0.06)'
                : isSaved
                ? 'rgba(34,197,94,0.06)'
                : 'rgba(26,44,61,0.04)',
              borderColor: isUnsaved
                ? 'rgba(180,140,40,0.25)'
                : isSaved
                ? 'rgba(34,197,94,0.25)'
                : '#E5E3DF',
            }}
          >
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#1A2C3D' }} />}
              {isSaved && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#16a34a' }} />}
              {isUnsaved && (
                <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: '#B87F14' }} />
              )}
              <p
                className="text-sm font-semibold"
                style={{ color: isUnsaved ? '#8B6914' : isSaved ? '#15803d' : '#1A2C3D' }}
              >
                {isSaving ? 'Guardando…' : isSaved ? 'Proyecto guardado' : 'Cambios sin guardar'}
              </p>
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#7A7670' }}>
              {isSaving
                ? 'Espera un momento mientras se guardan los cambios.'
                : isSaved
                ? 'Tu proyecto está al día. Puedes salir sin perder nada.'
                : 'Si sales ahora, los últimos cambios no se guardarán.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl py-2.5 font-semibold transition-colors text-sm text-white"
              style={{ backgroundColor: '#1A2C3D' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#243d52'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1A2C3D'; }}
            >
              Ir a inicio
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
