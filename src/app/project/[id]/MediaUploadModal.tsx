"use client";
import React, { useState, useRef, useEffect } from 'react';
import RichTextEditor from '../../components/RichTextEditor';

interface MediaUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, description: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function MediaUploadModal({ open, onClose, onUpload, loading, error }: MediaUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedFiles([]);
      setDescription('');
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      // For now, upload files one by one. The onUpload callback expects a single file.
      // In a real implementation, you might want to modify the parent component
      // to handle multiple files or upload them sequentially here.
      selectedFiles.forEach(file => {
        onUpload(file, description);
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Upload Media</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,video/mp4,video/quicktime,video/x-msvideo,video/mp4,image/jpeg,image/jpg,image/png"
            onChange={handleFileSelect}
            multiple
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedFiles.length === 1 ? (
                <>Selected: {selectedFiles[0].name} ({(selectedFiles[0].size / (1024 * 1024)).toFixed(2)} MB)</>
              ) : (
                <>Selected {selectedFiles.length} files ({(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB total)</>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Enter media description..."
            maxLength={512}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
            disabled={loading || selectedFiles.length === 0}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}