"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

interface Comment {
  id: number;
  text: string;
  time?: number;
  user?: { username: string };
  createdAt?: string;
}

interface Media {
  type: "audio" | "video" | "image";
  id: number;
  projectId: number;
  filePath: string;
  title: string;
  uploadDate: string;
}

interface RegionPlugin {
  clear: () => void;
  addRegion: (region: {
    start: number;
    end: number;
    color: string;
    drag: boolean;
    resize: boolean;
  }) => void;
}

export default function MediaPage() {
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const mediaId = Array.isArray(params.mediaId) ? params.mediaId[0] : params.mediaId;

  const [media, setMedia] = useState<Media | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [projectStatus, setProjectStatus] = useState<'open' | 'released' | 'archived'>('open');
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fetch media, comments, and project status
  useEffect(() => {
    async function fetchData() {
      const [mediaRes, commentsRes, projectRes] = await Promise.all([
        fetch(`/api/project/${projectId}/media/${mediaId}`),
        fetch(`/api/project/${projectId}/media/${mediaId}/comment`),
        fetch(`/api/project/${projectId}`),
      ]);
      if (mediaRes.ok) setMedia(await mediaRes.json());
      if (commentsRes.ok) setComments(await commentsRes.json());
      if (projectRes.ok) {
        const project = await projectRes.json();
        setProjectStatus(project.status);
        setProjectName(project.name);
      }
    }
    fetchData();
  }, [projectId, mediaId]);

  // Fetch waveform peaks for audio
  useEffect(() => {
    if (!media || media.type !== 'audio') return;
    let isMounted = true;
    async function fetchPeaks() {
      try {
        if (!media) return;
        const res = await fetch(`/api/project/${projectId}/media/waveform?file=${encodeURIComponent(media.filePath)}`);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const decoded = decodeDatFile(buffer);
        if (isMounted) setPeaks(decoded);
      } catch {}
    }
    fetchPeaks();
    return () => { isMounted = false; };
  }, [media, projectId]);

  // Setup wavesurfer for audio
  useEffect(() => {
    if (media?.type !== 'audio' || !waveformRef.current || !peaks || !media) return;
    const audioUrl = `/api/project/${projectId}/media/audio?file=${encodeURIComponent(media.filePath)}`;
    let peaksOption: number[][];
    if (Array.isArray(peaks[0])) {
      // @ts-expect-error: peaks may be number[] or number[][], we handle both cases
      peaksOption = peaks as number[][];
    } else {
      peaksOption = [peaks as unknown as number[]];
    }
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
  }, [media, peaks, projectId, duration]);

  // Add comment markers as regions
  useEffect(() => {
    const ws = wavesurferRef.current;
    const plugins = ws?.getActivePlugins?.();
    const regions = plugins && Array.isArray(plugins)
      ? plugins.find((p) => p && p.constructor && p.constructor.name === 'RegionsPlugin')
      : undefined;
    if (!ws || !regions) return;
    (regions as unknown as RegionPlugin).clear();
    (comments || []).forEach((comment) => {
      if (comment.time !== undefined && comment.time !== null) {
        (regions as unknown as RegionPlugin).addRegion({
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
    if (media?.type === 'audio' && wavesurferRef.current) {
      wavesurferRef.current.playPause();
    } else if (media?.type === 'video' && videoRef.current) {
      if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
      else { videoRef.current.pause(); setIsPlaying(false); }
    }
  };
  const handleStop = () => {
    if (media?.type === 'audio' && wavesurferRef.current) {
      wavesurferRef.current.stop();
      setIsPlaying(false);
    } else if (media?.type === 'video' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };
  const handleDownload = () => {
    if (!media) return;
    const url = `/api/project/${projectId}/media/audio?file=${encodeURIComponent(media.filePath)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = media.filePath;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleDelete = () => setShowConfirm(true);
  const confirmDelete = async () => {
    setShowConfirm(false);
    await fetch(`/api/project/${projectId}/media/${mediaId}`, { method: 'DELETE' });
    router.push(`/project/${projectId}`);
  };
  const cancelDelete = () => setShowConfirm(false);
  const handleSeekToTime = (time?: number) => {
    if (typeof time !== 'number') return;
    if (media?.type === 'audio' && wavesurferRef.current) {
      wavesurferRef.current.setTime(time);
    } else if (media?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };
  const handleAddCommentWithTime = async () => {
    if (commentLoading || !media) return;
    let time = null;
    if (media?.type === 'audio' && wavesurferRef.current && typeof wavesurferRef.current.getCurrentTime === 'function') {
      time = wavesurferRef.current.getCurrentTime();
    } else if (media?.type === 'video' && videoRef.current) {
      time = videoRef.current.currentTime;
    }
    setCommentLoading(true);
    await fetch(`/api/project/${projectId}/media/${mediaId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentInput, time }),
    });
    setCommentInput('');
    setCommentLoading(false);
    // Refresh comments
    const commentsRes = await fetch(`/api/project/${projectId}/media/${mediaId}/comment`);
    if (commentsRes.ok) setComments(await commentsRes.json());
  };
  const handleCommentInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !commentLoading) {
      e.preventDefault();
      handleAddCommentWithTime();
    }
  };
  const handleShare = async () => {
    const link = `${window.location.origin}/project/${projectId}/media/${mediaId}`;
    await navigator.clipboard.writeText(link);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  useEffect(() => {
    fetch('/api/auth/session').then(res => setIsLoggedIn(res.ok));
  }, []);

  if (!media) return <div className="bg-zinc-400 min-h-screen w-full p-8">Loading...</div>;

  return (
    <div className="bg-zinc-400 min-h-screen w-full p-8">
      <BreadcrumbNavigationComponent
        projectId={projectId}
        projectName={projectName}
        mediaId={mediaId}
        mediaTitle={media?.title}
      />
      <div className="bg-zinc-300 max-w-2xl mx-auto p-8 shadow-md relative">
        {/* Top right buttons */}
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button
            onClick={handleDownload}
            className="p-1 rounded bg-indigo-500 hover:bg-indigo-700 text-white"
            title={isLoggedIn ? 'Download media' : 'Sign in to download'}
            disabled={!isLoggedIn}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </button>
          <button
            onClick={handleShare}
            className="p-1 rounded bg-indigo-500 hover:bg-indigo-700 text-white"
            title="Copy link to media details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7h2a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2h2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V3m0 0l-3.5 3.5M12 3l3.5 3.5" />
            </svg>
          </button>
          <button
            onClick={projectStatus === 'open' ? handleDelete : undefined}
            className={`p-1 rounded ${projectStatus === 'open' ? 'bg-red-500 hover:bg-red-700 text-white' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}
            title={projectStatus === 'open' ? 'Delete media' : 'Delete only available for open projects'}
            aria-label="Delete Media"
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
        <h1 className="text-2xl mb-2">{media.title}</h1>
        <div className="text-gray-500 text-sm mb-2">Uploaded: {media.uploadDate ? new Date(media.uploadDate).toLocaleString() : ''}</div>
        <div className="mb-4">
          {media.type === 'audio' ? (
            <div ref={waveformRef} className="w-full min-w-0" />
          ) : (
            <video ref={videoRef} className="w-full" controls>
              <source src={`/api/project/${projectId}/media/audio?file=${encodeURIComponent(media.filePath)}`} />
            </video>
          )}
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
              <div className="mb-4 text-gray-700">This will delete the media and all associated comments. This action cannot be undone.</div>
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
            {(comments || []).map((comment) => (
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
                <span className="text-xs text-gray-400 ml-2">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={handleCommentInputKeyDown}
              className="border rounded px-2 py-1 w-full"
              placeholder={isLoggedIn ? 'Add a comment...' : 'Sign in to comment'}
              disabled={!isLoggedIn || commentLoading}
            />
            <button
              onClick={handleAddCommentWithTime}
              className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded disabled:bg-gray-400"
              disabled={!isLoggedIn || commentLoading}
              title={isLoggedIn ? 'Add comment' : 'Sign in to comment'}
            >
              {commentLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
