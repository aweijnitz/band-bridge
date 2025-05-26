"use client";
import { useEffect, useState } from 'react';
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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', bandName: '', owner: '', status: 'open' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/project', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setError(null);
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setError(null);
    const res = await fetch('/api/project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newProject = await res.json();
      setProjects((prev) => [...prev, newProject]);
      setShowCreate(false);
      setForm({ name: '', bandName: '', owner: '', status: 'open' });
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to create project');
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setError(null);
    const res = await fetch(`/api/project/${showEdit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map(p => p.id === updated.id ? updated : p));
      setShowEdit(null);
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to update project');
    }
  };

  const handleArchive = async (id: number) => {
    setError(null);
    const res = await fetch(`/api/project/${id}/archive`, { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to archive project');
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const res = await fetch(`/api/project/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter(p => p.id !== id));
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Project</button>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-600">No projects. Please create one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded shadow p-6 hover:shadow-lg transition">
              <Link href={`/project/${project.id}`} className="block mb-2">
                <h2 className="text-xl font-semibold">{project.name}</h2>
                <div className="text-gray-400 text-xs">ID: {project.id}</div>
                <div className="text-gray-500 text-sm">Band: {project.bandName}</div>
                <div className="text-gray-500 text-sm">Owner: {project.owner}</div>
                <div className="text-gray-500 text-sm">Status: {project.status}</div>
              </Link>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowEdit(project); setForm({ name: project.name, bandName: project.bandName, owner: project.owner, status: project.status }); }} className="px-2 py-1 bg-yellow-500 text-white rounded">Edit</button>
                <button onClick={() => handleArchive(project.id)} className="px-2 py-1 bg-gray-500 text-white rounded" disabled={project.status === 'archived'}>Archive</button>
                <button onClick={() => handleDelete(project.id)} className="px-2 py-1 bg-red-600 text-white rounded" disabled={project.status !== 'archived'}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Project</h2>
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Project Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Band Name" value={form.bandName} onChange={e => setForm(f => ({ ...f, bandName: e.target.value }))} />
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            <select className="w-full mb-4 border rounded px-2 py-1" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {PROJECT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Project Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Project</h2>
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Project Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Band Name" value={form.bandName} onChange={e => setForm(f => ({ ...f, bandName: e.target.value }))} />
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            <select className="w-full mb-4 border rounded px-2 py-1" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {PROJECT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowEdit(null)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={handleEdit} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 