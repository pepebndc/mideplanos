'use client';

import { Tool } from '@/types';
import { MousePointer2, Hand, Ruler, Square, Crosshair, Trash2, Crop } from 'lucide-react';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  hasCalibration: boolean;
  variant?: 'vertical' | 'horizontal';
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string; activeClass: string }[] = [
  { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Seleccionar / Mover', shortcut: 'S', activeClass: 'bg-gray-100 text-gray-700' },
  { id: 'pan', icon: <Hand className="w-5 h-5" />, label: 'Mover vista', shortcut: 'H', activeClass: 'bg-sky-100 text-sky-600' },
  { id: 'calibrate', icon: <Crosshair className="w-5 h-5" />, label: 'Calibrar escala', shortcut: 'C', activeClass: 'bg-amber-100 text-amber-600' },
  { id: 'distance', icon: <Ruler className="w-5 h-5" />, label: 'Medir distancia', shortcut: 'D', activeClass: 'bg-blue-100 text-blue-600' },
  { id: 'area', icon: <Square className="w-5 h-5" />, label: 'Medir área', shortcut: 'A', activeClass: 'bg-green-100 text-green-600' },
  { id: 'crop', icon: <Crop className="w-5 h-5" />, label: 'Recortar imagen', shortcut: 'R', activeClass: 'bg-purple-100 text-purple-600' },
  { id: 'delete', icon: <Trash2 className="w-5 h-5" />, label: 'Eliminar medida', shortcut: 'Del', activeClass: 'bg-red-100 text-red-500' },
];

export default function Toolbar({ activeTool, onToolChange, hasCalibration, variant = 'vertical' }: ToolbarProps) {
  const isHorizontal = variant === 'horizontal';
  const tooltipPos = isHorizontal
    ? 'bottom-14 left-1/2 -translate-x-1/2'
    : 'left-14 top-1/2 -translate-y-1/2';

  return (
    <div className={`flex items-center select-none ${isHorizontal ? 'flex-row w-full py-1' : 'flex-col gap-1 py-3 px-2 bg-white border-r border-gray-100 shadow-sm'}`}>
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        const isCalibrate = tool.id === 'calibrate';
        const label = isCalibrate && hasCalibration ? 'Recalibrar escala' : tool.label;

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={`${label} (${tool.shortcut})`}
            className={`
              relative group ${isHorizontal ? 'flex-1 aspect-square' : 'w-11 h-11 shrink-0'} rounded-xl flex items-center justify-center transition-all duration-150
              ${isActive ? tool.activeClass + ' shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
            `}
          >
            {tool.icon}

            {/* Calibration-active indicator dot */}
            {isCalibrate && hasCalibration && !isActive && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
            )}

            <span className={`absolute ${tooltipPos} bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg`}>
              {label}
              <span className="ml-1.5 text-gray-400 text-[10px]">{tool.shortcut}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
