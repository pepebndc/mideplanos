'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { listProjects, formatProjectDate } from '@/utils/storage';
import GridCanvas from '@/components/GridCanvas';
import Attribution from '@/components/Attribution';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  onLoadProject: (project: Project) => void;
  onOpenProjects: () => void;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/tiff,application/pdf';
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];

export default function FileUpload({ onFileLoaded, onLoadProject, onOpenProjects }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    listProjects()
      .then((p) => setRecentProjects(p.slice(0, 4)))
      .catch(() => {});
  }, []);

  const handleFile = (file: File) => {
    if (!VALID_TYPES.includes(file.type)) {
      alert('Formato no soportado. Por favor, usa JPG, PNG, WEBP o PDF.');
      return;
    }
    onFileLoaded(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="h-full overflow-y-auto relative" style={{ backgroundColor: '#F1EFEA' }}>
      {/* Animated background canvas */}
      <GridCanvas />

      {/* All content above the canvas */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Top rule */}
        <div className="border-b border-[#C8C4BB]/60" style={{ backgroundColor: 'rgba(241,239,234,0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="max-w-2xl mx-auto px-8 h-14 flex items-center justify-between">
            {/* Wordmark */}
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
              <DimensionIcon size={22} />
              <span
                className="text-sm font-bold tracking-tight"
                style={{ color: '#1A2C3D', letterSpacing: '-0.02em' }}
              >
                mideplanos
              </span>
            </Link>

            {recentProjects.length > 0 && (
              <button
                onClick={onOpenProjects}
                className="text-xs font-medium transition-colors"
                style={{ color: '#7A8A99' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#7A8A99')}
              >
                Ver todos los proyectos →
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-2xl mx-auto px-8 py-16">

          {/* Headline */}
          <div className="mb-12">
            <h1
              className="text-4xl font-bold tracking-tight mb-3"
              style={{ color: '#1A2C3D', letterSpacing: '-0.03em' }}
            >
              Medición de planos.
            </h1>
            <p className="text-sm" style={{ color: '#7A8A99' }}>
              Carga una imagen o PDF y mide distancias, áreas y perímetros con calibración a escala real.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
            }}
            onDrop={handleDrop}
            className="relative cursor-pointer select-none transition-all duration-200"
            style={{
              border: isDragging
                ? '1.5px dashed #2D6AE0'
                : '1.5px dashed #B5B0A3',
              backgroundColor: isDragging ? 'rgba(45,106,224,0.06)' : 'rgba(241,239,234,0.7)',
              backdropFilter: 'blur(2px)',
              borderRadius: '3px',
              padding: '52px 40px',
            }}
          >
            {/* Corner marks */}
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
              <span
                key={i}
                className={`absolute ${pos} w-3 h-3`}
                style={{
                  borderColor: isDragging ? '#2D6AE0' : '#B5B0A3',
                  borderStyle: 'solid',
                  borderWidth: 0,
                  ...(i === 0 && { borderTopWidth: '1.5px', borderLeftWidth: '1.5px' }),
                  ...(i === 1 && { borderTopWidth: '1.5px', borderRightWidth: '1.5px' }),
                  ...(i === 2 && { borderBottomWidth: '1.5px', borderLeftWidth: '1.5px' }),
                  ...(i === 3 && { borderBottomWidth: '1.5px', borderRightWidth: '1.5px' }),
                }}
              />
            ))}

            <div className="text-center">
              <p
                className="text-base font-medium mb-1 transition-colors"
                style={{ color: isDragging ? '#2D6AE0' : '#1A2C3D' }}
              >
                {isDragging ? 'Suelta aquí' : 'Arrastra un plano aquí'}
              </p>
              <p className="text-xs mb-6" style={{ color: '#9A9590' }}>
                JPG · PNG · WEBP · PDF
              </p>

              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2 transition-all duration-150"
                style={{
                  color: isDragging ? '#2D6AE0' : '#1A2C3D',
                  border: `1px solid ${isDragging ? '#2D6AE0' : '#1A2C3D'}`,
                  borderRadius: '2px',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1A2C3D';
                  e.currentTarget.style.color = '#F1EFEA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = isDragging ? '#2D6AE0' : '#1A2C3D';
                }}
              >
                Seleccionar archivo
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleChange}
            className="hidden"
          />

          {/* Recent projects */}
          {recentProjects.length > 0 && (
            <div className="mt-14">
              <div className="flex items-center gap-4 mb-5">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9A9590' }}>
                  Recientes
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#C8C4BB' }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onLoadProject(project)}
                    className="group flex items-stretch gap-0 text-left overflow-hidden transition-all duration-150"
                    style={{
                      border: '1px solid #C8C4BB',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1A2C3D';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#C8C4BB';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-16 shrink-0 overflow-hidden"
                      style={{ backgroundColor: '#E4E2DC', borderRight: '1px solid #C8C4BB' }}
                    >
                      {project.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <DimensionIcon size={16} color="#9A9590" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 px-3 py-2.5 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1A2C3D' }}>
                        {project.name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#9A9590' }}>
                        {formatProjectDate(project.updatedAt)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#B5B0A3' }}>
                        {project.measurements.length} medida{project.measurements.length !== 1 ? 's' : ''}
                        {project.canvasItems.length > 1 && ` · ${project.canvasItems.length} imágenes`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-[11px] text-center mt-14" style={{ color: '#B5B0A3' }}>
            Todo se procesa localmente en tu navegador — ningún archivo se envía a servidores.
          </p>
          <Attribution className="mt-2" />
        </div>
      </div>
    </div>
  );
}

// ─── Brand icon ───────────────────────────────────────────────────────────────

function DimensionIcon({ size = 24, color = '#1A2C3D' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="2" y1="11" x2="30" y2="11" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="2" y1="6.5" x2="2" y2="15.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="6.5" x2="30" y2="15.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="22" x2="19" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="2" y1="17.5" x2="2" y2="26.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="19" y1="17.5" x2="19" y2="26.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}
