import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
  // @ts-ignore
  return new NextResponse(fileRes.body as any, { status: 200, headers });
} 