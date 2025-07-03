import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../auth/requireSession';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        bands: {
          include: {
            band: true
          }
        }
      }
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const bands = user.bands.map(ub => ({
      bandId: ub.band.id,
      bandName: ub.band.name
    }));
    return NextResponse.json({
      userName: user.username,
      userId: user.id,
      bands
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user bands', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 