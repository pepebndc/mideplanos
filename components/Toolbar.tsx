'use client';

import { Tool } from '@/types';
import { MousePointer2, Ruler, Square, Crosshair, Trash2, Crop } from 'lucide-react';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  hasCalibration: boolean;
  onRecalibrate: () => void;
}

const TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string; activeClass: string }[] = [
  { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Seleccionar / Mover', shortcut: 'S', activeClass: 'bg-gray-100 text-gray-700' },
  { id: 'calibrate', icon: <Crosshair className="w-5 h-5" />, label: 'Calibrar escala', shortcut: 'C', activeClass: 'bg-amber-100 text-amber-600' },
  { id: 'distance', icon: <Ruler className="w-5 h-5" />, label: 'Medir distancia', shortcut: 'D', activeClass: 'bg-blue-100 text-blue-600' },
  { id: 'area', icon: <Square className="w-5 h-5" />, label: 'Medir área', shortcut: 'A', activeClass: 'bg-green-100 text-green-600' },
  { id: 'crop', icon: <Crop className="w-5 h-5" />, label: 'Recortar imagen', shortcut: 'R', activeClass: 'bg-purple-100 text-purple-600' },
  { id: 'delete', icon: <Trash2 className="w-5 h-5" />, label: 'Eliminar medida', shortcut: 'Del', activeClass: 'bg-red-100 text-red-500' },
];

export default function Toolbar({ activeTool, onToolChange, hasCalibration, onRecalibrate }: ToolbarProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 px-2 bg-white border-r border-gray-100 shadow-sm select-none">
      {/* Logo mark */}
      <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mb-2 flex-shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="w-full h-px bg-gray-100 my-1" />

      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`
              relative group w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0
              ${isActive ? tool.activeClass + ' shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
            `}
          >
            {tool.icon}
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              {tool.label}
              <span className="ml-1.5 text-gray-400 text-[10px]">{tool.shortcut}</span>
            </span>
          </button>
        );
      })}

      {hasCalibration && (
        <>
          <div className="w-full h-px bg-gray-100 my-1" />
          <button
            onClick={onRecalibrate}
            title="Recalibrar escala"
            className="relative group w-11 h-11 rounded-xl flex items-center justify-center text-amber-400 hover:bg-amber-50 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              Recalibrar
            </span>
          </button>
        </>
      )}
    </div>
  );
}
