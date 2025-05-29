import Link from 'next/link';

const PROJECT_STATUS = ["open", "released", "archived"] as const;
type ProjectStatus = typeof PROJECT_STATUS[number];

type Project = {
  id: number;
  name: string;
  bandName: string;
  owner: string;
  status: ProjectStatus;
  createdAt: string;
};

type ProjectCardComponentProps = {
  project: Project;
  onEdit: (project: Project) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
};

export default function ProjectCardComponent({ project, onEdit, onArchive, onDelete }: ProjectCardComponentProps) {
  return (
    <div className="bg-zinc-300 rounded shadow p-6 hover:shadow-lg transition">
      <Link href={`/project/${project.id}`} className="block mb-2">
        <h2 className="text-zinc-800 text-lg">{project.name}</h2>
        <div className="text-zinc-400 text-xs">ID: {project.id}</div>
      </Link>
      <div className="flex gap-2 mt-2">
          <button onClick={() => onEdit(project)} className="px-2 py-1 bg-indigo-500 text-sm text-white rounded">Edit</button>
        {project.status === 'archived' && (
          <button onClick={() => onDelete(project.id)} className="px-2 py-1 bg-rose-700 text-sm text-white rounded">Delete</button>
        )}
      </div>
    </div>
  );
} 