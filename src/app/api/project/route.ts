import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ProjectStatus } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, bandName, owner, status } = body;
    if (!name || !bandName || !owner || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['open', 'released', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        name,
        bandName,
        owner,
        status,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 