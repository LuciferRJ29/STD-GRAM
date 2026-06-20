import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'];
const ACCESS_COOKIE_NAME = 'tg_access_token';
const REFRESH_COOKIE_NAME = 'tg_refresh_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasSession =
    req.cookies.has(ACCESS_COOKIE_NAME) || req.cookies.has(REFRESH_COOKIE_NAME);

  // This is a cheap presence check for UX redirects only - it does NOT
  // verify the token signature (that happens server-side in requireAuth()
  // for every API route). A forged cookie gets past this redirect but is
  // rejected by every actual data-returning endpoint.
  if (!isPublicPath && pathname !== '/' && !hasSession && pathname.startsWith('/chats')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isPublicPath && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/chats';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chats/:path*', '/login', '/register', '/verify', '/forgot-password', '/reset-password'],
};
