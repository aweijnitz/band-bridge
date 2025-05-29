import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import fetch from 'node-fetch';
import FormData from 'form-data';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const projectId = parseInt(idStr, 10);
    if (!file || isNaN(projectId)) {
      return NextResponse.json({ error: 'Missing file or invalid project id' }, { status: 400 });
    }
    // Forward file to audio microservice
    const uploadForm = new FormData();
    uploadForm.append('file', file, file.name);
    const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
    const uploadRes = await fetch(`${audioServiceUrl}/upload`, {
      method: 'POST',
      body: uploadForm as any,
      // @ts-ignore
      headers: (uploadForm as any).getHeaders ? (uploadForm as any).getHeaders() : {},
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      return NextResponse.json({ error: 'Audio service upload failed', details: err.error || uploadRes.statusText }, { status: 500 });
    }
    const { fileName } = await uploadRes.json();
    // Use file name (without extension) as title if not provided
    if (!title) {
      title = file.name.replace(/\.[^/.]+$/, '');
    }
    const song = await prisma.song.create({
      data: {
        projectId,
        title,
        filePath: fileName,
      },
    });
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload song', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 