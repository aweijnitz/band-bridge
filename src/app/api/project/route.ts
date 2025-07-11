import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { requireSession } from '../auth/requireSession';
import { validateDescription } from '@/lib/textValidation';

const prisma = new PrismaClient();


/** Get projects for a band 
 * 
*/
export async function GET(req: NextRequest) {
  const bandIdParam = req.nextUrl.searchParams.get('bandId');
  const bandId = bandIdParam ? parseInt(bandIdParam, 10) : NaN;
  if (!bandIdParam || isNaN(bandId)) {
    return NextResponse.json({ error: 'Missing or invalid bandId' }, { status: 400 });
  }
  try {
    const projects = await prisma.project.findMany({
      where: { bandId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

/** Create a project
 * 
 * @param req {
        name,
        ownerId,
        status,
        bandId,
      }
 * @returns 
 */
export async function POST(req: NextRequest) {
  await requireSession(req);
  try {
    const body = await req.json();
    const { name, ownerId, status, bandId, description } = body;
    if (!name || !ownerId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['open', 'released', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate description
    const validation = validateDescription(description);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        ownerId,
        status,
        bandId,
        description: validation.sanitized,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}

