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
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
};

export default function ProjectListComponent({ projects, state, onEdit, onDelete }: ProjectListComponentProps) {
  const filtered = projects
    .filter(p => p.status === state)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filtered.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((project) => (
          <ProjectCardComponent
            key={project.id}
            project={project}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
} 