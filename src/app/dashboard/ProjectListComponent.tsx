import React from 'react';
import ProjectCardComponent from './ProjectCardComponent';

type ProjectStatus = 'open' | 'released' | 'archived';

type Project = {
  id: number;
  name: string;
  bandName: string;
  owner: string;
  status: ProjectStatus;
  createdAt: string;
  bandId?: number;
};

type ProjectListComponentProps = {
  projects: Project[];
  state: ProjectStatus;
  selectedBand: { id: number; name: string } | null;
  onEdit: (p: Project) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
};

export default function ProjectListComponent({ projects, state, selectedBand, onEdit, onArchive, onDelete }: ProjectListComponentProps) {
  const filtered = projects
    .filter(p => p.status === state)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filtered.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2 capitalize">{state} projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((project) => (
          <ProjectCardComponent
            key={project.id}
            project={project}
            onEdit={onEdit}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
} 