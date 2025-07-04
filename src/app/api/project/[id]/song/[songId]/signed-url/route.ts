import { PrismaClient } from '@/generated/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/jwt';

const prisma = new PrismaClient();
const DAYS = parseInt(process.env.AUDIO_LINK_EXPIRY_DAYS || '100', 10);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; songId: string }> }) {
  const { songId } = await params;
  const song = await prisma.media.findUnique({ where: { id: parseInt(songId, 10) } });
  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }
  const token = signJwt({ file: song.filePath, type: 'file' }, DAYS * 24 * 60 * 60);
  const base = req.nextUrl.origin + `/api/project/${song.projectId}/song`;
  return NextResponse.json({
    audioUrl: `${base}/audio?token=${token}`,
    waveformUrl: `${base}/waveform?token=${token}`,
  });
}
