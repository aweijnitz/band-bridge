import React, { useEffect, useRef } from 'react';

const PROJECT_STATUS = ["open", "released", "archived"] as const;
type ProjectStatus = typeof PROJECT_STATUS[number];

type ProjectModalComponentProps = {
  open: boolean;
  form: { name: string; owner: string; status: ProjectStatus };
  bandName: string;
  onFormChange: (form: { name: string; owner: string; status: ProjectStatus }) => void;
  onClose: () => void;
  onCreate: () => void;
  loading?: boolean;
  error?: string | null;
  mode?: 'create' | 'edit';
};

export default function ProjectModalComponent({ open, form, bandName, onFormChange, onClose, onCreate, loading, error, mode = 'create' }: ProjectModalComponentProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Edit Project' : 'Create Project'}</h2>
        {error && <div className="mb-2 text-red-600">{error}</div>}
        <div className="w-full mb-2 px-2 py-1 text-gray-700">Band: {bandName}</div>
        <input
          ref={nameInputRef}
          className="w-full mb-2 border rounded px-2 py-1"
          placeholder="Project Name"
          value={form.name}
          onChange={e => onFormChange({ ...form, name: e.target.value })}
        />
        <input
          className="w-full mb-2 border rounded px-2 py-1"
          placeholder="Created by"
          value={form.owner}
          onChange={e => onFormChange({ ...form, owner: e.target.value })}
        />
        <select
          className="w-full mb-4 border rounded px-2 py-1"
          value={form.status}
          onChange={e => onFormChange({ ...form, status: e.target.value as ProjectStatus })}
        >
          {PROJECT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={onCreate} className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>
            {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
} 