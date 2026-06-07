import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // assign user's groupId
  const updated = await prisma.user.update({ where: { id: userId }, data: { groupId: params.id } });
  return NextResponse.json({ user: { id: updated.id, email: updated.email, groupId: updated.groupId } });
}
