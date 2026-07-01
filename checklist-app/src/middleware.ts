import { NextRequest, NextResponse } from 'next/server';

const SECRET =
  process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

/**
 * Edge‑compatible token verification using Web Crypto API (SubtleCrypto).
 * Token format: base64url(payload).base64url(hmac)
 * payload = { uid, role, iat, exp }
 */
async function verifySessionTokenEdge(
  token: string,
): Promise<{ uid: string; role: string; exp: number } | null> {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;

    // Convert base64url → base64
    const b64 = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');

    // Decode the payload to check expiration first (fast path)
    const payloadJson = new TextDecoder().decode(
      Uint8Array.from(atob(b64(payloadB64)), (c) => c.charCodeAt(0)),
    );
    const payload = JSON.parse(payloadJson);
    if (
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    // Verify HMAC-SHA256 using Web Crypto
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigBytes = Uint8Array.from(atob(b64(sig)), (c) => c.charCodeAt(0));
    const payloadBytes = enc.encode(payloadB64);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
    if (!isValid) return null;

    return { uid: payload.uid, role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
}

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

  const claims = token ? await verifySessionTokenEdge(token) : null;
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
