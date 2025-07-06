import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';

// MIME type mapping for common file extensions
const MIME_TYPES: Record<string, string> = {
  // Audio files
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  // Video files
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
  '.wmv': 'video/x-ms-wmv',
  // Waveform data
  '.dat': 'application/octet-stream',
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const mediaServiceUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:4001';
  
  // Get the file parameter from the query string
  const fileName = req.nextUrl.searchParams.get('file');
  const type = req.nextUrl.searchParams.get('type'); // 'file' or 'waveform'
  
  if (!fileName) {
    return new NextResponse('File parameter is required', { status: 400 });
  }
  
  try {
    // Determine the actual file to fetch
    let targetFile = fileName;
    if (type === 'waveform') {
      // For waveform requests, append .dat extension
      targetFile = fileName.endsWith('.dat') ? fileName : `${fileName}.dat`;
    }
    
    // Proxy the file request to the media service
    const fileRes = await fetch(`${mediaServiceUrl}/files/${targetFile}`);
    
    if (!fileRes.ok) {
      console.error(`File not found: ${targetFile}`);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Get the appropriate MIME type
    const contentType = getMimeType(targetFile);
    
    // Create response headers with proper MIME type
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    
    // Copy other relevant headers from the media service response
    const transferHeaders = ['content-length', 'last-modified', 'etag'];
    transferHeaders.forEach(headerName => {
      const value = fileRes.headers.get(headerName);
      if (value) {
        responseHeaders.set(headerName, value);
      }
    });
    
    // For video files, ensure we set proper headers for browser compatibility
    if (contentType.startsWith('video/')) {
      responseHeaders.set('Accept-Ranges', 'bytes');
    }
    
    // Stream the response body directly
    // @ts-expect-error: Next.js Response supports ReadableStream in edge runtime
    return new NextResponse(fileRes.body as ReadableStream<Uint8Array>, { 
      status: 200, 
      headers: responseHeaders 
    });
  } catch (error) {
    console.error('Error proxying media file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}