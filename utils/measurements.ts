import { Point, CalibrationData, Unit } from '@/types';

export function calculatePixelDistance(points: Point[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function calculatePixelArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

export function pixelsToReal(pixels: number, calibration: CalibrationData): number {
  return pixels / calibration.pixelsPerUnit;
}

export function pixelAreaToReal(pixelArea: number, calibration: CalibrationData): number {
  return pixelArea / (calibration.pixelsPerUnit * calibration.pixelsPerUnit);
}

export function formatLength(value: number, unit: Unit): string {
  return `${value.toFixed(2)} ${unit}`;
}

export function formatArea(value: number, unit: Unit): string {
  const areaUnit = unit === 'm' ? 'm²' : unit === 'cm' ? 'cm²' : unit === 'mm' ? 'mm²' : unit === 'ft' ? 'ft²' : 'in²';
  return `${value.toFixed(2)} ${areaUnit}`;
}

export const UNIT_LABELS: Record<Unit, string> = {
  m: 'Metros (m)',
  cm: 'Centímetros (cm)',
  mm: 'Milímetros (mm)',
  ft: 'Pies (ft)',
  in: 'Pulgadas (in)',
};

export const MEASUREMENT_COLORS = [
  '#2D6AE0', // blueprint blue
  '#0A9070', // teal
  '#D97000', // amber
  '#C8312A', // brick red
  '#7038B0', // plum
  '#0B8FAB', // steel cyan
  '#5A8A28', // leaf green
  '#C55A1E', // terracotta
];

export function getNextColor(index: number): string {
  return MEASUREMENT_COLORS[index % MEASUREMENT_COLORS.length];
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
