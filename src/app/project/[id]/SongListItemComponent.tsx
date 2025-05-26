import React from 'react';

export default function SongListItemComponent({ song, comments, onAddComment, commentInput, onCommentInputChange, commentLoading }: any) {
  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-semibold mb-2">{song.title}</h2>
      <div className="text-gray-500 text-sm mb-2">Uploaded: {new Date(song.uploadDate).toLocaleString()}</div>
      <audio controls src={`/filestore/${song.filePath}`} className="w-full mb-4" />
      <div>
        <h3 className="font-semibold mb-2">Comments</h3>
        <ul className="mb-2">
          {(comments || []).map((comment: any) => (
            <li key={comment.id} className="border-b last:border-b-0 py-1 text-gray-700 flex justify-between items-center">
              <span>{comment.text}</span>
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
          />
          <button
            onClick={() => onAddComment(song.id)}
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