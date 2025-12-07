import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImageGalleryModal, { ImageThumbnail } from "../../src/app/components/ImageGallery";
import { act } from "react";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [],
  });
  global.fetch = mockFetch as any;
});

afterEach(() => {
  jest.clearAllMocks();
});

// Mock react-image-gallery
jest.mock("react-image-gallery", () => {
  return function MockImageGallery({ items, onScreenChange }: any) {
    return (
      <div data-testid="react-image-gallery">
        {items.map((item: any, index: number) => (
          <div key={index}>
            <img src={item.original} alt={item.description} />
            <div>{item.description}</div>
          </div>
        ))}
      </div>
    );
  };
});

describe("ImageGallery Components", () => {
  const mockImages = [
    {
      id: 1,
      mediaId: 101,
      title: "Test Image 1",
      description: "First test image",
      filePath: "image1.jpg",
      uploadDate: "2023-01-01T00:00:00Z",
    },
    {
      id: 1,
      mediaId: 102,
      title: "Test Image 2",
      description: "Second test image",
      filePath: "image2.jpg",
      uploadDate: "2023-01-02T00:00:00Z",
    },
  ];

  describe("ImageGalleryModal", () => {
    it("renders gallery when open", async () => {
      render(
        <ImageGalleryModal
          images={mockImages}
          isOpen={true}
          onClose={jest.fn()}
          initialIndex={0}
        />
      );

      await act(async () => {
        await (mockFetch.mock.results[0]?.value ?? Promise.resolve());
      });

      expect(screen.getByTestId("react-image-gallery")).toBeInTheDocument();
    });

    it("does not render when closed", () => {
      render(
        <ImageGalleryModal
          images={mockImages}
          isOpen={false}
          onClose={jest.fn()}
          initialIndex={0}
        />
      );

      expect(screen.queryByTestId("react-image-gallery")).not.toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", async () => {
      const mockOnClose = jest.fn();
      render(
        <ImageGalleryModal
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
          initialIndex={0}
        />
      );

      await act(async () => {
        await (mockFetch.mock.results[0]?.value ?? Promise.resolve());
      });

      const closeButton = screen.getByText("✕");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("renders empty gallery when no images", async () => {
      render(
        <ImageGalleryModal
          images={[]}
          isOpen={true}
          onClose={jest.fn()}
          initialIndex={0}
        />
      );

      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });

      expect(screen.queryByTestId("react-image-gallery")).not.toBeInTheDocument();
    });
  });

  describe("ImageThumbnail", () => {
    it("renders thumbnail with image and title", () => {
      const mockOnClick = jest.fn();
      render(
        <ImageThumbnail
          image={mockImages[0]}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText("Test Image 1")).toBeInTheDocument();
      expect(screen.getByText("First test image")).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        "/api/project/1/media/file?file=image1.jpg_thumb.jpg"
      );
    });

    it("calls onClick when clicked", () => {
      const mockOnClick = jest.fn();
      render(
        <ImageThumbnail
          image={mockImages[0]}
          onClick={mockOnClick}
        />
      );

      const thumbnail = screen.getByRole("img").closest("div");
      fireEvent.click(thumbnail!);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it("handles image load error gracefully", () => {
      const mockOnClick = jest.fn();
      render(
        <ImageThumbnail
          image={mockImages[0]}
          onClick={mockOnClick}
        />
      );

      const image = screen.getByRole("img");
      fireEvent.error(image);

      // Should fallback to original image
      expect(image).toHaveAttribute(
        "src",
        "/api/project/1/media/file?file=image1.jpg"
      );
    });
  });
});
