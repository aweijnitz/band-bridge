import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../../../../auth/requireSession';
import { validateDescription } from '@/lib/textValidation';

const prisma = new PrismaClient();

/**
 * Get a single media item by id and projectId
*/
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string, mediaId: string }> }) {
  try {
    const { id, mediaId } = await params;
    const projectId = parseInt(id, 10);
    const mediaIdNum = parseInt(mediaId, 10);
    if (isNaN(projectId) || isNaN(mediaIdNum)) {
      return NextResponse.json({ error: 'Invalid project or media id' }, { status: 400 });
    }
    const media = await prisma.media.findUnique({ where: { id: mediaIdNum } });
    if (!media || media.projectId !== projectId) {
      return NextResponse.json({ error: 'Media not found in project' }, { status: 404 });
    }
    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch media', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Update a media item (title, description)
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, mediaId: string }> }) {
  await requireSession(req);
  try {
    const { id, mediaId } = await params;
    const projectId = parseInt(id, 10);
    const mediaIdNum = parseInt(mediaId, 10);
    if (isNaN(projectId) || isNaN(mediaIdNum)) {
      return NextResponse.json({ error: 'Invalid project or media id' }, { status: 400 });
    }

    const body = await req.json();
    const { title, description } = body;

    // Find the media to ensure it exists and belongs to the project
    const existingMedia = await prisma.media.findUnique({ where: { id: mediaIdNum } });
    if (!existingMedia || existingMedia.projectId !== projectId) {
      return NextResponse.json({ error: 'Media not found in project' }, { status: 404 });
    }

    // Validate description
    const validation = validateDescription(description);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Update media
    const updatedMedia = await prisma.media.update({
      where: { id: mediaIdNum },
      data: {
        ...(title && { title }),
        description: validation.sanitized,
      },
    });

    return NextResponse.json(updatedMedia);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update media', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Delete a media item and all its comments
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, mediaId: string }> }) {
  await requireSession(req);
  try {
    const { id, mediaId } = await params;
    const projectId = parseInt(id, 10);
    const mediaIdNum = parseInt(mediaId, 10);
    if (isNaN(projectId) || isNaN(mediaIdNum)) {
      return NextResponse.json({ error: 'Invalid project or media id' }, { status: 400 });
    }
    // Find the media
    const media = await prisma.media.findUnique({ where: { id: mediaIdNum } });
    if (!media || media.projectId !== projectId) {
      return NextResponse.json({ error: 'Media not found in project' }, { status: 404 });
    }
    // Delete all comments for the media
    await prisma.comment.deleteMany({ where: { mediaId: mediaIdNum } });
    // Delete the media record
    await prisma.media.delete({ where: { id: mediaIdNum } });
    // Delete the media file and waveform via media microservice
    if (media.filePath) {
      const mediaServiceUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:4001';
      try {
        await fetch(`${mediaServiceUrl}/delete-media`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: media.filePath }),
        });
      } catch (err) {
        // Log and continue
        console.error('Failed to delete media file via media service', media.filePath, err);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete media', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 
