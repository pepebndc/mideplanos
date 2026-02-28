'use client';

import { useState } from 'react';
import { Measurement, CalibrationData } from '@/types';
import { formatLength, formatArea } from '@/utils/measurements';
import { Ruler, Square, Trash2, Edit2, Check, X, Download } from 'lucide-react';

interface MeasurementsListProps {
  measurements: Measurement[];
  calibration: CalibrationData | null;
  selectedId: string | null;
  onSelectMeasurement: (id: string | null) => void;
  onDeleteMeasurement: (id: string) => void;
  onRenameMeasurement: (id: string, label: string) => void;
}

export default function MeasurementsList({
  measurements,
  calibration,
  selectedId,
  onSelectMeasurement,
  onDeleteMeasurement,
  onRenameMeasurement,
}: MeasurementsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (m: Measurement) => {
    setEditingId(m.id);
    setEditValue(m.label);
  };

  const confirmEdit = (id: string) => {
    if (editValue.trim()) onRenameMeasurement(id, editValue.trim());
    setEditingId(null);
  };

  const totalDistances = measurements.filter((m) => m.type === 'distance');
  const totalAreas = measurements.filter((m) => m.type === 'area');

  const exportCSV = () => {
    const rows = [['Tipo', 'Nombre', 'Medida', 'Unidad', 'Píxeles']];
    measurements.forEach((m) => {
      if (m.type === 'distance') {
        rows.push([
          'Distancia',
          m.label,
          m.realLength !== null ? m.realLength.toFixed(4) : '',
          m.unit || 'px',
          m.pixelLength.toFixed(2),
        ]);
      } else {
        rows.push([
          'Área',
          m.label,
          m.realArea !== null ? m.realArea.toFixed(4) : '',
          m.unit ? `${m.unit}²` : 'px²',
          m.pixelArea.toFixed(2),
        ]);
      }
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mideplanos-medidas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-sm">Medidas</h2>
        {measurements.length > 0 && (
          <button
            onClick={exportCSV}
            title="Exportar CSV"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        )}
      </div>

      {/* Stats summary */}
      {measurements.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-xs text-blue-500 font-medium">Distancias</p>
            <p className="text-lg font-bold text-blue-700">{totalDistances.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-xs text-green-500 font-medium">Áreas</p>
            <p className="text-lg font-bold text-green-700">{totalAreas.length}</p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Ruler className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Sin medidas aún</p>
            <p className="text-xs text-gray-400 mt-1">
              Usa las herramientas de la barra lateral para empezar a medir
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {measurements.map((m) => {
              const isSelected = m.id === selectedId;
              const isEditing = m.id === editingId;

              return (
                <li
                  key={m.id}
                  onClick={() => onSelectMeasurement(isSelected ? null : m.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Color + icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: m.color + '20' }}
                    >
                      {m.type === 'distance' ? (
                        <Ruler className="w-4 h-4" style={{ color: m.color }} />
                      ) : (
                        <Square className="w-4 h-4" style={{ color: m.color }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Label row */}
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="flex-1 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEdit(m.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => confirmEdit(m.id)} className="text-green-600 hover:text-green-800">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-gray-700 truncate">{m.label}</span>
                            <span className="text-xs text-gray-400">
                              {m.type === 'distance' ? '· Dist.' : '· Área'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Value */}
                      {!isEditing && (
                        <p className="text-sm font-bold mt-0.5" style={{ color: m.color }}>
                          {m.type === 'distance'
                            ? m.realLength !== null && m.unit
                              ? formatLength(m.realLength, m.unit)
                              : `${m.pixelLength.toFixed(0)} px`
                            : m.realArea !== null && m.unit
                            ? formatArea(m.realArea, m.unit)
                            : `${(m as any).pixelArea.toFixed(0)} px²`}
                        </p>
                      )}

                      {/* No calibration notice */}
                      {!calibration && !isEditing && (
                        <p className="text-xs text-amber-500 mt-0.5">Sin calibrar</p>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => startEdit(m)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                          title="Renombrar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMeasurement(m.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Calibration status */}
      <div className={`px-4 py-2.5 border-t text-xs font-medium ${
        calibration ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'
      }`}>
        {calibration
          ? `✓ Calibrado: ${calibration.pixelsPerUnit.toFixed(1)} px/${calibration.unit}`
          : '⚠ Sin calibración — medidas en píxeles'}
      </div>
    </div>
  );
}
