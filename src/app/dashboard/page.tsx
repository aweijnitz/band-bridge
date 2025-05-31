"use client";
import { useEffect, useState, useRef } from 'react';
import LoginFormComponent from "../components/LoginFormComponent";
import ProjectListComponent from './ProjectListComponent';
import ProjectModalComponent from './ProjectModalComponent';

type Band = {
  id: number;
  name: string;
};

type Project = {
  id: number;
  name: string;
  bandName: string;
  owner: string;
  status: 'open' | 'released' | 'archived';
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
  const [error, setError] = useState<string | null>(null);
  const createNameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [createForm, setCreateForm] = useState<{ name: string; status: 'open' | 'released' | 'archived'; bandId: number }>({ name: '', status: 'open', bandId: selectedBand?.id || 0 });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; status: 'open' | 'released' | 'archived'; bandId: number }>({ name: '', status: 'open', bandId: 0 });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
          setIsLoggedIn(false);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (!data.bands) {
          setBands([]);
          setSelectedBand(null);
          return;
        }
        setCurrentUserId(data.userId || null);
        const bands = data.bands.map((b: { bandId: number; bandName: string }) => ({ id: b.bandId, name: b.bandName }));
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
            setCreateForm({ name: '', status: 'open', bandId: selectedBand?.id || 0 });
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
            <ProjectListComponent
              projects={projects}
              state="open"
              onEdit={(p) => {
                setEditForm({ name: p.name, status: p.status, bandId: p.bandId ?? selectedBand?.id ?? 0 });
                setShowEdit(p);
              }}
              onDelete={handleDelete}
            />
          </div>
          {/* RELEASED PROJECTS */}
          <div>
            <h2 className="text-2xl mb-4">Released Projects</h2>
            <ProjectListComponent
              projects={projects}
              state="released"
              onEdit={(p) => {
                setEditForm({ name: p.name, status: p.status, bandId: p.bandId ?? selectedBand?.id ?? 0 });
                setShowEdit(p);
              }}
              onDelete={handleDelete}
            />
          </div>
          {/* ARCHIVED PROJECTS */}
          <div>
            <h2 className="text-2xl mb-4">Archived Projects</h2>
            <ProjectListComponent
              projects={projects}
              state="archived"
              onEdit={(p) => {
                setEditForm({ name: p.name, status: p.status, bandId: p.bandId ?? selectedBand?.id ?? 0 });
                setShowEdit(p);
              }}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}
      {showCreate && selectedBand && (
        <ProjectModalComponent
          open={showCreate}
          form={createForm}
          bandName={selectedBand.name}
          onFormChange={setCreateForm}
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          onCreate={async () => {
            setCreateLoading(true);
            setCreateError(null);
            try {
              const res = await fetch('/api/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...createForm, bandId: selectedBand.id, ownerId: currentUserId }),
              });
              if (!res.ok) {
                const err = await res.json();
                setCreateError(err.error || 'Failed to create project');
              } else {
                setShowCreate(false);
                setCreateForm({ name: '', status: 'open', bandId: selectedBand.id });
                // Optionally refresh projects
                (async () => {
                  const newProject = await res.json();
                  setProjects((prev) => [...prev, newProject]);
                })();
              }
            } finally {
              setCreateLoading(false);
            }
          }}
          loading={createLoading}
          error={createError}
          mode="create"
        />
      )}
      {showEdit && (
        <ProjectModalComponent
          open={!!showEdit}
          form={editForm}
          bandName={selectedBand?.name || ''}
          onFormChange={setEditForm}
          onClose={() => { setShowEdit(null); setEditError(null); }}
          onCreate={async () => {
            setEditLoading(true);
            setEditError(null);
            try {
              const res = await fetch(`/api/project/${showEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, bandId: editForm.bandId, ownerId: currentUserId }),
              });
              if (!res.ok) {
                const err = await res.json();
                setEditError(err.error || 'Failed to update project');
              } else {
                setShowEdit(null);
                setEditForm({ name: '', status: 'open', bandId: selectedBand?.id || 0 });
                // Optionally refresh projects
                (async () => {
                  const updatedProject = await res.json();
                  setProjects((prev) => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
                })();
              }
            } finally {
              setEditLoading(false);
            }
          }}
          loading={editLoading}
          error={editError}
          mode="edit"
        />
      )}
    </div>
  );
}

