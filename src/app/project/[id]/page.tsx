"use client";

import { useEffect, useState } from 'react';
import BreadcrumbNavigationComponent from '../../components/BreadcrumbNavigationComponent';
import MediaListItemComponent from './MediaListItemComponent';
import MediaUploadModal from './MediaUploadModal';
import LoginFormComponent from "../../components/LoginFormComponent";
import { useParams } from 'next/navigation';

interface Media {
  id: number;
  projectId: number;
  filePath: string;
  title: string;
  description?: string;
  uploadDate: string;
  type: 'audio' | 'video' | 'image';
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
  description?: string;
  status: 'open' | 'released' | 'archived';
}

// Helper type guards
function isMedia(obj: unknown): obj is Media {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    typeof o.projectId === 'number' &&
    typeof o.filePath === 'string' &&
    typeof o.title === 'string' &&
    typeof o.uploadDate === 'string' &&
    typeof o.type === 'string'
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
function normalizeMedia(raw: unknown): Media {
  if (!isMedia(raw)) throw new Error('Invalid media');
  return raw as Media;
}

export default function ProjectPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [mediaId: number]: Comment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [mediaId: number]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [mediaId: number]: boolean }>({});
  const [project, setProject] = useState<Project | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

    fetch(`/api/project/${id}/media`)
      .then(res => {
        if (!res.ok) {
          setError('Failed to load media');
          return null;
        }
        return res.json();
      })
      .then((data: unknown[]) => {
        if (!data) return;
        setMediaList(data.filter(isMedia).map(normalizeMedia));
        // Fetch comments for each media
        data.filter(isMedia).forEach((media) => {
          fetch(`/api/project/${id}/media/${media.id}/comment`)
            .then(res => {
              if (!res.ok) return [];
              return res.json();
            })
            .then((commentsData: unknown[]) => setComments(prev => ({
              ...prev,
              [media.id]: commentsData.filter(isComment).map(normalizeComment),
            })));
        });
      })
      .catch(() => setError('Failed to load media'))
      .finally(() => setLoading(false));
  }, [id, isLoggedIn]);

  if (isLoggedIn === false) {
    return <LoginFormComponent redirect={`/project/${id}`} />;
  }
  if (isLoggedIn === null) {
    return null;
  }

  const handleUpload = async (file: File, description: string) => {
    setError(null);
    setUploadError(null);
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    const res = await fetch(`/api/project/${id}/media`, {
      method: 'POST',
      body: formData,
    });
    
    if (res.ok) {
      const newMediaRaw = await res.json();
      if (isMedia(newMediaRaw)) {
        setMediaList((prev) => [normalizeMedia(newMediaRaw), ...prev]);
        // Fetch comments for the new media
        fetch(`/api/project/${id}/media/${newMediaRaw.id}/comment`)
          .then(res => res.json())
          .then((commentsData: unknown[]) => setComments(prev => ({
            ...prev,
            [newMediaRaw.id]: commentsData.filter(isComment).map(normalizeComment),
          })));
      }
      setShowUploadModal(false);
    } else {
      const err = await res.json();
      setUploadError(err.error || 'Failed to upload media');
    }
    setUploading(false);
  };

  const handleCommentChange = (mediaId: number, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [mediaId]: value }));
  };

  const handleAddComment = async (mediaId: number, text: string, time: number | null) => {
    const commentValue = text !== undefined ? text : commentInputs[mediaId];
    if (!commentValue) return;
    setCommentLoading((prev) => ({ ...prev, [mediaId]: true }));
    const res = await fetch(`/api/project/${id}/media/${mediaId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentValue, time }),
    });
    if (res.ok) {
      const newCommentRaw = await res.json();
      if (isComment(newCommentRaw)) {
        setComments((prev) => ({
          ...prev,
          [mediaId]: [...(prev[mediaId] || []), normalizeComment(newCommentRaw)],
        }));
        setCommentInputs((prev) => ({ ...prev, [mediaId]: '' }));
      }
    }
    setCommentLoading((prev) => ({ ...prev, [mediaId]: false }));
  };

  const handleDeleteMedia = async (mediaId: number) => {
    setError(null);
    const res = await fetch(`/api/project/${id}/media/${mediaId}`, { method: 'DELETE' });
    if (res.ok) {
      setMediaList((prev) => prev.filter((s) => s.id !== mediaId));
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[mediaId];
        return newComments;
      });
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to delete media');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-400 p-8">
      <BreadcrumbNavigationComponent projectId={id} projectName={project?.name} />
      <h1 className="text-2xl mb-6">{project ? project.name : `Project #${id}`}</h1>
      <div className="mb-8">
        <label className="block mb-2 font-semibold">
          {project?.status !== 'open' ? 'Project not open' : 'Upload new media'}
        </label>
        <button
          onClick={() => setShowUploadModal(true)}
          className={`px-4 py-2 rounded ${project?.status === 'open' && isLoggedIn ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
          disabled={uploading || project?.status !== 'open' || !isLoggedIn}
          title={isLoggedIn ? (project?.status === 'open' ? 'Upload new media' : 'Project not open') : 'Sign in to upload'}
        >
          {uploading ? 'Uploading...' : 'Upload Media'}
        </button>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : mediaList.length === 0 ? (
        <div className="text-gray-600">No media in this project yet.</div>
      ) : (
        <div className="space-y-8">
          {mediaList.map((media) => (
            <MediaListItemComponent
              key={media.id}
              media={media}
              comments={comments[media.id]}
              onAddComment={handleAddComment}
              commentInput={commentInputs[media.id]}
              onCommentInputChange={(e) => handleCommentChange(media.id, e.target.value)}
              commentLoading={commentLoading[media.id]}
              onDeleteMedia={handleDeleteMedia}
            />
          ))}
        </div>
      )}

      <MediaUploadModal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadError(null);
        }}
        onUpload={handleUpload}
        loading={uploading}
        error={uploadError}
      />
    </div>
  );
}

