'use client';

import { Tool } from '@/types';
import type { DistanceMode } from '@/components/MeasurementCanvas';
import { MousePointer2, Hand, Ruler, Square, Crosshair, Trash2, Crop } from 'lucide-react';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  hasCalibration: boolean;
  calibrationMode?: 'line' | 'area';
  onCalibrationModeChange?: (mode: 'line' | 'area') => void;
  distanceMode?: DistanceMode;
  onDistanceModeChange?: (mode: DistanceMode) => void;
  variant?: 'vertical' | 'horizontal';
}

const TOOLS: { id: Tool; icon: React.ReactNode; iconSm: React.ReactNode; label: string; shortcut: string; activeClass: string }[] = [
  { id: 'pan', icon: <Hand className="w-5 h-5" />, iconSm: <Hand className="w-4 h-4" />, label: 'Mover vista', shortcut: 'H', activeClass: 'bg-sky-100 text-sky-600' },
  { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, iconSm: <MousePointer2 className="w-4 h-4" />, label: 'Seleccionar / Mover', shortcut: 'S', activeClass: 'bg-gray-100 text-gray-700' },
  { id: 'calibrate', icon: <Crosshair className="w-5 h-5" />, iconSm: <Crosshair className="w-4 h-4" />, label: 'Calibrar escala', shortcut: 'C', activeClass: 'bg-amber-100 text-amber-600' },
  { id: 'distance', icon: <Ruler className="w-5 h-5" />, iconSm: <Ruler className="w-4 h-4" />, label: 'Medir distancia', shortcut: 'D', activeClass: 'bg-blue-100 text-blue-600' },
  { id: 'area', icon: <Square className="w-5 h-5" />, iconSm: <Square className="w-4 h-4" />, label: 'Medir área', shortcut: 'A', activeClass: 'bg-green-100 text-green-600' },
  { id: 'crop', icon: <Crop className="w-5 h-5" />, iconSm: <Crop className="w-4 h-4" />, label: 'Recortar imagen', shortcut: 'R', activeClass: 'bg-purple-100 text-purple-600' },
  { id: 'delete', icon: <Trash2 className="w-5 h-5" />, iconSm: <Trash2 className="w-4 h-4" />, label: 'Eliminar medida', shortcut: 'Del', activeClass: 'bg-red-100 text-red-500' },
];

export default function Toolbar({ activeTool, onToolChange, hasCalibration, calibrationMode = 'line', onCalibrationModeChange, distanceMode = 'line', onDistanceModeChange, variant = 'vertical' }: ToolbarProps) {
  const isHorizontal = variant === 'horizontal';
  const tooltipPos = isHorizontal
    ? 'bottom-14 left-1/2 -translate-x-1/2'
    : 'left-14 top-1/2 -translate-y-1/2';
  const showCalibrationMode = activeTool === 'calibrate' && onCalibrationModeChange;
  const showDistanceMode = activeTool === 'distance' && onDistanceModeChange;

  // On mobile (horizontal): mode selectors or tool hint in top row (crop message in same zone)
  const showCropHint = isHorizontal && activeTool === 'crop';
  const hasModeRow = isHorizontal && (showDistanceMode || showCalibrationMode || showCropHint);
  const topRowContent = hasModeRow && (
    <div className="h-6 w-full flex items-center justify-center gap-1 shrink-0 px-1">
      {showCropHint && (
        <span className="text-[9px] text-gray-600 text-center px-1">
          Haz clic en una imagen para recortarla
        </span>
      )}
      {showDistanceMode && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDistanceModeChange('line'); }}
            title="Un solo segmento (dos puntos)"
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              distanceMode === 'line' ? 'bg-blue-200 text-blue-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Línea
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDistanceModeChange('polyline'); }}
            title="Varios segmentos (polilínea)"
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              distanceMode === 'polyline' ? 'bg-blue-200 text-blue-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Polilínea
          </button>
        </>
      )}
      {showCalibrationMode && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCalibrationModeChange('line'); }}
            title="Calibrar con una línea de escala"
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              calibrationMode === 'line' ? 'bg-amber-200 text-amber-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Línea
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCalibrationModeChange('area'); }}
            title="Calibrar con un área de referencia"
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
              calibrationMode === 'area' ? 'bg-amber-200 text-amber-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Área
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className={`flex select-none ${isHorizontal ? 'flex-col w-full py-0.5 min-h-0' : 'flex-col gap-1 py-3 px-2 bg-white border-r border-gray-100 shadow-sm'}`}>
      {topRowContent}
      <div className={`flex ${isHorizontal ? 'flex-row flex-1 w-full min-h-0' : 'flex-col gap-1'}`}>
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          const isCalibrate = tool.id === 'calibrate';
          const label = isCalibrate && hasCalibration ? 'Recalibrar escala' : tool.label;
          const iconNode = isHorizontal ? tool.iconSm : tool.icon;

          return (
            <div key={tool.id} className={isHorizontal ? 'flex-1 flex flex-col items-center min-h-0 min-w-0' : 'flex flex-col gap-1'}>
              <button
                onClick={() => onToolChange(tool.id)}
                title={`${label} (${tool.shortcut})`}
                className={`
                  relative group ${isHorizontal ? 'flex-1 min-h-[36px] w-full max-h-9 rounded-lg' : 'w-11 h-11 shrink-0 rounded-xl'} flex items-center justify-center transition-all duration-150
                  ${isActive ? tool.activeClass + ' shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
                `}
              >
                {iconNode}

                {/* Calibration-active indicator dot */}
                {isCalibrate && hasCalibration && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                )}

                <span className={`absolute ${tooltipPos} bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg`}>
                  {label}
                  <span className="ml-1.5 text-gray-400 text-[10px]">{tool.shortcut}</span>
                </span>
              </button>
              {/* Calibration / Distance mode — only below button on desktop (vertical) */}
              {!isHorizontal && isCalibrate && showCalibrationMode && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCalibrationModeChange('line'); }}
                    title="Calibrar con una línea de escala"
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      calibrationMode === 'line' ? 'bg-amber-200 text-amber-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    Línea
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCalibrationModeChange('area'); }}
                    title="Calibrar con un área de referencia"
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      calibrationMode === 'area' ? 'bg-amber-200 text-amber-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    Área
                  </button>
                </div>
              )}
              {!isHorizontal && tool.id === 'distance' && showDistanceMode && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDistanceModeChange('line'); }}
                    title="Un solo segmento (dos puntos)"
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      distanceMode === 'line' ? 'bg-blue-200 text-blue-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    Línea
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDistanceModeChange('polyline'); }}
                    title="Varios segmentos (polilínea)"
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      distanceMode === 'polyline' ? 'bg-blue-200 text-blue-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    Polilínea
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
