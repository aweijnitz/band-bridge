import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongListItemComponent({ song, comments, onAddComment, commentInput, onCommentInputChange, commentLoading, projectStatus, onDelete }: any) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Setup wavesurfer with Hover and Regions plugins
  useEffect(() => {
    if (!waveformRef.current) return;
    // Use API proxy endpoint for audio file
    const audioUrl = `/api/project/${song.projectId}/song/audio?file=${encodeURIComponent(song.filePath)}`;
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#60a5fa',
      progressColor: '#2563eb',
      height: 64,
      barWidth: 2,
      barGap: 2,
      cursorColor: '#222',
      url: audioUrl,
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
    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.filePath, song.projectId]);

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
    if (!wavesurferRef.current) return;
    if (commentLoading) return;
    const time = wavesurferRef.current.getCurrentTime();
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

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-semibold mb-2">{song.title}</h2>
      <div className="text-gray-500 text-sm mb-2">Uploaded: {new Date(song.uploadDate).toLocaleString()}</div>
      <div className="mb-2">
        <div ref={waveformRef} className="w-full min-w-0" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handlePlayPause}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center justify-center"
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
        {projectStatus === 'archived' && (
          <button
            onClick={() => onDelete && onDelete(song.id)}
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center justify-center"
            aria-label="Delete Song"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Comments</h3>
        <ul className="mb-2">
          {(comments || []).map((comment: any) => (
            <li key={comment.id} className="border-b last:border-b-0 py-1 text-gray-700 flex justify-between items-center">
              <span>
                {comment.time !== undefined && comment.time !== null && (
                  <button
                    type="button"
                    className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs font-mono mr-2 hover:bg-blue-200 focus:outline-none"
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
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            disabled={commentLoading}
          >
            {commentLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
} 