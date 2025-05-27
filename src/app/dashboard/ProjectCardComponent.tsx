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
    <div className="bg-white rounded shadow p-6 hover:shadow-lg transition">
      <Link href={`/project/${project.id}`} className="block mb-2">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <div className="text-gray-400 text-xs">ID: {project.id}</div>
        <div className="text-gray-500 text-sm">Band: {project.bandName}</div>
        <div className="text-gray-500 text-sm">Owner: {project.owner}</div>
        <div className="text-gray-500 text-sm">Status: {project.status}</div>
      </Link>
      <div className="flex gap-2 mt-2">
        {project.status !== 'archived' && (
          <button onClick={() => onEdit(project)} className="px-2 py-1 bg-yellow-500 text-white rounded">Edit</button>
        )}
        {project.status === 'archived' && (
          <button onClick={() => onDelete(project.id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
        )}
      </div>
    </div>
  );
} 