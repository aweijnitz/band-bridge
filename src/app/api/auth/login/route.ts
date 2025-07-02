import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcrypt';
import { createSession } from '../session';

const prisma = new PrismaClient();
const attempts: Record<string, { count: number; first: number }> = {};
const LIMIT = 5;
const WINDOW = 60 * 1000;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'local';
  const rec = attempts[ip] || { count: 0, first: Date.now() };
  if (Date.now() - rec.first < WINDOW) {
    if (rec.count >= LIMIT) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }
  } else {
    rec.count = 0;
    rec.first = Date.now();
  }
  rec.count++;
  attempts[ip] = rec;

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ id: user.id, username: user.username });
}
