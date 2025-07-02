import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const payload = verifyJwt(token);
  if (!payload || payload.type !== 'file') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }
  const fileName = payload.file;
  const fileRes = await fetch(`${audioServiceUrl}/files/${fileName}`);
  if (!fileRes.ok) {
    return new NextResponse('File not found', { status: 404 });
  }
  const headers = Object.fromEntries(fileRes.headers.entries());
  return new NextResponse(fileRes.body as unknown as ReadableStream, { status: 200, headers });
}
