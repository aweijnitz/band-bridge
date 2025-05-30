import { NextResponse } from 'next/server';
import { validateSession } from './session';

export async function requireSession() {
  const session = await validateSession();
  if (!session) {
    throw NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return session;
} 