import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { requireSession } from '../../../auth/requireSession';

const prisma = new PrismaClient();

/**
 * Get all songs for a project
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
  // If requesting a file or waveform, proxy to audio service
  if (url.pathname.endsWith('/audio') && req.nextUrl.searchParams.has('file')) {
    const fileName = req.nextUrl.searchParams.get('file');
    const fileRes = await fetch(`${audioServiceUrl}/files/${fileName}`);
    if (!fileRes.ok) {
      return new NextResponse('File not found', { status: 404 });
    }
    const headers = Object.fromEntries(fileRes.headers.entries());
    // Stream the response body directly
    // @ts-expect-error: Next.js Response supports ReadableStream in edge runtime
    return new NextResponse(fileRes.body as ReadableStream<Uint8Array>, { status: 200, headers });
  }
  if (url.pathname.endsWith('/waveform') && req.nextUrl.searchParams.has('file')) {
    const fileName = req.nextUrl.searchParams.get('file');
    const fileRes = await fetch(`${audioServiceUrl}/files/${fileName}.dat`);
    if (!fileRes.ok) {
      return new NextResponse('Waveform not found', { status: 404 });
    }
    const headers = Object.fromEntries(fileRes.headers.entries());
    // Stream the response body directly
    // @ts-expect-error: Next.js Response supports ReadableStream in edge runtime
    return new NextResponse(fileRes.body as ReadableStream<Uint8Array>, { status: 200, headers });
  }
  try {
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const songs = await prisma.song.findMany({
      where: { projectId },
      orderBy: { uploadDate: 'desc' },
    });
    return NextResponse.json(songs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch songs', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Upload a song to a project
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  try {
    const { id: idStr } = await params;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const projectId = parseInt(idStr, 10);
    if (!file || isNaN(projectId)) {
      console.warn('[Song Upload] Missing file or invalid project id', { file, projectId });
      return NextResponse.json({ error: 'Missing file or invalid project id', details: { file: !!file, projectId } }, { status: 400 });
    }
    // Convert web File to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadForm = new FormData();
    uploadForm.append('file', buffer, {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    });
    const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
    const uploadRes = await fetch(`${audioServiceUrl}/upload`, {
      method: 'POST',
      body: uploadForm as unknown as FormData,
      headers: (uploadForm as unknown as { getHeaders?: () => Record<string, string> }).getHeaders ? (uploadForm as unknown as { getHeaders: () => Record<string, string> }).getHeaders() : {},
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      console.error('[Song Upload] Audio service upload failed', err);
      return NextResponse.json({ error: 'Audio service upload failed', details: err.error || uploadRes.statusText }, { status: 500 });
    }
    const { fileName } = await uploadRes.json();
    // Use file name (without extension) as title if not provided
    if (!title) {
      title = file.name.replace(/\.[^/.]+$/, '');
    }
    try {
      const song = await prisma.song.create({
        data: {
          projectId,
          title,
          filePath: fileName,
        },
      });
      console.log('[Song Upload] Song created in DB:', song);
      return NextResponse.json(song, { status: 201 });
    } catch (dbError: unknown) {
      console.error('[Song Upload] DB error creating song', {
        projectId,
        title,
        fileName,
        dbError: dbError instanceof Error ? dbError.message : dbError,
      });
      let hint = undefined;
      if (typeof dbError === 'object' && dbError !== null && 'code' in dbError && (dbError as { code?: string }).code === 'P2003') {
        hint = 'Check that the project with id ' + projectId + ' exists in the database.';
      }
      return NextResponse.json({
        error: 'Failed to create song in database',
        details: dbError instanceof Error ? dbError.message : dbError,
        projectId,
        fileName,
        hint,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Song Upload] Unexpected error', error);
    return NextResponse.json({ error: 'Failed to upload song', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Delete all songs for a project
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const songs = await prisma.song.findMany({
      where: { projectId },
    });
    if (songs.length === 0) {
      return NextResponse.json({ error: 'No songs found for the project' }, { status: 404 });
    }
    await prisma.song.deleteMany({
      where: { projectId },
    });
    return NextResponse.json({ message: 'All songs deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete songs', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 