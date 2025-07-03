import { cookies } from 'next/headers';
import { signJwt, verifyJwt } from '@/lib/jwt';
import { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'token';
const SESSION_MAX_AGE = 24 * 60 * 60; // 24h

export async function createSession(userId: number) {
  const token = signJwt({ sub: userId, type: 'session' }, SESSION_MAX_AGE);
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return token;
}

export async function validateSession(req?: NextRequest): Promise<{ userId: number; type: string } | null> {
  let token: string | undefined;
  if (req) {
    const auth = req.headers?.get('authorization');
    if (auth?.startsWith('Bearer ')) token = auth.slice(7);
  }
  if (!token) {
    const store = await cookies();
    token = store.get(TOKEN_COOKIE)?.value;
  }
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  return { userId: Number(payload.sub), type: String(payload.type) };
}

export async function deleteSession() {
  const store = await cookies();
  store.set(TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
}
