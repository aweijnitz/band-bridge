import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { NextRequest as NodeNextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    // @ts-ignore: Next.js Response supports ReadableStream in edge runtime
    return new NextResponse(fileRes.body as any, { status: 200, headers });
  }
  if (url.pathname.endsWith('/waveform') && req.nextUrl.searchParams.has('file')) {
    const fileName = req.nextUrl.searchParams.get('file');
    const fileRes = await fetch(`${audioServiceUrl}/files/${fileName}.dat`);
    if (!fileRes.ok) {
      return new NextResponse('Waveform not found', { status: 404 });
    }
    const headers = Object.fromEntries(fileRes.headers.entries());
    // Stream the response body directly
    // @ts-ignore: Next.js Response supports ReadableStream in edge runtime
    return new NextResponse(fileRes.body as any, { status: 200, headers });
  }
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr, 10);
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    console.log('[Song Upload] Received params:', { idStr });
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const projectId = parseInt(idStr, 10);
    console.log('[Song Upload] Parsed projectId:', projectId, 'File:', file ? file.name : null, 'Title:', title);
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
      body: uploadForm as any,
      // @ts-ignore
      headers: (uploadForm as any).getHeaders ? (uploadForm as any).getHeaders() : {},
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
    } catch (dbError: any) {
      console.error('[Song Upload] DB error creating song', {
        projectId,
        title,
        fileName,
        dbError: dbError?.message || dbError,
      });
      let hint = undefined;
      if (dbError?.code === 'P2003' || (dbError?.message && dbError.message.includes('Foreign key'))) {
        hint = 'Check that the project with id ' + projectId + ' exists in the database.';
      }
      return NextResponse.json({
        error: 'Failed to create song in database',
        details: dbError?.message || dbError,
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