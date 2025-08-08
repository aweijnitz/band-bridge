import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../../../../auth/requireSession';

const prisma = new PrismaClient();

/**
 * Get all gallery comments for a project
 * Gallery comments are stored as comments on the first image media item with a special marker
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession(req);
  try {
    const { id: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    // Find the first image in the project to use as the gallery representative
    const firstImage = await prisma.media.findFirst({
      where: { 
        projectId,
        type: 'image'
      },
      orderBy: { uploadDate: 'asc' }
    });

    if (!firstImage) {
      return NextResponse.json([]);
    }

    // Get comments for the gallery (marked with time: -1 to distinguish from regular media comments)
    const comments = await prisma.comment.findMany({
      where: { 
        mediaId: firstImage.id,
        time: -1 // Special marker for gallery comments
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { username: true } } },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch gallery comments', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Add a comment to the gallery
 * Gallery comments are stored as comments on the first image media item with time: -1
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req);
  try {
    const { id: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    const body = await req.json();
    const { text } = body;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid comment text' }, { status: 400 });
    }

    // Find the first image in the project to use as the gallery representative
    const firstImage = await prisma.media.findFirst({
      where: { 
        projectId,
        type: 'image'
      },
      orderBy: { uploadDate: 'asc' }
    });

    if (!firstImage) {
      return NextResponse.json({ error: 'No images found in this project' }, { status: 404 });
    }

    // Create gallery comment (time: -1 marks it as a gallery comment)
    const comment = await prisma.comment.create({
      data: {
        mediaId: firstImage.id,
        userId: session.userId,
        text,
        time: -1 // Special marker for gallery comments
      },
      include: { user: { select: { username: true } } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add gallery comment', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}