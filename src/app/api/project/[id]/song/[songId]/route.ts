import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

/**
 * Get a single song by id and projectId
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string, songId: string }> }) {
  try {
    const { id, songId } = await params;
    const projectId = parseInt(id, 10);
    const songIdNum = parseInt(songId, 10);
    if (isNaN(projectId) || isNaN(songIdNum)) {
      return NextResponse.json({ error: 'Invalid project or song id' }, { status: 400 });
    }
    const song = await prisma.song.findUnique({ where: { id: songIdNum } });
    if (!song || song.projectId !== projectId) {
      return NextResponse.json({ error: 'Song not found in project' }, { status: 404 });
    }
    return NextResponse.json(song);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch song', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Delete a song and all its comments
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, songId: string }> }) {
  try {
    const { id, songId } = await params;
    const projectId = parseInt(id, 10);
    const songIdNum = parseInt(songId, 10);
    if (isNaN(projectId) || isNaN(songIdNum)) {
      return NextResponse.json({ error: 'Invalid project or song id' }, { status: 400 });
    }
    // Find the song
    const song = await prisma.song.findUnique({ where: { id: songIdNum } });
    if (!song || song.projectId !== projectId) {
      return NextResponse.json({ error: 'Song not found in project' }, { status: 404 });
    }
    // Delete all comments for the song
    await prisma.comment.deleteMany({ where: { songId: songIdNum } });
    // Delete the song record
    await prisma.song.delete({ where: { id: songIdNum } });
    // Delete the audio file and waveform via audio microservice
    if (song.filePath) {
      const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete song', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 