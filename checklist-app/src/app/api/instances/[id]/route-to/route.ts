import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { userId, groupId } = body;
  if (!userId && !groupId) return NextResponse.json({ error: 'userId or groupId required' }, { status: 400 });

  const data: any = {};
  if (userId) data.assignedToUserId = userId;
  if (groupId) data.routedToGroupId = groupId;

  const updated = await prisma.checklistInstance.update({ where: { id }, data });
  return NextResponse.json({ instance: updated });
}
