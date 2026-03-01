'use client';

import { useState } from 'react';
import { CalibrationData, Unit, PendingCalibration } from '@/types';
import { UNIT_LABELS } from '@/utils/measurements';
import { X, Ruler, Square } from 'lucide-react';

interface CalibrationDialogProps {
  pending: PendingCalibration;
  onConfirm: (calibration: CalibrationData) => void;
  onCancel: () => void;
}

export default function CalibrationDialog({ pending, onConfirm, onCancel }: CalibrationDialogProps) {
  const [unit, setUnit] = useState<Unit>('m');
  const [realLength, setRealLength] = useState('');
  const [realArea, setRealArea] = useState('');

  const isLine = pending.type === 'line';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLine) {
      const value = parseFloat(realLength);
      if (isNaN(value) || value <= 0) {
        alert('Por favor, introduce una medida real válida mayor que 0.');
        return;
      }
      const pixelsPerUnit = pending.pixelLength / value;
      onConfirm({
        pixelLength: pending.pixelLength,
        realLength: value,
        unit,
        pixelsPerUnit,
      });
    } else {
      const value = parseFloat(realArea);
      if (isNaN(value) || value <= 0) {
        alert('Por favor, introduce un área real válida mayor que 0.');
        return;
      }
      const pixelsPerUnit = Math.sqrt(pending.pixelArea / value);
      const pixelLength = Math.sqrt(pending.pixelArea);
      const realLengthVal = Math.sqrt(value);
      onConfirm({
        pixelLength,
        realLength: realLengthVal,
        unit,
        pixelsPerUnit,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLine ? <Ruler className="w-5 h-5 text-white" /> : <Square className="w-5 h-5 text-white" />}
            <h2 className="text-white font-bold text-lg">
              {isLine ? 'Calibración por línea' : 'Calibración por área'}
            </h2>
          </div>
          <button onClick={onCancel} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Pixel info */}
          <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-100">
            {isLine ? (
              <>
                <p className="text-sm text-amber-800 font-medium">Línea de referencia dibujada</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{pending.pixelLength.toFixed(0)} px</p>
                <p className="text-xs text-amber-600 mt-1">
                  Indica la medida real que corresponde a esta línea en el plano.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-800 font-medium">Área de referencia seleccionada</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{pending.pixelArea.toFixed(0)} px²</p>
                <p className="text-xs text-amber-600 mt-1">
                  Indica el área real que corresponde a esta habitación o zona en el plano (en {unit === 'm' ? 'm²' : unit === 'cm' ? 'cm²' : unit === 'mm' ? 'mm²' : unit === 'ft' ? 'ft²' : 'in²'}).
                </p>
              </>
            )}
          </div>

          <div className="space-y-4">
            {/* Unit selector first so area hint can use it */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Unidad de medida
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(UNIT_LABELS) as Unit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                      unit === u
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-amber-300'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{UNIT_LABELS[unit]}</p>
            </div>

            {isLine ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Medida real de la referencia
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={realLength}
                  onChange={(e) => setRealLength(e.target.value)}
                  placeholder="Ej: 5.00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  autoFocus
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Área real de la referencia ({unit}²)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={realArea}
                  onChange={(e) => setRealArea(e.target.value)}
                  placeholder="Ej: 15.50"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  autoFocus
                  required
                />
              </div>
            )}

            {/* Preview */}
            {isLine && realLength && !isNaN(parseFloat(realLength)) && parseFloat(realLength) > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Vista previa de escala</p>
                <p className="text-sm text-blue-900 mt-0.5">
                  1 {unit} = <strong>{(pending.pixelLength / parseFloat(realLength)).toFixed(1)} px</strong>
                </p>
              </div>
            )}
            {!isLine && realArea && !isNaN(parseFloat(realArea)) && parseFloat(realArea) > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Vista previa de escala</p>
                <p className="text-sm text-blue-900 mt-0.5">
                  1 {unit} = <strong>{Math.sqrt(pending.pixelArea / parseFloat(realArea)).toFixed(1)} px</strong>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 font-semibold transition-colors"
            >
              Aplicar calibración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
