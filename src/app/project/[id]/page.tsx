"use client";

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SongListItemComponent from './SongListItemComponent';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [songId: number]: any[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [songId: number]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [songId: number]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/project/${id}`)
      .then(res => res.json())
      .then(data => setProject(data))
      .catch(() => setProject(null));
    fetch(`/api/project/${id}/song`)
      .then(res => res.json())
      .then(data => {
        setSongs(data);
        // Fetch comments for each song
        data.forEach((song: any) => {
          fetch(`/api/project/${id}/song/${song.id}/comment`)
            .then(res => res.json())
            .then(commentsData => setComments(prev => ({ ...prev, [song.id]: commentsData })));
        });
      })
      .catch(() => setError('Failed to load songs'))
      .finally(() => setLoading(false));
  }, [id]);

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
      const newSong = await res.json();
      setSongs((prev) => [newSong, ...prev]);
      // Fetch comments for the new song
      fetch(`/api/project/${id}/song/${newSong.id}/comment`)
        .then(res => res.json())
        .then(commentsData => setComments(prev => ({ ...prev, [newSong.id]: commentsData })));
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

  const handleAddComment = async (songId: number) => {
    if (!commentInputs[songId]) return;
    setCommentLoading((prev) => ({ ...prev, [songId]: true }));
    const res = await fetch(`/api/project/${id}/song/${songId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentInputs[songId] }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => ({ ...prev, [songId]: [...(prev[songId] || []), newComment] }));
      setCommentInputs((prev) => ({ ...prev, [songId]: '' }));
    }
    setCommentLoading((prev) => ({ ...prev, [songId]: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="list-reset flex items-center gap-2">
          <li>
            <Link href="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li className="text-gray-800 font-semibold">Project #{id}</li>
        </ol>
      </nav>
      <h1 className="text-3xl font-bold mb-6">{project ? project.name : `Project #${id}`}</h1>
      <div className="mb-8">
        <label className="block mb-2 font-semibold">Upload new song</label>
        <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
          {uploading ? 'Uploading...' : 'Select File'}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
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
              onCommentInputChange={handleCommentChange}
              commentLoading={commentLoading[song.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
} 