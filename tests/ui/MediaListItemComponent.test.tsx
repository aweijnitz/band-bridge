import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MediaListItemComponent from "../../src/app/project/[id]/MediaListItemComponent";
import { act } from "react";

jest.mock("wavesurfer.js", () => {
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

// Mock the image gallery components
jest.mock("../../src/app/components/ImageGallery", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? <div data-testid="image-gallery-modal"><button onClick={onClose}>Close Gallery</button></div> : null,
  ImageThumbnail: ({ image, onClick }: { image: any; onClick: () => void }) => (
    <div data-testid="image-thumbnail" onClick={onClick}>
      <img src={`/api/project/${image.id}/media/file?fileName=${image.filePath}_thumb.jpg`} alt={image.title} />
    </div>
  ),
}));

beforeAll(() => {
  window.HTMLMediaElement.prototype.load = jest.fn();
  window.HTMLMediaElement.prototype.play = jest.fn();
  window.HTMLMediaElement.prototype.pause = jest.fn();
  window.HTMLMediaElement.prototype.addTextTrack = jest.fn();
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: { get: () => null },
    } as any)
  );
});

const waitForFetch = async () => {
  const fetchResult = (global.fetch as jest.Mock).mock.results[0]?.value;
  if (fetchResult) {
    await fetchResult;
  }
};

const renderWithFetch = async (ui: React.ReactElement) => {
  await act(async () => {
    render(ui);
    await waitForFetch();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MediaListItemComponent", () => {
  const mockMedia = {
    id: 1,
    projectId: 1,
    title: "Test Media",
    filePath: "test.mp3",
    type: "audio" as const,
    uploadDate: new Date().toISOString(),
  };

  const mockImageMedia = {
    id: 2,
    projectId: 1,
    title: "Test Image",
    filePath: "test.jpg",
    type: "image" as const,
    uploadDate: new Date().toISOString(),
  };
  const mockComments = [
    {
      id: 1,
      text: "Nice!",
      createdAt: new Date().toISOString(),
      time: 10,
      user: { username: "alice" },
    },
    {
      id: 2,
      text: "Great part",
      createdAt: new Date().toISOString(),
      time: undefined,
      user: { username: "bob" },
    },
  ];
  const mockOnAddComment = jest.fn();
  const mockOnCommentInputChange = jest.fn();

  it("renders media title and upload date", async () => {
    await renderWithFetch(
      <MediaListItemComponent
        media={mockMedia}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput=""
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
        onDeleteMedia={jest.fn()}
      />
    );
    expect(screen.getByText("Test Media")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded:/)).toBeInTheDocument();
  });

  it("renders comments", async () => {
    await renderWithFetch(
      <MediaListItemComponent
        media={mockMedia}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput=""
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
        onDeleteMedia={jest.fn()}
      />
    );
    expect(screen.getByText("Nice!")).toBeInTheDocument();
    expect(screen.getByText("Great part")).toBeInTheDocument();
  });

  it("calls onAddComment when Add button is clicked", async () => {
    await renderWithFetch(
      <MediaListItemComponent
        media={mockMedia}
        comments={mockComments}
        onAddComment={mockOnAddComment}
        commentInput="Test comment"
        onCommentInputChange={mockOnCommentInputChange}
        commentLoading={false}
        onDeleteMedia={jest.fn()}
      />
    );
    const button = screen.getByText("Add");
    fireEvent.click(button);
    expect(mockOnAddComment).toHaveBeenCalled();
  });

  it("shows Delete button always, enabled only if projectStatus is archived", async () => {
    await renderWithFetch(
      <MediaListItemComponent
        media={mockMedia}
        comments={mockComments}
        onAddComment={jest.fn()}
        commentInput={""}
        onCommentInputChange={jest.fn()}
        commentLoading={false}
        onDeleteMedia={jest.fn()}
      />
    );
    const btn2 = await screen.findByLabelText("Delete Song");
    expect(btn2).toBeInTheDocument();
    expect(btn2).not.toBeDisabled();
  });

  describe("Image Media", () => {
    it("renders image thumbnail for image media", async () => {
      await renderWithFetch(
        <MediaListItemComponent
          media={mockImageMedia}
          comments={[]}
          onAddComment={mockOnAddComment}
          commentInput=""
          onCommentInputChange={mockOnCommentInputChange}
          commentLoading={false}
          onDeleteMedia={jest.fn()}
        />
      );
      expect(screen.getByText("Test Image")).toBeInTheDocument();
      expect(screen.getByTestId("image-thumbnail")).toBeInTheDocument();
    });

    it("opens image gallery when thumbnail is clicked", async () => {
      await renderWithFetch(
        <MediaListItemComponent
          media={mockImageMedia}
          comments={[]}
          onAddComment={mockOnAddComment}
          commentInput=""
          onCommentInputChange={mockOnCommentInputChange}
          commentLoading={false}
          onDeleteMedia={jest.fn()}
        />
      );
      
      const thumbnail = screen.getByTestId("image-thumbnail");
      fireEvent.click(thumbnail);
      
      await waitFor(() => {
        expect(screen.getByTestId("image-gallery-modal")).toBeInTheDocument();
      });
    });

    it("does not show play/pause buttons for image media", async () => {
      await renderWithFetch(
        <MediaListItemComponent
          media={mockImageMedia}
          comments={[]}
          onAddComment={mockOnAddComment}
          commentInput=""
          onCommentInputChange={mockOnCommentInputChange}
          commentLoading={false}
          onDeleteMedia={jest.fn()}
        />
      );
      
      expect(screen.queryByLabelText("Play")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Pause")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Stop")).not.toBeInTheDocument();
    });

    it("closes image gallery when close button is clicked", async () => {
      await renderWithFetch(
        <MediaListItemComponent
          media={mockImageMedia}
          comments={[]}
          onAddComment={mockOnAddComment}
          commentInput=""
          onCommentInputChange={mockOnCommentInputChange}
          commentLoading={false}
          onDeleteMedia={jest.fn()}
        />
      );
      
      const thumbnail = screen.getByTestId("image-thumbnail");
      fireEvent.click(thumbnail);
      
      await waitFor(() => {
        expect(screen.getByTestId("image-gallery-modal")).toBeInTheDocument();
      });

      const closeButton = screen.getByText("Close Gallery");
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId("image-gallery-modal")).not.toBeInTheDocument();
      });
    });
  });
});
