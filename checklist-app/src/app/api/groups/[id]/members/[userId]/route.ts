import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function DELETE(req: Request, { params }: { params: { id: string; userId: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // only remove if the user is currently in this group
  const target = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!target) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  if (target.groupId !== params.id) return NextResponse.json({ error: 'user not in group' }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: params.userId }, data: { groupId: null } });
  return NextResponse.json({ user: { id: updated.id, email: updated.email, groupId: updated.groupId } });
}
