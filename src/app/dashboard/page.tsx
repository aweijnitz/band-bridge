"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ProjectCardComponent from './ProjectCardComponent';
import ProjectModalComponent from './ProjectModalComponent';

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
  const [form, setForm] = useState<{ name: string; bandName: string; owner: string; status: ProjectStatus }>({ name: '', bandName: '', owner: '', status: 'open' });
  const [error, setError] = useState<string | null>(null);
  const createNameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (showCreate && createNameInputRef.current) {
      createNameInputRef.current.focus();
    }
  }, [showCreate]);

  useEffect(() => {
    if (showEdit && editNameInputRef.current) {
      editNameInputRef.current.focus();
    }
  }, [showEdit]);

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
        <button
          onClick={() => {
            setForm({ name: '', bandName: '', owner: '', status: 'open' });
            setShowCreate(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Project
        </button>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-600">No projects. Please create one.</div>
      ) : (
        <div className="space-y-10">
          {/* OPEN PROJECTS */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Open Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => p.status === 'open')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((project) => (
                  <ProjectCardComponent
                    key={project.id}
                    project={project}
                    onEdit={(p) => { setShowEdit(p); setForm({ name: p.name, bandName: p.bandName, owner: p.owner, status: p.status as ProjectStatus }); }}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
          {/* RELEASED PROJECTS */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Released Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => p.status === 'released')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((project) => (
                  <ProjectCardComponent
                    key={project.id}
                    project={project}
                    onEdit={(p) => { setShowEdit(p); setForm({ name: p.name, bandName: p.bandName, owner: p.owner, status: p.status as ProjectStatus }); }}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
          {/* ARCHIVED PROJECTS */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Archived Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => p.status === 'archived')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((project) => (
                  <ProjectCardComponent
                    key={project.id}
                    project={project}
                    onEdit={(p) => { setShowEdit(p); setForm({ name: p.name, bandName: p.bandName, owner: p.owner, status: p.status as ProjectStatus }); }}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
      <ProjectModalComponent
        open={showCreate}
        form={form}
        onFormChange={setForm}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={loading}
        error={error}
      />
      {/* Edit Project Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Project</h2>
            <input ref={editNameInputRef} className="w-full mb-2 border rounded px-2 py-1" placeholder="Project Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Band Name" value={form.bandName} onChange={e => setForm(f => ({ ...f, bandName: e.target.value }))} />
            <input className="w-full mb-2 border rounded px-2 py-1" placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            <select className="w-full mb-4 border rounded px-2 py-1" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
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