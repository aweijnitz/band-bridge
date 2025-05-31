import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idNr = parseInt(id, 10);
    if (isNaN(idNr)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
    }
    const updated = await prisma.project.update({
      where: { id: idNr },
      data: { status: 'archived' },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to archive project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 