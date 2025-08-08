import Link from 'next/link';
import DOMPurify from 'dompurify';

type ProjectStatus = "open" | "released" | "archived";

type Project = {
  id: number;
  name: string;
  bandName: string;
  owner: string;
  status: ProjectStatus;
  createdAt: string;
  description?: string;
};

type ProjectCardComponentProps = {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: number) => void;
};

export default function ProjectCardComponent({ project, onEdit, onDelete }: ProjectCardComponentProps) {
  const truncatedDescription = project.description 
    ? project.description.length > 128 
      ? project.description.substring(0, 128) + '...'
      : project.description
    : null;

  return (
    <div className="bg-zinc-300 rounded shadow p-6 hover:shadow-lg transition relative">
      <button 
        onClick={() => onEdit(project)} 
        className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-zinc-800 transition"
        title="Edit"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-label="Edit">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
      <Link href={`/project/${project.id}`} className="block mb-2 pr-8">
        <h2 className="text-zinc-800 text-lg hover:underline">{project.name}</h2>
        <div className="text-zinc-400 text-xs">ID: {project.id}</div>
      </Link>
      {truncatedDescription && (
        <div 
          className="text-zinc-600 text-sm mb-2"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(truncatedDescription) }}
        />
      )}
      {project.status === 'archived' && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => onDelete(project.id)} className="px-2 py-1 bg-rose-700 text-sm text-white rounded">Delete</button>
        </div>
      )}
    </div>
  );
} 