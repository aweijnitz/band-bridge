import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../../auth/requireSession';

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
    await requireSession();
    const { id } = await params;
    const idNr = parseInt(id, 10);
    if (isNaN(idNr)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const data = await req.json();
    const { name, ownerId, status, bandId } = data;
    if (!name || !ownerId || !status || !bandId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const updated = await prisma.project.update({
      where: { id: idNr },
      data: { name, bandId, ownerId, status },
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
    await requireSession();
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
    // Find all songs for the project
    const songs = await prisma.song.findMany({ where: { projectId: idNr } });
    const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
    // Delete all song files via audio microservice
    for (const song of songs) {
      if (song.filePath) {
        try {
          await fetch(`${audioServiceUrl}/delete-song`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: song.filePath }),
          });
        } catch (err) {
          // Log and continue
          console.error('Failed to delete song file via audio service', song.filePath, err);
        }
      }
    }
    // Delete all comments for these songs
    const songIds = songs.map(song => song.id);
    await prisma.comment.deleteMany({ where: { songId: { in: songIds } } });
    // Delete all songs for the project
    await prisma.song.deleteMany({ where: { projectId: idNr } });
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