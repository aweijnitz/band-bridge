import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const FILESTORE_PATH = path.join(process.cwd(), 'public', 'filestore');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = parseInt(params.id, 10);
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const projectId = parseInt(params.id, 10);
    if (!file || isNaN(projectId)) {
      return NextResponse.json({ error: 'Missing file or invalid project id' }, { status: 400 });
    }
    // Save file to public/filestore
    await mkdir(FILESTORE_PATH, { recursive: true });
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(FILESTORE_PATH, fileName);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));
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