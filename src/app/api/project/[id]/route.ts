import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const FILESTORE_PATH = path.join(process.cwd(), 'public', 'filestore');

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const data = await req.json();
    const { name, bandName, owner, status } = data;
    if (!name || !bandName || !owner || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const updated = await prisma.project.update({
      where: { id },
      data: { name, bandName, owner, status },
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    // Check if project exists
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    // Find all songs for the project
    const songs = await prisma.song.findMany({ where: { projectId: id } });
    const songIds = songs.map(song => song.id);
    // Delete all comments for these songs
    await prisma.comment.deleteMany({ where: { songId: { in: songIds } } });
    // Delete all songs for the project
    await prisma.song.deleteMany({ where: { projectId: id } });
    // Delete all song files from the filesystem
    for (const song of songs) {
      if (song.filePath) {
        try {
          await unlink(path.join(FILESTORE_PATH, song.filePath));
        } catch (err) {
          // Ignore file not found errors
        }
      }
    }
    // Delete the project
    const deleted = await prisma.project.delete({ where: { id } });
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