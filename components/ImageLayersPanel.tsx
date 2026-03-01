'use client';

import { useState } from 'react';
import { CanvasItem } from '@/types';
import { Trash2, ChevronUp, ChevronDown, Crop, RotateCcw, Edit2, Check, X } from 'lucide-react';

interface ImageLayersPanelProps {
  items: CanvasItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onDeleteItem: (id: string) => void;
  onReorderItem: (id: string, direction: 'up' | 'down') => void;
  onResetCrop: (id: string) => void;
  onActivateCrop: (id: string) => void;
  onRenameItem: (id: string, name: string) => void;
}

export default function ImageLayersPanel({
  items,
  selectedItemId,
  onSelectItem,
  onDeleteItem,
  onReorderItem,
  onResetCrop,
  onActivateCrop,
  onRenameItem,
}: ImageLayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const sorted = [...items].sort((a, b) => b.zIndex - a.zIndex);

  const isCropped = (item: CanvasItem) =>
    item.crop.x > 0 || item.crop.y > 0 ||
    item.crop.width < item.naturalWidth ||
    item.crop.height < item.naturalHeight;

  const startEdit = (item: CanvasItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const confirmEdit = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) onRenameItem(id, trimmed);
    setEditingId(null);
  };

  if (items.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid #C8C4BB' }}>
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-3"
        style={{ borderBottom: '1px solid #C8C4BB', backgroundColor: '#F1EFEA' }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#9A9590' }}
        >
          Imágenes
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: '#C8C4BB' }} />
        <span className="text-[10px] font-medium" style={{ color: '#B5B0A3' }}>
          {items.length}
        </span>
      </div>

      {/* Item list */}
      <ul style={{ backgroundColor: '#F1EFEA' }}>
        {sorted.map((item, idx) => {
          const isSelected = item.id === selectedItemId;
          const isEditing = item.id === editingId;
          const cropped = isCropped(item);
          const displayW = Math.round(item.crop.width * item.scale);
          const displayH = Math.round(item.crop.height * item.scale);

          return (
            <li
              key={item.id}
              onClick={() => { if (!isEditing) onSelectItem(isSelected ? null : item.id); }}
              className="transition-colors flex items-center gap-2 px-3 py-2"
              style={{
                cursor: isEditing ? 'default' : 'pointer',
                borderLeft: isSelected ? '2px solid #1A2C3D' : '2px solid transparent',
                backgroundColor: isSelected ? 'rgba(26,44,61,0.06)' : 'transparent',
                borderBottom: '1px solid #E4E2DC',
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(26,44,61,0.03)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? 'rgba(26,44,61,0.06)' : 'transparent';
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-9 h-9 shrink-0 overflow-hidden"
                style={{
                  border: '1px solid #C8C4BB',
                  borderRadius: '2px',
                  backgroundColor: '#E4E2DC',
                  position: 'relative',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  style={cropped ? {
                    objectPosition: `${-(item.crop.x / item.naturalWidth) * 100}% ${-(item.crop.y / item.naturalHeight) * 100}%`,
                    width: `${(item.naturalWidth / item.crop.width) * 100}%`,
                    height: `${(item.naturalHeight / item.crop.height) * 100}%`,
                  } : {}}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <input
                    className="w-full text-xs font-semibold bg-transparent border-b outline-none"
                    style={{ color: '#1A2C3D', borderColor: '#1A2C3D' }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => confirmEdit(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-xs font-semibold truncate hover:underline underline-offset-2 decoration-dashed cursor-text"
                    style={{ color: '#1A2C3D' }}
                    onClick={() => startEdit(item)}
                    title="Haz clic para renombrar"
                  >
                    {item.name}
                  </p>
                )}
                <p className="text-[10px] mt-0.5" style={{ color: '#9A9590' }}>
                  {displayW} × {displayH} px
                  {cropped && <span style={{ color: '#7A8A99' }}> · recortado</span>}
                  {item.pdfPage && <span> · pág {item.pdfPage}</span>}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <>
                    <PanelButton onClick={() => confirmEdit(item.id)} title="Confirmar nombre">
                      <Check className="w-3 h-3" />
                    </PanelButton>
                    <PanelButton onClick={() => setEditingId(null)} title="Cancelar">
                      <X className="w-3 h-3" />
                    </PanelButton>
                  </>
                ) : (
                  <>
                    <PanelButton onClick={() => startEdit(item)} title="Renombrar">
                      <Edit2 className="w-3 h-3" />
                    </PanelButton>
                    {cropped && (
                      <PanelButton onClick={() => onResetCrop(item.id)} title="Restablecer recorte">
                        <RotateCcw className="w-3 h-3" />
                      </PanelButton>
                    )}
                    <PanelButton onClick={() => onActivateCrop(item.id)} title="Recortar">
                      <Crop className="w-3 h-3" />
                    </PanelButton>
                    <PanelButton onClick={() => onReorderItem(item.id, 'up')} title="Subir capa" disabled={idx === 0}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </PanelButton>
                    <PanelButton onClick={() => onReorderItem(item.id, 'down')} title="Bajar capa" disabled={idx === sorted.length - 1}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </PanelButton>
                    <PanelButton onClick={() => onDeleteItem(item.id)} title="Eliminar imagen" danger>
                      <Trash2 className="w-3 h-3" />
                    </PanelButton>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PanelButton({
  onClick,
  title,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-6 h-6 flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ color: '#B5B0A3', borderRadius: '2px' }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.color = danger ? '#C0392B' : '#1A2C3D';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = '#B5B0A3';
      }}
    >
      {children}
    </button>
  );
}
