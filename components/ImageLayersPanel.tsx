'use client';

import { CanvasItem } from '@/types';
import { Trash2, ChevronUp, ChevronDown, Crop, RotateCcw, Layers } from 'lucide-react';

interface ImageLayersPanelProps {
  items: CanvasItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onDeleteItem: (id: string) => void;
  onReorderItem: (id: string, direction: 'up' | 'down') => void;
  onResetCrop: (id: string) => void;
  onActivateCrop: (id: string) => void;
}

export default function ImageLayersPanel({
  items,
  selectedItemId,
  onSelectItem,
  onDeleteItem,
  onReorderItem,
  onResetCrop,
  onActivateCrop,
}: ImageLayersPanelProps) {
  const sorted = [...items].sort((a, b) => b.zIndex - a.zIndex);

  const isCropped = (item: CanvasItem) =>
    item.crop.x > 0 || item.crop.y > 0 ||
    item.crop.width < item.naturalWidth ||
    item.crop.height < item.naturalHeight;

  if (items.length === 0) return null;

  return (
    <div className="border-b border-gray-100">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2 bg-gray-50 border-b border-gray-100">
        <Layers className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Imágenes</span>
        <span className="ml-auto text-xs text-gray-400 font-medium">{items.length}</span>
      </div>

      {/* Item list */}
      <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
        {sorted.map((item, idx) => {
          const isSelected = item.id === selectedItemId;
          const cropped = isCropped(item);
          const displayW = Math.round(item.crop.width * item.scale);
          const displayH = Math.round(item.crop.height * item.scale);

          return (
            <li
              key={item.id}
              onClick={() => onSelectItem(isSelected ? null : item.id)}
              className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50 border-l-2 border-transparent'
              }`}
            >
              {/* Thumbnail preview */}
              <div
                className="w-10 h-10 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200"
                style={{ position: 'relative' }}
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
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {displayW} × {displayH} px
                  {cropped && <span className="ml-1 text-purple-500 font-medium">· recortado</span>}
                  {item.pdfPage && <span className="ml-1">· pág {item.pdfPage}</span>}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {cropped && (
                  <button
                    onClick={() => onResetCrop(item.id)}
                    title="Restablecer recorte"
                    className="w-6 h-6 flex items-center justify-center text-purple-400 hover:text-purple-600 rounded hover:bg-purple-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onActivateCrop(item.id)}
                  title="Recortar"
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50"
                >
                  <Crop className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onReorderItem(item.id, 'up')}
                  disabled={idx === 0}
                  title="Subir capa"
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onReorderItem(item.id, 'down')}
                  disabled={idx === sorted.length - 1}
                  title="Bajar capa"
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  title="Eliminar imagen"
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
