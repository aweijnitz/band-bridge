import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SongListItemComponent from '../../src/app/project/[id]/SongListItemComponent';

jest.mock('wavesurfer.js', () => {
  return {
    create: jest.fn(() => ({
      on: jest.fn(),
      destroy: jest.fn(),
      playPause: jest.fn(),
      stop: jest.fn(),
      getCurrentTime: jest.fn(() => 0),
      setTime: jest.fn(),
      regions: {
        clear: jest.fn(),
        addRegion: jest.fn(),
      },
    })),
  };
});

beforeAll(() => {
  window.HTMLMediaElement.prototype.load = jest.fn();
  window.HTMLMediaElement.prototype.play = jest.fn();
  window.HTMLMediaElement.prototype.pause = jest.fn();
  window.HTMLMediaElement.prototype.addTextTrack = jest.fn();
});

describe('SongListItemComponent', () => {
  const mockSong = {
    id: '1',
    title: 'Test Song',
    filePath: 'test.mp3',
    uploadDate: new Date().toISOString(),
  };
  const mockComments = [
    { id: 'c1', text: 'Nice!', createdAt: new Date().toISOString(), time: 10 },
    { id: 'c2', text: 'Great part', createdAt: new Date().toISOString(), time: null },
  ];
  const mockOnAddComment = jest.fn();
  const mockOnCommentInputChange = jest.fn();

  it('renders song title and upload date', () => {
    render(
      <SongListItemComponent
        song={mockSong}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput=""
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
      />
    );
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded:/)).toBeInTheDocument();
  });

  it('renders comments', () => {
    render(
      <SongListItemComponent
        song={mockSong}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput=""
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
      />
    );
    expect(screen.getByText('Nice!')).toBeInTheDocument();
    expect(screen.getByText('Great part')).toBeInTheDocument();
  });

  it('calls onCommentInputChange when typing in input', () => {
    render(
      <SongListItemComponent
        song={mockSong}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput=""
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
      />
    );
    const input = screen.getByPlaceholderText('Add a comment...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(mockOnCommentInputChange).toHaveBeenCalledWith('1', 'Hello');
  });

  it('calls onAddComment when Add button is clicked', () => {
    render(
      <SongListItemComponent
        song={mockSong}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput="Test comment"
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
      />
    );
    const button = screen.getByText('Add');
    fireEvent.click(button);
    expect(mockOnAddComment).toHaveBeenCalled();
  });
}); 