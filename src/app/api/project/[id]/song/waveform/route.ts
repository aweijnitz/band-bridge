import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const audioServiceUrl = process.env.AUDIO_SERVICE_URL || 'http://localhost:4001';
  const fileName = req.nextUrl.searchParams.get('file');
  if (!fileName) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
  }
  const fileRes = await fetch(`${audioServiceUrl}/files/${fileName}.dat`);
  if (!fileRes.ok) {
    return new NextResponse('Waveform not found', { status: 404 });
  }
  const headers = Object.fromEntries(fileRes.headers.entries());
  return new NextResponse(fileRes.body as unknown as ReadableStream, { status: 200, headers });
} 