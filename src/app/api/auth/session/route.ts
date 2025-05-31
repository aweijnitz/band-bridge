import { NextResponse } from 'next/server';
import { validateSession } from '../session';

export async function GET() {
  const session = await validateSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ userId: session.userId });
} 