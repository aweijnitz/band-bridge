import Link from 'next/link';

const mockProjects = [
  { id: 1, name: 'Next Album' },
  { id: 2, name: 'New EP' },
  { id: 3, name: 'Remix' },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Project</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <Link key={project.id} href={`/project/${project.id}`} className="block bg-white rounded shadow p-6 hover:shadow-lg transition">
            <h2 className="text-xl font-semibold">{project.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
} 