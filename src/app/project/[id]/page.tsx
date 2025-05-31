"use client";

import { useEffect, useRef, useState } from 'react';
import BreadcrumbNavigationComponent from '../../components/BreadcrumbNavigationComponent';
import SongListItemComponent from './SongListItemComponent';
import LoginFormComponent from "../../components/LoginFormComponent";
import { useParams } from 'next/navigation';

interface Song {
  id: number;
  projectId: number;
  filePath: string;
  title: string;
  uploadDate: string;
}

interface Comment {
  id: number;
  text: string;
  time?: number;
  user?: { username: string };
  createdAt?: string;
}

interface Project {
  id: number;
  name: string;
  status: 'open' | 'released' | 'archived';
}

// Helper type guards
function isSong(obj: unknown): obj is Song {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    typeof o.projectId === 'number' &&
    typeof o.filePath === 'string' &&
    typeof o.title === 'string' &&
    typeof o.uploadDate === 'string'
  );
}
function isComment(obj: unknown): obj is Comment {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    typeof o.text === 'string'
  );
}
function normalizeComment(raw: unknown): Comment {
  if (!isComment(raw)) throw new Error('Invalid comment');
  const o = raw as unknown as Record<string, unknown>;
  const userRaw = o.user;
  let user: { username: string } | undefined = undefined;
  if (typeof userRaw === 'object' && userRaw !== null && 'username' in (userRaw as Record<string, unknown>) && typeof (userRaw as Record<string, unknown>).username === 'string') {
    user = { username: (userRaw as Record<string, unknown>).username as string };
  } else if (typeof userRaw === 'string') {
    user = { username: userRaw };
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return {
    id: o.id as number,
    text: o.text as string,
    time: o.time as number | undefined,
    user,
    createdAt: o.createdAt as string | undefined,
  };
}
function normalizeSong(raw: unknown): Song {
  if (!isSong(raw)) throw new Error('Invalid song');
  return raw as Song;
}

export default function ProjectPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [songId: number]: Comment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [songId: number]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [songId: number]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/session').then(res => {
      if (!res.ok) {
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    });
  }, [id]);

  useEffect(() => {
    if (isLoggedIn !== true) return;

    fetch(`/api/project/${id}`)
      .then(res => {
        if (!res.ok) {
          setProject(null);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setProject(data);
      })
      .catch(() => setProject(null));

    fetch(`/api/project/${id}/song`)
      .then(res => {
        if (!res.ok) {
          setError('Failed to load songs');
          return null;
        }
        return res.json();
      })
      .then((data: unknown[]) => {
        if (!data) return;
        setSongs(data.filter(isSong).map(normalizeSong));
        // Fetch comments for each song
        data.filter(isSong).forEach((song) => {
          fetch(`/api/project/${id}/song/${song.id}/comment`)
            .then(res => {
              if (!res.ok) return [];
              return res.json();
            })
            .then((commentsData: unknown[]) => setComments(prev => ({
              ...prev,
              [song.id]: commentsData.filter(isComment).map(normalizeComment),
            })));
        });
      })
      .catch(() => setError('Failed to load songs'))
      .finally(() => setLoading(false));
  }, [id, isLoggedIn]);

  if (isLoggedIn === false) {
    return <LoginFormComponent redirect={`/project/${id}`} />;
  }
  if (isLoggedIn === null) {
    return null;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/project/${id}/song`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const newSongRaw = await res.json();
      if (isSong(newSongRaw)) {
        setSongs((prev) => [normalizeSong(newSongRaw), ...prev]);
        // Fetch comments for the new song
        fetch(`/api/project/${id}/song/${newSongRaw.id}/comment`)
          .then(res => res.json())
          .then((commentsData: unknown[]) => setComments(prev => ({
            ...prev,
            [newSongRaw.id]: commentsData.filter(isComment).map(normalizeComment),
          })));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to upload song');
    }
    setUploading(false);
  };

  const handleCommentChange = (songId: number, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [songId]: value }));
  };

  const handleAddComment = async (songId: number, text: string, time: number | null) => {
    const commentValue = text !== undefined ? text : commentInputs[songId];
    if (!commentValue) return;
    setCommentLoading((prev) => ({ ...prev, [songId]: true }));
    const res = await fetch(`/api/project/${id}/song/${songId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentValue, time }),
    });
    if (res.ok) {
      const newCommentRaw = await res.json();
      if (isComment(newCommentRaw)) {
        setComments((prev) => ({
          ...prev,
          [songId]: [...(prev[songId] || []), normalizeComment(newCommentRaw)],
        }));
        setCommentInputs((prev) => ({ ...prev, [songId]: '' }));
      }
    }
    setCommentLoading((prev) => ({ ...prev, [songId]: false }));
  };

  const handleDeleteSong = async (songId: number) => {
    setError(null);
    const res = await fetch(`/api/project/${id}/song/${songId}`, { method: 'DELETE' });
    if (res.ok) {
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[songId];
        return newComments;
      });
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to delete song');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-400 p-8">
      <BreadcrumbNavigationComponent projectId={id} projectName={project?.name} />
      <h1 className="text-2xl mb-6">{project ? project.name : `Project #${id}`}</h1>
      <div className="mb-8">
        <label className="block mb-2 font-semibold">
          {project?.status !== 'open' ? 'Project not open' : 'Upload new song'}
        </label>
        <label
          className={`inline-block px-4 py-2 rounded ${project?.status === 'open' && isLoggedIn ? 'bg-indigo-600 text-white hover:bg-blue-700 cursor-pointer' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
          title={isLoggedIn ? (project?.status === 'open' ? 'Upload new song' : 'Project not open') : 'Sign in to upload'}
        >
          {uploading ? 'Uploading...' : 'Select File'}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || project?.status !== 'open' || !isLoggedIn}
          />
        </label>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : songs.length === 0 ? (
        <div className="text-gray-600">No songs in this project yet.</div>
      ) : (
        <div className="space-y-8">
          {songs.map((song) => (
            <SongListItemComponent
              key={song.id}
              song={song}
              comments={comments[song.id]}
              onAddComment={handleAddComment}
              commentInput={commentInputs[song.id]}
              onCommentInputChange={(e) => handleCommentChange(song.id, e.target.value)}
              commentLoading={commentLoading[song.id]}
              onDeleteSong={handleDeleteSong}
            />
          ))}
        </div>
      )}
    </div>
  );
}

