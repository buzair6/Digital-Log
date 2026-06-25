import crypto from 'crypto';
import { prisma } from './prisma';

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-session-secret-change-me';

/**
 * Token format: base64url(payloadJson).base64url(hmac)
 * payload = { uid, iat, exp }
 */
export function signSessionToken(userId: string, ttlSeconds = 7 * 24 * 3600): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const payload = JSON.stringify({ uid: userId, iat, exp });
  const payloadB64 = Buffer.from(payload, 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): { uid: string; exp: number } | null {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: payload.uid, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: Request) {
  const token = readTokenFromRequest(req);
  if (!token) return null;
  const claims = verifySessionToken(token);
  if (!claims) return null;
  return prisma.user.findUnique({ where: { id: claims.uid } });
}

export function readTokenFromRequest(req: Request): string | null {
  // 1) Authorization: Bearer <token>
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (auth) {
    const parts = auth.split(' ');
    const t = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];
    if (t) return t;
  }
  // 2) Cookie: session_token=...
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const m = cookieHeader
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('session_token='));
    if (m) return m.split('=')[1];
  }
  return null;
}

export function sessionCookie(token: string) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  return `session_token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}

export function clearSessionCookie() {
  return `session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}