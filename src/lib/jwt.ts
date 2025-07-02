import crypto from 'crypto';

const secret = process.env.JWT_SECRET || 'changeme';

function base64url(data: Buffer | string) {
  return (typeof data === 'string' ? Buffer.from(data) : data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signJwt(payload: Record<string, any>, expiresIn: number) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const body = base64url(JSON.stringify({ ...payload, exp }));
  const base = `${header}.${body}`;
  const signature = base64url(
    crypto.createHmac('sha256', secret).update(base).digest()
  );
  return `${base}.${signature}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, signature] = parts;
  const base = `${headerB64}.${bodyB64}`;
  const expected = base64url(
    crypto.createHmac('sha256', secret).update(base).digest()
  );
  try {
    if (
      signature !== expected &&
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
  } catch {
    return null;
  }
  const payload = JSON.parse(Buffer.from(bodyB64, 'base64').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
