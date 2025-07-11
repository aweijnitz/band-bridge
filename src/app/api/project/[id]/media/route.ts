import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { requireSession } from '../../../auth/requireSession';
import { validateDescription } from '@/lib/textValidation';

const prisma = new PrismaClient();

// Configure the route to accept large files (1GB)
export const maxDuration = 60; // seconds
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Get all media items for a project
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // File serving is now handled by the /file endpoint
  try {
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const media = await prisma.media.findMany({
      where: { projectId },
      orderBy: { uploadDate: 'desc' },
    });
    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch media', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Upload a media file to a project
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession(req);
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr, 10);
    if (isNaN(projectId)) {
      console.warn('[Media Upload] Invalid project id', { projectId });
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }

    // Check Content-Length to enforce size limit
    const contentLength = req.headers.get('content-length');
    const MAX_SIZE = 1024 * 1024 * 1024; // 1GB
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    // Parse form data with size limit handling
    let formData;
    try {
      formData = await req.formData();
    } catch (error) {
      console.error('[Media Upload] Form data parsing failed', error);
      return NextResponse.json({ error: 'File too large or invalid form data' }, { status: 413 });
    }

    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    
    if (!file) {
      console.warn('[Media Upload] Missing file');
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Convert web File to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const uploadForm = new FormData();
    uploadForm.append('file', buffer, {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    });
    
    const mediaServiceUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:4001';
    const uploadRes = await fetch(`${mediaServiceUrl}/upload`, {
      method: 'POST',
      body: uploadForm as unknown as FormData,
      headers: (uploadForm as unknown as { getHeaders?: () => Record<string, string> }).getHeaders ? (uploadForm as unknown as { getHeaders: () => Record<string, string> }).getHeaders() : {},
    });
    
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      console.error('[Media Upload] Media service upload failed', err);
      return NextResponse.json({ error: 'Media service upload failed', details: err.error || uploadRes.statusText }, { status: 500 });
    }
    
    const { fileName } = await uploadRes.json();
    
    // Use file name (without extension) as title if not provided
    if (!title) {
      title = file.name.replace(/\.[^/.]+$/, '');
    }

    // Validate description
    const validation = validateDescription(description);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const type: 'audio' | 'video' | 'image' = ['mp3','wav'].includes(extension) ? 'audio' : ['mp4','mov','avi','h264','m4v'].includes(extension) ? 'video' : 'image';
    
    try {
      const media = await prisma.media.create({
        data: {
          projectId,
          title,
          description: validation.sanitized,
          filePath: fileName,
          type,
        },
      });
      return NextResponse.json(media, { status: 201 });
    } catch (dbError: unknown) {
      console.error('[Media Upload] DB error creating media', {
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
        error: 'Failed to create media in database',
        details: dbError instanceof Error ? dbError.message : dbError,
        projectId,
        fileName,
        hint,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Media Upload] Unexpected error', error);
    return NextResponse.json({ error: 'Failed to upload media', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/**
 * Delete all media for a project
 * @param req - The request object
 * @param params - The parameters object
 * @returns A response object
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession(req);
  try {
    const { id: idStr } = await params;
    const projectId = parseInt(idStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const items = await prisma.media.findMany({
      where: { projectId },
    });
    if (items.length === 0) {
      return NextResponse.json({ error: 'No media found for the project' }, { status: 404 });
    }
    await prisma.media.deleteMany({
      where: { projectId },
    });
    return NextResponse.json({ message: 'All media deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete media', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
