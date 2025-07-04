import { PrismaClient } from '@/generated/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/jwt';

const prisma = new PrismaClient();
const DAYS = parseInt(process.env.AUDIO_LINK_EXPIRY_DAYS || '100', 10);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { mediaId } = await params;
  const media = await prisma.media.findUnique({ where: { id: parseInt(mediaId, 10) } });
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
  const token = signJwt({ file: media.filePath, type: 'file' }, DAYS * 24 * 60 * 60);
  const base = req.nextUrl.origin + `/api/project/${media.projectId}/media`;
  return NextResponse.json({
    audioUrl: `${base}/audio?token=${token}`,
    waveformUrl: `${base}/waveform?token=${token}`,
  });
}
