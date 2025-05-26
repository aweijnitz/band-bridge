import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { songId: string } }) {
  try {
    const songId = parseInt(params.songId, 10);
    if (isNaN(songId)) {
      return NextResponse.json({ error: 'Invalid song id' }, { status: 400 });
    }
    const comments = await prisma.comment.findMany({
      where: { songId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { songId: string } }) {
  try {
    const songId = parseInt(params.songId, 10);
    if (isNaN(songId)) {
      return NextResponse.json({ error: 'Invalid song id' }, { status: 400 });
    }
    const body = await req.json();
    const { text, time } = body;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid comment text' }, { status: 400 });
    }
    const comment = await prisma.comment.create({
      data: {
        songId,
        text,
        time: typeof time === 'number' ? time : undefined,
      },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add comment', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 