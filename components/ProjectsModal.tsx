'use client';

import { useEffect, useState, useRef } from 'react';
import { Project } from '@/types';
import { listProjects, deleteProject, formatProjectDate } from '@/utils/storage';
import { X, Trash2, Plus, Edit2, Check } from 'lucide-react';

interface ProjectsModalProps {
  currentProjectId: string | null;
  onLoadProject: (project: Project) => void;
  onNewProject: () => void;
  onClose: () => void;
}

export default function ProjectsModal({
  currentProjectId,
  onLoadProject,
  onNewProject,
  onClose,
}: ProjectsModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(26,44,61,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          backgroundColor: '#F1EFEA',
          backgroundImage:
            'linear-gradient(rgba(26,44,61,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(26,44,61,0.045) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          border: '1px solid #C8C4BB',
          borderRadius: '3px',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 h-14 shrink-0"
          style={{ borderBottom: '1px solid #C8C4BB', backgroundColor: '#F1EFEA' }}
        >
          <div className="flex items-center gap-3">
            <DimensionIcon size={18} />
            <div>
              <span className="text-sm font-bold tracking-tight" style={{ color: '#1A2C3D', letterSpacing: '-0.02em' }}>
                Proyectos guardados
              </span>
              {!loading && (
                <span className="ml-2 text-xs" style={{ color: '#9A9590' }}>
                  {projects.length === 0
                    ? 'ninguno aún'
                    : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NewProjectButton onClick={onNewProject} />
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: '#9A9590', borderRadius: '2px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9A9590')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: '#C8C4BB', borderTopColor: '#1A2C3D' }}
              />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <DimensionIcon size={32} color="#C8C4BB" />
              <p className="mt-4 text-sm font-medium" style={{ color: '#7A8A99' }}>
                No hay proyectos guardados
              </p>
              <p className="text-xs mt-1" style={{ color: '#B5B0A3' }}>
                Guarda tu trabajo desde el botón <strong style={{ color: '#7A8A99' }}>Guardar</strong> en la barra superior
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((project) => {
                const isActive = project.id === currentProjectId;
                const isDeleting = deletingId === project.id;
                const isRenaming = renamingId === project.id;

                return (
                  <div
                    key={project.id}
                    onClick={() => { if (!isRenaming) { onLoadProject(project); onClose(); } }}
                    className="group relative overflow-hidden cursor-pointer transition-all duration-150"
                    style={{
                      border: isActive ? '1.5px solid #1A2C3D' : '1px solid #C8C4BB',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.borderColor = '#1A2C3D';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.95)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.borderColor = '#C8C4BB';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.7)';
                      }
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="aspect-video overflow-hidden relative"
                      style={{ backgroundColor: '#E4E2DC', borderBottom: '1px solid #C8C4BB' }}
                    >
                      {project.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <DimensionIcon size={24} color="#B5B0A3" />
                        </div>
                      )}

                      {isActive && (
                        <div
                          className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5"
                          style={{ backgroundColor: '#1A2C3D', color: '#F1EFEA', borderRadius: '2px' }}
                        >
                          ABIERTO
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/4 transition-colors" />
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5" style={{ backgroundColor: 'transparent' }}>
                      {isRenaming ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={renameInputRef}
                            defaultValue={project.name}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  setProjects((prev) =>
                                    prev.map((p) => (p.id === project.id ? { ...p, name: val } : p))
                                  );
                                }
                                setRenamingId(null);
                              }
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="flex-1 text-xs px-2 py-1 focus:outline-none"
                            style={{
                              border: '1px solid #1A2C3D',
                              borderRadius: '2px',
                              backgroundColor: '#fff',
                              color: '#1A2C3D',
                            }}
                          />
                          <button
                            onClick={() => setRenamingId(null)}
                            className="p-1 transition-colors"
                            style={{ color: '#7A8A99' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#7A8A99')}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: '#1A2C3D' }}>
                              {project.name}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#9A9590' }}>
                              {formatProjectDate(project.updatedAt)}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#B5B0A3' }}>
                              {project.canvasItems.length} imagen{project.canvasItems.length !== 1 ? 'es' : ''} · {project.measurements.length} medida{project.measurements.length !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Actions */}
                          <div
                            className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setRenamingId(project.id)}
                              title="Renombrar"
                              className="w-6 h-6 flex items-center justify-center transition-colors"
                              style={{ color: '#B5B0A3', borderRadius: '2px' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2C3D')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#B5B0A3')}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, project.id)}
                              disabled={isDeleting}
                              title="Eliminar"
                              className="w-6 h-6 flex items-center justify-center transition-colors disabled:opacity-40"
                              style={{ color: '#B5B0A3', borderRadius: '2px' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#C0392B')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#B5B0A3')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 shrink-0"
          style={{ borderTop: '1px solid #C8C4BB', backgroundColor: '#F1EFEA' }}
        >
          <p className="text-[11px] text-center" style={{ color: '#B5B0A3' }}>
            Los proyectos se guardan localmente en este navegador · Los datos no se envían a ningún servidor
          </p>
        </div>
      </div>
    </div>
  );
}

function NewProjectButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 transition-all duration-150"
      style={{
        color: hovered ? '#F1EFEA' : '#1A2C3D',
        border: '1px solid #1A2C3D',
        borderRadius: '2px',
        backgroundColor: hovered ? '#1A2C3D' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Plus className="w-3.5 h-3.5" />
      Nuevo proyecto
    </button>
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
