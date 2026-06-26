import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static/Next internals
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(svg|png|jpg|ico|manifest|js)$/)
  ) {
    return NextResponse.next();
  }

  // Read token from cookie (or Authorization header)
  const token =
    req.cookies.get('session_token')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null;

  const claims = token ? verifySessionToken(token) : null;
  const isAuthenticated = !!claims;
  const isAdmin = isAuthenticated && (claims as any).role === 'ADMIN';

  // Not authenticated -> force to login (except API which returns 401)
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Non-admins cannot reach /admin or admin APIs
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && !isAdmin) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const dashUrl = req.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashUrl);
  }

  // Authenticated user hitting root -> send to right dashboard
  if (pathname === '/') {
    const target = isAdmin ? '/admin/dashboard' : '/dashboard';
    const url = req.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
