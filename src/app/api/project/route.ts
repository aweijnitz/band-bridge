import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ProjectStatus } from '@/generated/prisma';
import path from 'path';

const prisma = new PrismaClient();

// Band configuration (keep in sync with dashboard)
const bandName = process.env.NEXT_PUBLIC_BAND_NAME || "My Band";

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
    const { name, owner, status } = body;
    if (!name || !owner || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['open', 'released', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        name,
        bandName: bandName,
        owner,
        status,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 