export type Tool = 'select' | 'pan' | 'calibrate' | 'distance' | 'area' | 'delete' | 'crop';

export type Unit = 'm' | 'cm' | 'mm' | 'ft' | 'in';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasItem {
  id: string;
  name: string;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Position in virtual canvas coordinates */
  x: number;
  y: number;
  /** Display scale (1 = natural size) */
  scale: number;
  /** Crop region in natural image coordinates */
  crop: Rect;
  zIndex: number;
  /** PDF metadata */
  pdfPage?: number;
  pdfTotalPages?: number;
}

export interface CalibrationData {
  pixelLength: number;
  realLength: number;
  unit: Unit;
  pixelsPerUnit: number;
}

/** Payload when user finishes drawing a calibration reference (line or area). */
export type PendingCalibration =
  | { type: 'line'; pixelLength: number }
  | { type: 'area'; pixelArea: number };

export interface DistanceMeasurement {
  id: string;
  type: 'distance';
  points: Point[];
  pixelLength: number;
  realLength: number | null;
  unit: Unit | null;
  label: string;
  color: string;
  /** If false, hidden from canvas (eye-off). Omitted/true = visible. */
  visible?: boolean;
}

export interface AreaMeasurement {
  id: string;
  type: 'area';
  points: Point[];
  pixelArea: number;
  realArea: number | null;
  unit: Unit | null;
  label: string;
  color: string;
  /** If false, hidden from canvas (eye-off). Omitted/true = visible. */
  visible?: boolean;
}

export type Measurement = DistanceMeasurement | AreaMeasurement;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Small base64 JPEG used as preview card thumbnail */
  thumbnail: string;
  canvasItems: CanvasItem[];
  measurements: Measurement[];
  calibration: CalibrationData | null;
}

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved';
