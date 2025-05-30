import { cookies } from 'next/headers';
import { PrismaClient } from '@/generated/prisma';
import crypto from 'crypto';

const prisma = new PrismaClient();
const SESSION_COOKIE = 'session_id';
const SESSION_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

export async function createSession(userId: number) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await prisma.session.create({
    data: {
      sessionId,
      userId,
      expiresAt,
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return sessionId;
}

export async function validateSession(): Promise<{ userId: number } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { sessionId },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    cookieStore.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
    return null;
  }
  return { userId: session.userId };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.deleteMany({ where: { sessionId } });
    cookieStore.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  }
} 