import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './api/auth/session';

const PUBLIC_PATHS = [
  /^\/login($|\/)/,
  /^\/project\/\d+\/song\/\d+($|\/)/, // public deep-link to song details
  /^\/$/
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow public paths
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }
  // Check session for all other pages
  const session = await validateSession();
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api|public).*)'],
}; 