import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../../auth/requireSession';
import { validateDescription } from '@/lib/textValidation';

const prisma = new PrismaClient();

/**
 * Get a project by id
 * @param req - The request object
 * @param context - The context object
 * @returns A response object
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNr = parseInt(id, 10);
    if (isNaN(idNr)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const project = await prisma.project.findUnique({ where: { id: idNr } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Update a project
 * @param req - The request object
 * @param context - The context object
 * @returns A response object
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(req);
    const { id } = await params;
    const idNr = parseInt(id, 10);
    if (isNaN(idNr)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const data = await req.json();
    const { name, ownerId, status, bandId, description } = data;
    if (!name || !ownerId || !status || !bandId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate description
    const validation = validateDescription(description);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id: idNr },
      data: { name, bandId, ownerId, status, description: validation.sanitized },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Error && (
        error.message.includes('Record to update not found')
      )
    ) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Delete a project and all its songs
 * @param req - The request object
 * @param context - The context object
 * @returns A response object
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(req);
    const { id } = await params;
    const idNr = parseInt(id, 10);
    if (isNaN(idNr)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    // Check if project exists
    const project = await prisma.project.findUnique({ where: { id: idNr } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    // Find all media for the project
    const media = await prisma.media.findMany({ where: { projectId: idNr } });
    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:4001';
    // Delete all media files via media microservice
    for (const mediaItem of media) {
      if (mediaItem.filePath) {
        try {
          await fetch(`${mediaServiceUrl}/delete-media`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: mediaItem.filePath }),
          });
        } catch (err) {
          // Log and continue
          console.error('Failed to delete media file via media service', mediaItem.filePath, err);
        }
      }
    }
    // Delete all comments for these media items
    const mediaIds = media.map(mediaItem => mediaItem.id);
    await prisma.comment.deleteMany({ where: { mediaId: { in: mediaIds } } });
    // Delete all media for the project
    await prisma.media.deleteMany({ where: { projectId: idNr } });
    // Delete the project
    const deleted = await prisma.project.delete({ where: { id: idNr } });
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    if (
      error instanceof Error && (
        error.message.includes('Record to delete does not exist') ||
        error.message.includes('Record to update not found')
      )
    ) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 