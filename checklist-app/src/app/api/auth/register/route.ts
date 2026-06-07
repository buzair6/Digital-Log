import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, fullName, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: 'user already exists' }, { status: 409 });
  }

  const user = await createUser(email, password, fullName, role || 'USER');

  // Do not return sensitive fields
  const safe = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  return NextResponse.json({ user: safe }, { status: 201 });
}
