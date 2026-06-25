import { NextResponse } from 'next/server';
import { validateUserCredentials } from '@/lib/auth';
import { signSessionToken, sessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await validateUserCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = signSessionToken(user.id);
  const safe = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };

  const res = NextResponse.json({ user: safe });
  res.headers.set('Set-Cookie', sessionCookie(token));
  return res;
}