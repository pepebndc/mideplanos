'use client';

import { useEffect, useState, useRef } from 'react';
import { Project } from '@/types';
import { listProjects, deleteProject, formatProjectDate } from '@/utils/storage';
import { X, FolderOpen, Trash2, Plus, Edit2, Check } from 'lucide-react';

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

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Proyectos guardados</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {projects.length === 0 ? 'Ningún proyecto guardado aún' : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewProject}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nuevo proyecto
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No hay proyectos guardados</p>
              <p className="text-sm text-gray-400 mt-1">Guarda tu trabajo desde el botón <strong>Guardar</strong> en la barra superior</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const isActive = project.id === currentProjectId;
                const isDeleting = deletingId === project.id;
                const isRenaming = renamingId === project.id;

                return (
                  <div
                    key={project.id}
                    onClick={() => { if (!isRenaming) { onLoadProject(project); onClose(); } }}
                    className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-150 hover:shadow-lg ${
                      isActive ? 'border-blue-500 shadow-md' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 overflow-hidden relative">
                      {project.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FolderOpen className="w-10 h-10 text-gray-300" />
                        </div>
                      )}

                      {/* Active badge */}
                      {isActive && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                          ABIERTO
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>

                    {/* Info */}
                    <div className="p-3 bg-white">
                      {isRenaming ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={renameInputRef}
                            defaultValue={project.name}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  // Update name in state; actual save happens via onLoadProject caller
                                  setProjects((prev) =>
                                    prev.map((p) => (p.id === project.id ? { ...p, name: val } : p))
                                  );
                                }
                                setRenamingId(null);
                              }
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <button
                            onClick={() => setRenamingId(null)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{project.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{formatProjectDate(project.updatedAt)}</p>
                            <p className="text-[10px] text-gray-300 mt-0.5">
                              {project.canvasItems.length} imagen{project.canvasItems.length !== 1 ? 'es' : ''} · {project.measurements.length} medida{project.measurements.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setRenamingId(project.id)}
                              title="Renombrar"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, project.id)}
                              disabled={isDeleting}
                              title="Eliminar"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            Los proyectos se guardan localmente en este navegador · Los datos no se envían a ningún servidor
          </p>
        </div>
      </div>
    </div>
  );
}
