"use client";
import React, { useEffect, useRef, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import BreadcrumbNavigationComponent from '../../../../components/BreadcrumbNavigationComponent';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function decodeDatFile(buffer: ArrayBuffer): number[] {
  const floatArray = new Float32Array(buffer);
  return Array.from(floatArray);
}

export default function SongPage({ params }: { params: Promise<{ id: string; songId: string }> }) {
  const { id: projectId, songId } = use(params);
  const [song, setSong] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [projectStatus, setProjectStatus] = useState<'open' | 'released' | 'archived'>('open');
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  // Fetch song, comments, and project status
  useEffect(() => {
    async function fetchData() {
      const [songRes, commentsRes, projectRes] = await Promise.all([
        fetch(`/api/project/${projectId}/song/${songId}`),
        fetch(`/api/project/${projectId}/song/${songId}/comment`),
        fetch(`/api/project/${projectId}`),
      ]);
      if (songRes.ok) setSong(await songRes.json());
      if (commentsRes.ok) setComments(await commentsRes.json());
      if (projectRes.ok) {
        const project = await projectRes.json();
        setProjectStatus(project.status);
        setProjectName(project.name);
      }
    }
    fetchData();
  }, [projectId, songId]);

  // Fetch waveform peaks
  useEffect(() => {
    if (!song) return;
    let isMounted = true;
    async function fetchPeaks() {
      try {
        const res = await fetch(`/api/project/${projectId}/song/waveform?file=${encodeURIComponent(song.filePath)}`);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const decoded = decodeDatFile(buffer);
        if (isMounted) setPeaks(decoded);
      } catch {}
    }
    fetchPeaks();
    return () => { isMounted = false; };
  }, [song, projectId]);

  // Setup wavesurfer
  useEffect(() => {
    if (!waveformRef.current || !peaks || !song) return;
    const audioUrl = `/api/project/${projectId}/song/audio?file=${encodeURIComponent(song.filePath)}`;
    const peaksShape = Array.isArray(peaks[0]) ? '2D' : '1D';
    let peaksOption: any = peaks;
    if (peaksShape === '1D') peaksOption = [peaks];
    const usedDuration = duration || 30;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#606070',
      progressColor: '#202030',
      cursorColor: '#0a0a0c',
      height: 64,
      minPxPerSec: 2,
      url: audioUrl,
      peaks: peaksOption,
      duration: usedDuration,
      plugins: [
        Hover.create({ lineColor: '#f59e42', labelBackground: '#fff', labelColor: '#222' }),
        Regions.create(),
      ],
    });
    wavesurferRef.current = ws;
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('decode', (dur: number) => setDuration(dur));
    // Add a passive wheel event listener to suppress Chrome warning
    const el = waveformRef.current;
    if (el) {
      const noop = () => {};
      el.addEventListener('wheel', noop, { passive: true });
    }
    return () => { ws.destroy(); wavesurferRef.current = null; };
  }, [song, peaks, projectId]);

  // Add comment markers as regions
  useEffect(() => {
    const ws = wavesurferRef.current;
    const plugins = ws?.getActivePlugins?.();
    const regions = plugins && Array.isArray(plugins)
      ? (plugins.find((p: any) => p && p.constructor && p.constructor.name === 'RegionsPlugin') as any)
      : undefined;
    if (!ws || !regions) return;
    regions.clear();
    (comments || []).forEach((comment: any) => {
      if (comment.time !== undefined && comment.time !== null) {
        regions.addRegion({
          start: comment.time,
          end: comment.time + 0.1,
          color: 'rgba(59,130,246,0.5)',
          drag: false,
          resize: false,
        });
      }
    });
  }, [comments]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) wavesurferRef.current.playPause();
  };
  const handleStop = () => {
    if (wavesurferRef.current) { wavesurferRef.current.stop(); setIsPlaying(false); }
  };
  const handleDownload = () => {
    if (!song) return;
    const url = `/api/project/${projectId}/song/audio?file=${encodeURIComponent(song.filePath)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = song.filePath;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleDelete = () => setShowConfirm(true);
  const confirmDelete = async () => {
    setShowConfirm(false);
    await fetch(`/api/project/${projectId}/song/${songId}`, { method: 'DELETE' });
    router.push(`/project/${projectId}`);
  };
  const cancelDelete = () => setShowConfirm(false);
  const handleSeekToTime = (time: number) => {
    if (wavesurferRef.current) wavesurferRef.current.setTime(time);
  };
  const handleAddCommentWithTime = async () => {
    if (commentLoading || !song) return;
    let time = null;
    if (wavesurferRef.current && typeof wavesurferRef.current.getCurrentTime === 'function') {
      time = wavesurferRef.current.getCurrentTime();
    }
    setCommentLoading(true);
    await fetch(`/api/project/${projectId}/song/${songId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentInput, time }),
    });
    setCommentInput('');
    setCommentLoading(false);
    // Refresh comments
    const commentsRes = await fetch(`/api/project/${projectId}/song/${songId}/comment`);
    if (commentsRes.ok) setComments(await commentsRes.json());
  };
  const handleCommentInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !commentLoading) {
      e.preventDefault();
      handleAddCommentWithTime();
    }
  };
  const handleShare = async () => {
    const link = `${window.location.origin}/project/${projectId}/song/${songId}`;
    await navigator.clipboard.writeText(link);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  if (!song) return <div className="bg-zinc-400 min-h-screen w-full p-8">Loading...</div>;

  return (
    <div className="bg-zinc-400 min-h-screen w-full p-8">
      <BreadcrumbNavigationComponent
        projectId={projectId}
        projectName={projectName}
        songId={songId}
        songTitle={song?.title}
      />
      <div className="bg-zinc-300 max-w-2xl mx-auto p-8 shadow-md relative">
        {/* Top right buttons */}
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button
            onClick={handleDownload}
            className="p-1 rounded bg-indigo-500 hover:bg-indigo-700 text-white"
            title="Download song"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </button>
          <button
            onClick={handleShare}
            className="p-1 rounded bg-indigo-500 hover:bg-indigo-700 text-white"
            title="Copy link to song details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7h2a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2h2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V3m0 0l-3.5 3.5M12 3l3.5 3.5" />
            </svg>
          </button>
          <button
            onClick={projectStatus === 'open' ? handleDelete : undefined}
            className={`p-1 rounded ${projectStatus === 'open' ? 'bg-red-500 hover:bg-red-700 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}
            title={projectStatus === 'open' ? 'Delete song' : 'Delete only available for open projects'}
            aria-label="Delete Song"
            disabled={projectStatus !== 'open'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4a1 1 0 011 1v2H9V4a1 1 0 011-1zm-7 4h18" />
            </svg>
          </button>
        </div>
        {showToast && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-indigo-700 text-white px-4 py-2 rounded shadow-lg transition-all duration-300 animate-fade-in-out z-50">
            Link copied to clipboard
          </div>
        )}
        <h1 className="text-2xl mb-2">{song.title}</h1>
        <div className="text-gray-500 text-sm mb-2">Uploaded: {new Date(song.uploadDate).toLocaleString()}</div>
        <div className="mb-4">
          <div ref={waveformRef} className="w-full min-w-0" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handlePlayPause}
            className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 flex items-center justify-center"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polygon points="6,4 20,12 6,20" fill="currentColor"/></svg>
            )}
          </button>
          <button
            onClick={handleStop}
            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 flex items-center justify-center"
            aria-label="Stop"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>
          </button>
        </div>
        {/* Confirmation modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-xs">
              <h2 className="text-lg font-bold mb-4">Are you sure?</h2>
              <div className="mb-4 text-gray-700">This will delete the song and all associated comments. This action cannot be undone.</div>
              <div className="flex gap-2 justify-end">
                <button onClick={cancelDelete} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
              </div>
            </div>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm">Comments</h3>
          <ul className="mb-2">
            {(comments || []).map((comment: any) => (
              <li key={comment.id} className="border-b last:border-b-0 py-1 text-gray-700 flex justify-between items-center">
                <span className='text-sm'>
                  {comment.time !== undefined && comment.time !== null && (
                    <button
                      type="button"
                      className="bg-zinc-200 text-indigo-800 px-1 py-0.5 rounded text-xs font-mono mr-2 hover:bg-blue-200 focus:outline-none"
                      onClick={() => handleSeekToTime(comment.time)}
                    >
                      {formatTime(comment.time)}
                    </button>
                  )}
                  {comment.text}
                </span>
                <span className="text-xs text-gray-400 ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput || ''}
              onChange={e => setCommentInput(e.target.value)}
              className="flex-1 border rounded px-2 py-1"
              placeholder="Add a comment..."
              onKeyDown={handleCommentInputKeyDown}
            />
            <button
              onClick={handleAddCommentWithTime}
              className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              disabled={commentLoading}
            >
              {commentLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 