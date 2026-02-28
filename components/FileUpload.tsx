'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, FileImage, FileText, FolderOpen, Clock } from 'lucide-react';
import { Project } from '@/types';
import { listProjects, formatProjectDate } from '@/utils/storage';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
  onLoadProject: (project: Project) => void;
  onOpenProjects: () => void;
}

export default function FileUpload({ onFileLoaded, onLoadProject, onOpenProjects }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  useEffect(() => {
    listProjects()
      .then((projects) => setRecentProjects(projects.slice(0, 4)))
      .catch(() => {});
  }, []);

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Formato no soportado. Por favor, sube una imagen (JPG, PNG, WEBP) o un PDF.');
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
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 overflow-y-auto">
      <div className="w-full max-w-xl mx-auto px-6 py-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">mideplanos</h1>
          <p className="text-gray-500 mt-2 text-sm">Mide distancias y áreas en planos de construcción</p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <Upload className={`mx-auto mb-4 w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-base font-semibold text-gray-700">
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu plano aquí'}
          </p>
          <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionar un archivo</p>
          <div className="flex items-center justify-center gap-4 mt-5">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
              <FileImage className="w-3.5 h-3.5" /> JPG · PNG · WEBP
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
              <FileText className="w-3.5 h-3.5" /> PDF
            </span>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/tiff,application/pdf"
          onChange={handleChange}
          className="hidden"
        />

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <Clock className="w-4 h-4" />
                Proyectos recientes
              </div>
              <button
                onClick={onOpenProjects}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todos →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onLoadProject(project)}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 text-left hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  {/* Mini thumbnail */}
                  <div className="w-14 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                    {project.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FolderOpen className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-700">
                      {project.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatProjectDate(project.updatedAt)}</p>
                    <p className="text-[10px] text-gray-300">
                      {project.measurements.length} medida{project.measurements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          {[
            { icon: '📏', label: 'Medir distancias' },
            { icon: '📐', label: 'Calcular áreas' },
            { icon: '💾', label: 'Guardar proyectos' },
          ].map((f) => (
            <div key={f.label} className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs text-gray-600 font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
