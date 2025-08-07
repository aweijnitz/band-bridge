"use client";
import React from 'react';
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

interface ImageGalleryModalProps {
  images: ImageItem[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export default function ImageGalleryModal({ images, isOpen, onClose, initialIndex = 0 }: ImageGalleryModalProps) {
  if (!isOpen || images.length === 0) return null;

  // Convert images to react-image-gallery format
  const galleryImages = images.map((image) => ({
    original: `/api/project/${image.id}/media/file?file=${image.filePath}`,
    thumbnail: `/api/project/${image.id}/media/file?file=${image.filePath}_thumb.jpg`,
    description: image.title + (image.description ? ` - ${image.description}` : ''),
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-6xl max-h-screen p-4">
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