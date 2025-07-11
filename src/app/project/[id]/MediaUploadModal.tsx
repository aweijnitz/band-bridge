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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setDescription('');
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, description);
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
            accept="audio/mp3,audio/wav,video/mp4,video/quicktime,video/x-msvideo,video/mp4"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {selectedFile && (
            <div className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
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
            disabled={loading || !selectedFile}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}