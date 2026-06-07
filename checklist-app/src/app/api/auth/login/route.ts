import { NextResponse } from 'next/server';
import { validateUserCredentials } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const user = await validateUserCredentials(email, password);
  if (!user) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });

  // Development token: base64 user id (replace with JWT in production)
  const token = Buffer.from(user.id).toString('base64');

  const safe = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  return NextResponse.json({ user: safe, token });
}
