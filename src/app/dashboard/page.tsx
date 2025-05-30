"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ProjectCardComponent from './ProjectCardComponent';
import ProjectModalComponent from './ProjectModalComponent';
import { useRouter } from 'next/navigation';
import LoginFormComponent from "../components/LoginFormComponent";

const PROJECT_STATUS = ["open", "released", "archived"] as const;
// const bandName = process.env.NEXT_PUBLIC_BAND_NAME || "My Band";

type Band = {
  id: number;
  name: string;
};

type ProjectStatus = typeof PROJECT_STATUS[number];

type Project = {
  id: number;
  name: string;
  bandName: string;
  owner: string;
  status: ProjectStatus;
  createdAt: string;
  bandId?: number;
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Project | null>(null);
  const [form, setForm] = useState<{ name: string; status: ProjectStatus; bandId?: number }>({ name: '', status: 'open', bandId: 0 });
  const [error, setError] = useState<string | null>(null);
  const createNameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check authentication on mount
  useEffect(() => {
    fetch('/api/auth/session').then(res => {
      if (!res.ok) {
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    });
  }, []);

  // Fetch bands and userId for the current user, only if logged in
  useEffect(() => {
    if (isLoggedIn !== true) return; // Only run if authenticated
    fetch('/api/mine')
      .then(res => {
        if (!res.ok) {
          // If not authenticated, force login
          setIsLoggedIn(false);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setUserId(data.userId);
        if (!data.bands) {
          setBands([]);
          setSelectedBand(null);
          return;
        }
        const bands = data.bands.map((b: any) => ({ id: b.bandId, name: b.bandName }));
        setBands(bands);
        if (bands.length === 1) {
          setSelectedBand(bands[0]);
        } else if (bands.length > 1) {
          setSelectedBand(bands[0]);
        }
      })
      .catch(() => setError('Failed to load bands'));
  }, [isLoggedIn]);

  // Fetch projects for the selected band
  useEffect(() => {
    if (!selectedBand) return;
    setLoading(true);
    fetch(`/api/project?bandId=${selectedBand.id}`, { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setError(null);
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, [selectedBand]);

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
    if (!userId) {
      setError('User not loaded');
      return;
    }
    const res = await fetch('/api/project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        ownerId: userId,
        status: form.status,
        bandId: form.bandId
      }),
    });
    if (res.ok) {
      const newProject = await res.json();
      setProjects((prev) => [...prev, newProject]);
      setShowCreate(false);
      setForm({ name: '', status: 'open', bandId: 0 });
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
      body: JSON.stringify({
        name: form.name,
        ownerId: userId,
        status: form.status,
        bandId: form.bandId
      }),
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


  if (isLoggedIn === false) {
    return <LoginFormComponent redirect="/dashboard" />;
  }
  if (isLoggedIn === null) {
    // Optionally show a loading spinner here
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-400 p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-semibold">
            {bands.length > 1 ? (
              <select
                className="text-2xl font-semibold bg-zinc-200 rounded px-2 py-1"
                value={selectedBand?.id || ''}
                onChange={e => {
                  const band = bands.find(b => b.id === Number(e.target.value));
                  if (band) setSelectedBand(band);
                }}
              >
                {bands.map(band => (
                  <option key={band.id} value={band.id}>{band.name}</option>
                ))}
              </select>
            ) : (
              bands[0]?.name || 'BAND_NOT_SET'
            )} projects
          </h1>
        </div>
        <button
          onClick={() => {
            setForm({ name: '', status: 'open', bandId: selectedBand?.id ?? 0 });
            setShowCreate(true);
          }}
          className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-500"
          disabled={!selectedBand}
        >
          New Project
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
            <h2 className="text-2xl mb-4">Open Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => p.status === 'open')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((project) => (
                  <ProjectCardComponent
                    key={project.id}
                    project={project}
                    onEdit={(p) => { setShowEdit(p); setForm({ name: p.name, status: p.status as ProjectStatus, bandId: selectedBand?.id ?? 0 }); }}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
          {/* RELEASED PROJECTS */}
          <div>
            <h2 className="text-2xl mb-4">Released Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => p.status === 'released')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((project) => (
                  <ProjectCardComponent
                    key={project.id}
                    project={project}
                    onEdit={(p) => { setShowEdit(p); setForm({ name: p.name, status: p.status as ProjectStatus, bandId: selectedBand?.id ?? 0 }); }}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </div>
          {/* ARCHIVED PROJECTS */}
          <div>
            <h2 className="text-2xl mb-4">Archived Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects
                .filter(p => p.status === 'archived')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((project) => (
                  <ProjectCardComponent
                    key={project.id}
                    project={project}
                    onEdit={(p) => { setShowEdit(p); setForm({ name: p.name, status: p.status as ProjectStatus, bandId: selectedBand?.id ?? 0 }); }}
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
        form={{ ...form, bandId: selectedBand?.id ?? 0 }}
        bandName={selectedBand?.name || 'My Band'}
        onFormChange={setForm}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        loading={loading}
        error={error}
        mode="create"
      />
      <ProjectModalComponent
        open={!!showEdit}
        form={{ ...form, bandId: selectedBand?.id ?? 0 }}
        bandName={selectedBand?.name || 'My Band'}
        onFormChange={setForm}
        onClose={() => setShowEdit(null)}
        onCreate={handleEdit}
        loading={loading}
        error={error}
        mode="edit"
      />
    </div>
  );
}

export async function getCurrentUserInfo() {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return null;
    const { userId, userName, bandName, bandId } = await res.json();
    return { userId, userName, bandName, bandId };
  } catch {
    return null;
  }
} 