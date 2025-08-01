import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../../../../../auth/requireSession';

const prisma = new PrismaClient();

/**
 * Get all comments for media
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  await requireSession(req);
  try {
    const { mediaId: mediaIdStr } = await params;
    const mediaId = parseInt(mediaIdStr, 10);
    if (isNaN(mediaId)) {
      return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
    }
    const comments = await prisma.comment.findMany({
      where: { mediaId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { username: true } } },
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Add a comment to media
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const session = await requireSession(req);
  try {
    const { mediaId: mediaIdStr } = await params;
    const mediaId = parseInt(mediaIdStr, 10);
    if (isNaN(mediaId)) {
      return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
    }
    const body = await req.json();
    const { text, time } = body;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid comment text' }, { status: 400 });
    }
    const comment = await prisma.comment.create({
      data: {
        mediaId,
        userId: session.userId,
        text,
        time: typeof time === 'number' ? time : undefined,
      },
      include: { user: { select: { username: true } } },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add comment', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 
