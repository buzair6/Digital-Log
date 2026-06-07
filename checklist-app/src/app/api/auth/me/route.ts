import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ user: null });
  const safe = { id: user.id, email: user.email, fullName: user.fullName, role: user.role, groupId: user.groupId };
  return NextResponse.json({ user: safe });
}
