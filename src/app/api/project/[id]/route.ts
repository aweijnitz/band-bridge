import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
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
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 