import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const instance = await prisma.checklistInstance.findUnique({ where: { id: params.id }, include: { responses: true, template: true, createdBy: true, assignedToUser: true, routedToGroup: true } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // permission: admin, assignee, or members of routed group
  if (user.role !== 'ADMIN' && instance.assignedToUserId !== user.id && instance.routedToGroupId !== user.groupId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.json({ instance });
}
