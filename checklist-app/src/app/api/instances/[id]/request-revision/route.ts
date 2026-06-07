import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  const { comments } = body;
  if (!comments) return NextResponse.json({ error: 'comments required' }, { status: 400 });

  const instance = await prisma.checklistInstance.findUnique({ where: { id: params.id } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (user.role !== 'ADMIN' && user.groupId !== instance.routedToGroupId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const updated = await prisma.checklistInstance.update({ where: { id: params.id }, data: { status: 'REVISION_REQUESTED', reviewedAt: new Date(), reviewedById: user.id, reviewComments: comments } });

  await prisma.auditLog.create({ data: { userId: user.id, action: 'revision_requested', entityType: 'instance', entityId: params.id, details: JSON.stringify({ comments }), ipAddress: null } });

  // notify assignee
  if (instance.assignedToUserId) {
    await prisma.notification.create({ data: { userId: instance.assignedToUserId, title: 'Revision requested', body: `Revision requested for checklist ${params.id}: ${comments}`, url: `/instances/${params.id}` } });
  }

  return NextResponse.json({ instance: updated });
}
