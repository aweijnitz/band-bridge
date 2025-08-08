"use client";
import React, { useEffect, useState } from 'react';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

export interface ImageItem {
  id: number;
  mediaId: number;
  title: string;
  description?: string;
  filePath: string;
  uploadDate: string;
}

interface GalleryComment {
  id: number;
  text: string;
  user?: { username: string };
  createdAt?: string;
}

interface ImageGalleryModalProps {
  images: ImageItem[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export default function ImageGalleryModal({ images, isOpen, onClose, initialIndex = 0 }: ImageGalleryModalProps) {
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const projectId = images.length > 0 ? images[0].id : null;

  useEffect(() => {
    if (isOpen && projectId) {
      fetchComments();
    }
  }, [isOpen, projectId]);

  const fetchComments = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/project/${projectId}/gallery/comment`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch gallery comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !projectId) return;
    
    setCommentLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/gallery/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentInput }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments(prev => [...prev, newComment]);
        setCommentInput('');
      }
    } catch (error) {
      console.error('Failed to add gallery comment:', error);
    }
    setCommentLoading(false);
  };

  if (!isOpen || images.length === 0) return null;

  // Convert images to react-image-gallery format
  const galleryImages = images.map((image) => ({
    original: `/api/project/${image.id}/media/file?file=${image.filePath}`,
    thumbnail: `/api/project/${image.id}/media/file?file=${image.filePath}_thumb.jpg`,
    description: image.title + (image.description ? ` - ${image.description}` : ''),
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-7xl max-h-screen p-4 flex">
        {/* Main Gallery */}
        <div className="flex-1 relative mr-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all"
          >
            ✕
          </button>
          
          {/* Gallery */}
          <div className="h-full">
            <ImageGallery
              items={galleryImages}
              startIndex={initialIndex}
              showPlayButton={false}
              showThumbnails={images.length > 1}
              showNav={images.length > 1}
              showBullets={images.length > 1}
              showFullscreenButton={true}
              useBrowserFullscreen={true}
              autoPlay={false}
              lazyLoad={true}
            />
          </div>
        </div>

        {/* Comments Sidebar */}
        <div className="w-80 bg-black bg-opacity-75 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Gallery Comments</h3>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-sm text-gray-300 hover:text-white"
            >
              {showComments ? 'Hide' : 'Show'}
            </button>
          </div>

          {showComments && (
            <>
              {/* Comments List */}
              <div className="max-h-80 overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-gray-400 text-sm">No comments yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="mb-3 p-2 bg-black bg-opacity-50 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-blue-300">
                          {comment.user?.username || 'Unknown'}
                        </span>
                        {comment.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-200">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t border-gray-600 pt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-black bg-opacity-50 text-white border border-gray-600 rounded text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={commentLoading || !commentInput.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {commentLoading ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface ImageThumbnailProps {
  image: ImageItem;
  onClick: () => void;
}

export function ImageThumbnail({ image, onClick }: ImageThumbnailProps) {
  return (
    <div 
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <img
        src={`/api/project/${image.id}/media/file?file=${image.filePath}_thumb.jpg`}
        alt={image.title}
        className="w-64 h-64 object-cover rounded-lg shadow-md"
        onError={(e) => {
          // Fallback to original image if thumbnail fails
          (e.target as HTMLImageElement).src = `/api/project/${image.id}/media/file?file=${image.filePath}`;
        }}
      />
      <div className="mt-2">
        <h3 className="font-medium text-gray-900 truncate">{image.title}</h3>
        {image.description && (
          <p className="text-sm text-gray-600 truncate">{image.description}</p>
        )}
      </div>
    </div>
  );
}