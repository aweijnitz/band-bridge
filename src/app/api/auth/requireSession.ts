import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './session';

export async function requireSession(req?: NextRequest) {
  const session = await validateSession(req);
  if (!session) {
    throw NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return session;
}
