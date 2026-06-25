import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function DELETE(req: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id: groupId, userId: memberId } = await context.params;

  // Check if this is an email-based member (GroupMember model)
  const emailMember = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (emailMember && emailMember.groupId === groupId) {
    await prisma.groupMember.delete({ where: { id: memberId } });
    return NextResponse.json({ message: 'email member removed' });
  }

  // Otherwise, treat as a user-based member
  const target = await prisma.user.findUnique({ where: { id: memberId } });
  if (!target) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  if (target.groupId !== groupId) return NextResponse.json({ error: 'user not in group' }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: memberId }, data: { groupId: null } });
  return NextResponse.json({ user: { id: updated.id, email: updated.email, groupId: updated.groupId } });
}