import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImageGalleryModal, { ImageThumbnail } from "../../src/app/components/ImageGallery";

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
    it("renders gallery when open", () => {
      render(
        <ImageGalleryModal
          images={mockImages}
          isOpen={true}
          onClose={jest.fn()}
          initialIndex={0}
        />
      );

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

    it("calls onClose when close button is clicked", () => {
      const mockOnClose = jest.fn();
      render(
        <ImageGalleryModal
          images={mockImages}
          isOpen={true}
          onClose={mockOnClose}
          initialIndex={0}
        />
      );

      const closeButton = screen.getByText("✕");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("renders empty gallery when no images", () => {
      render(
        <ImageGalleryModal
          images={[]}
          isOpen={true}
          onClose={jest.fn()}
          initialIndex={0}
        />
      );

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