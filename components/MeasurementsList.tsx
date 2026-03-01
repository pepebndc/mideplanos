'use client';

import { useState, useRef } from 'react';
import { Measurement, CalibrationData } from '@/types';
import { formatLength, formatArea } from '@/utils/measurements';
import { Ruler, Square, Trash2, Edit2, Check, X, Download, Eye, EyeOff } from 'lucide-react';
import { MEASUREMENT_COLORS } from '@/utils/measurements';

interface MeasurementsListProps {
  measurements: Measurement[];
  calibration: CalibrationData | null;
  selectedId: string | null;
  onSelectMeasurement: (id: string | null) => void;
  onDeleteMeasurement: (id: string) => void;
  onRenameMeasurement: (id: string, label: string) => void;
  onRecolorMeasurement: (id: string, color: string) => void;
  onToggleVisibility?: (id: string) => void;
}

export default function MeasurementsList({
  measurements,
  calibration,
  selectedId,
  onSelectMeasurement,
  onDeleteMeasurement,
  onRenameMeasurement,
  onRecolorMeasurement,
  onToggleVisibility,
}: MeasurementsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const cancellingRef = useRef(false);

  const startEdit = (m: Measurement) => {
    setEditingId(m.id);
    setEditValue(m.label);
  };

  const confirmEdit = (id: string) => {
    if (cancellingRef.current) { cancellingRef.current = false; return; }
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
    <div className="flex flex-col" style={{ backgroundColor: '#F1EFEA' }}>
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-3 shrink-0"
        style={{ borderBottom: '1px solid #C8C4BB', backgroundColor: '#F1EFEA' }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#9A9590' }}
        >
          Medidas
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: '#C8C4BB' }} />
        {measurements.length > 0 && (
          <button
            onClick={exportCSV}
            title="Exportar CSV"
            className="flex items-center gap-1 text-[10px] font-medium transition-colors"
            style={{ color: '#9A9590' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9A9590')}
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        )}
      </div>

      {/* Stats summary */}
      {measurements.length > 0 && (
        <div
          className="px-4 py-2 flex items-center gap-4 shrink-0"
          style={{ borderBottom: '1px solid #E4E2DC' }}
        >
          <div className="flex items-center gap-1.5">
            <Ruler className="w-3 h-3" style={{ color: '#9A9590' }} />
            <span className="text-xs font-semibold" style={{ color: '#1A2C3D' }}>
              {totalDistances.length}
            </span>
            <span className="text-[10px]" style={{ color: '#9A9590' }}>
              dist.
            </span>
          </div>
          <div className="w-px h-3" style={{ backgroundColor: '#C8C4BB' }} />
          <div className="flex items-center gap-1.5">
            <Square className="w-3 h-3" style={{ color: '#9A9590' }} />
            <span className="text-xs font-semibold" style={{ color: '#1A2C3D' }}>
              {totalAreas.length}
            </span>
            <span className="text-[10px]" style={{ color: '#9A9590' }}>
              áreas
            </span>
          </div>
        </div>
      )}

      {/* List */}
      <div>
        {measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <DimensionIcon size={28} color="#C8C4BB" />
            <p className="text-xs font-medium mt-3" style={{ color: '#7A8A99' }}>
              Sin medidas aún
            </p>
            <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#B5B0A3' }}>
              Usa las herramientas de la barra lateral para empezar a medir
            </p>
          </div>
        ) : (
          <ul>
            {measurements.map((m) => {
              const isSelected = m.id === selectedId;
              const isEditing = m.id === editingId;

              return (
                <li
                  key={m.id}
                  onClick={() => onSelectMeasurement(isSelected ? null : m.id)}
                  className="cursor-pointer transition-colors px-3 py-2.5"
                  style={{
                    borderLeft: isSelected ? '2px solid #1A2C3D' : '2px solid transparent',
                    backgroundColor: isSelected ? 'rgba(26,44,61,0.06)' : 'transparent',
                    borderBottom: '1px solid #E4E2DC',
                    opacity: m.visible === false ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(26,44,61,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex items-start gap-2">
                    {/* Color dot + icon */}
                    <div
                      className="w-7 h-7 flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: m.color + '18',
                        border: `1px solid ${m.color}30`,
                        borderRadius: '2px',
                      }}
                    >
                      {m.type === 'distance' ? (
                        <Ruler className="w-3.5 h-3.5" style={{ color: m.color }} />
                      ) : (
                        <Square className="w-3.5 h-3.5" style={{ color: m.color }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Label row */}
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <div className="w-full" onClick={(e) => e.stopPropagation()}>
                            {/* Name input row */}
                            <div className="flex items-center gap-1">
                              <input
                                className="flex-1 text-xs px-1.5 py-0.5 focus:outline-none"
                                style={{
                                  border: '1px solid #1A2C3D',
                                  borderRadius: '2px',
                                  backgroundColor: '#fff',
                                  color: '#1A2C3D',
                                }}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => confirmEdit(m.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') { cancellingRef.current = true; setEditingId(null); }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => confirmEdit(m.id)}
                                className="transition-colors"
                                style={{ color: '#9A9590' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#9A9590')}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="transition-colors"
                                style={{ color: '#B5B0A3' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#B5B0A3')}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Color swatches */}
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {MEASUREMENT_COLORS.map((c) => (
                                <button
                                  key={c}
                                  title={c}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => onRecolorMeasurement(m.id, c)}
                                  className="w-4 h-4 transition-transform hover:scale-125"
                                  style={{
                                    backgroundColor: c,
                                    borderRadius: '2px',
                                    border: m.color === c ? '2px solid #1A2C3D' : '1.5px solid transparent',
                                    outline: m.color === c ? '1px solid #fff' : 'none',
                                    outlineOffset: '-3px',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-semibold truncate" style={{ color: '#1A2C3D' }}>
                              {m.label}
                            </span>
                            <span className="text-[10px]" style={{ color: '#B5B0A3' }}>
                              {m.type === 'distance' ? '· dist.' : '· área'}
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
                        <p className="text-[10px] mt-0.5" style={{ color: '#B5B0A3' }}>
                          Sin calibrar
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {onToggleVisibility && (
                          <button
                            onClick={() => onToggleVisibility(m.id)}
                            title={m.visible === false ? 'Mostrar en plano' : 'Ocultar en plano'}
                            className="w-6 h-6 flex items-center justify-center transition-colors"
                            style={{
                              color: m.visible === false ? '#9A9590' : '#B5B0A3',
                              borderRadius: '2px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = m.visible === false ? '#9A9590' : '#B5B0A3')}
                          >
                            {m.visible === false ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(m)}
                          title="Renombrar"
                          className="w-6 h-6 flex items-center justify-center transition-colors"
                          style={{ color: '#B5B0A3', borderRadius: '2px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#B5B0A3')}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteMeasurement(m.id)}
                          title="Eliminar"
                          className="w-6 h-6 flex items-center justify-center transition-colors"
                          style={{ color: '#B5B0A3', borderRadius: '2px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#C0392B')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#B5B0A3')}
                        >
                          <Trash2 className="w-3 h-3" />
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

    </div>
  );
}

function DimensionIcon({ size = 24, color = '#1A2C3D' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <line x1="2" y1="11" x2="30" y2="11" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="2" y1="6.5" x2="2" y2="15.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="6.5" x2="30" y2="15.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="22" x2="19" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="2" y1="17.5" x2="2" y2="26.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="19" y1="17.5" x2="19" y2="26.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}
