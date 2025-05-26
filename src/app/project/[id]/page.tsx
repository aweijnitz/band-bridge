"use client";

import { use, useState } from 'react';
import Link from 'next/link';

const mockSongs = [
  {
    id: 1,
    title: 'Song One',
    url: '/mock/song1.mp3',
    comments: [
      { id: 1, text: 'Great intro!' },
      { id: 2, text: 'Love the guitar.' },
    ],
  },
  {
    id: 2,
    title: 'Song Two',
    url: '/mock/song2.mp3',
    comments: [
      { id: 1, text: 'Nice vocals.' },
    ],
  },
];

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [songs, setSongs] = useState(mockSongs);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});

  const handleCommentChange = (songId: number, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [songId]: value }));
  };

  const handleAddComment = (songId: number) => {
    if (!commentInputs[songId]) return;
    setSongs((prev) =>
      prev.map((song) =>
        song.id === songId
          ? {
              ...song,
              comments: [
                ...song.comments,
                { id: song.comments.length + 1, text: commentInputs[songId] },
              ],
            }
          : song
      )
    );
    setCommentInputs((prev) => ({ ...prev, [songId]: '' }));
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
      <h1 className="text-3xl font-bold mb-6">Project #{id}</h1>
      <div className="mb-8">
        <label className="block mb-2 font-semibold">Upload new song</label>
        <input type="file" accept="audio/mp3,audio/wav" className="block" />
      </div>
      <div className="space-y-8">
        {songs.map((song) => (
          <div key={song.id} className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-2">{song.title}</h2>
            <audio controls src={song.url} className="w-full mb-4" />
            <div>
              <h3 className="font-semibold mb-2">Comments</h3>
              <ul className="mb-2">
                {song.comments.map((comment) => (
                  <li key={comment.id} className="border-b last:border-b-0 py-1 text-gray-700">{comment.text}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentInputs[song.id] || ''}
                  onChange={(e) => handleCommentChange(song.id, e.target.value)}
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="Add a comment..."
                />
                <button
                  onClick={() => handleAddComment(song.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 