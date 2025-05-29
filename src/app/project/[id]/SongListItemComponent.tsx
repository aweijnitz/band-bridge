import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function decodeDatFile(buffer: ArrayBuffer): number[] {
  // .dat files from audiowaveform are 32-bit floats, little-endian
  const floatArray = new Float32Array(buffer);
  return Array.from(floatArray);
}

export default function SongListItemComponent({ song, comments, onAddComment, commentInput, onCommentInputChange, commentLoading, projectStatus, onDeleteSong }: any) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const pathname = typeof window !== 'undefined' ? window.location.origin : '';

  // Fetch the precomputed waveform .dat file and decode it
  useEffect(() => {
    let isMounted = true;
    async function fetchPeaks() {
      try {
        const res = await fetch(`/api/project/${song.projectId}/song/waveform?file=${encodeURIComponent(song.filePath)}`);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const decoded = decodeDatFile(buffer);
        if (isMounted) {
          setPeaks(decoded);
        }
      } catch (e) {
        // ignore
      }
    }
    fetchPeaks();
    return () => { isMounted = false; };
  }, [song.filePath, song.projectId]);

  // Setup wavesurfer with precomputed peaks
  useEffect(() => {
    if (!waveformRef.current || !peaks) return;
    // Use API proxy endpoint for audio file
    const audioUrl = `/api/project/${song.projectId}/song/audio?file=${encodeURIComponent(song.filePath)}`;
    // Try both shapes for peaks
    const peaksShape = Array.isArray(peaks[0]) ? '2D' : '1D';
    let peaksOption: any = peaks;
    if (peaksShape === '1D') {
      peaksOption = [peaks];
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
        Hover.create({
          lineColor: '#f59e42',
          labelBackground: '#fff',
          labelColor: '#222',
        }),
        Regions.create(),
      ]
    });
    wavesurferRef.current = ws;
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('decode', (dur: number) => {
      setDuration(dur);
    });
    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.filePath, song.projectId, peaks]);

  // Add comment markers as regions
  useEffect(() => {
    const ws = wavesurferRef.current;
    // Find the regions plugin instance from the active plugins array
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
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleStop = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      setIsPlaying(false);
    }
  };

  // When posting a comment, use the current cursor time
  const handleAddCommentWithTime = async () => {
    if (commentLoading) return;
    let time = null;
    if (wavesurferRef.current && typeof wavesurferRef.current.getCurrentTime === 'function') {
      time = wavesurferRef.current.getCurrentTime();
    }
    await onAddComment(song.id, commentInput, time);
  };

  // Handle Enter key for comment input
  const handleCommentInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !commentLoading) {
      e.preventDefault();
      handleAddCommentWithTime();
    }
  };

  // Seek to a comment's time
  const handleSeekToTime = (time: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(time);
    }
  };

  const handleDownload = () => {
    const url = `/api/project/${song.projectId}/song/audio?file=${encodeURIComponent(song.filePath)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = song.filePath;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/project/${song.projectId}/song/${song.id}`;
    await navigator.clipboard.writeText(link);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setShowConfirm(false);
    if (onDeleteSong) onDeleteSong(song.id);
  };

  const cancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div className="bg-zinc-300 rounded shadow p-6 relative">
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
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-indigo-700 text-white px-4 py-2 rounded shadow-lg transition-all duration-300 animate-fade-in-out z-50">
          Link copied to clipboard
        </div>
      )}
      <h2 className="text-lg mb-2">
        <Link href={`/project/${song.projectId}/song/${song.id}`} className="text-indigo-950 hover:underline">
          {song.title}
        </Link>
      </h2>
      <div className="text-gray-500 text-sm mb-2">Uploaded: {new Date(song.uploadDate).toLocaleString()}</div>
      <div className="mb-2">
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
            onChange={e => onCommentInputChange(song.id, e.target.value)}
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
  );
} 