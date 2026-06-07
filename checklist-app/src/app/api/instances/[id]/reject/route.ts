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

  const updated = await prisma.checklistInstance.update({ where: { id: params.id }, data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: user.id, reviewComments: comments } });

  await prisma.auditLog.create({ data: { userId: user.id, action: 'rejected_checklist', entityType: 'instance', entityId: params.id, details: JSON.stringify({ comments }), ipAddress: null } });

  const targets = [];
  if (instance.createdById) targets.push(instance.createdById);
  if (instance.assignedToUserId) targets.push(instance.assignedToUserId);
  for (const t of Array.from(new Set(targets))) {
    await prisma.notification.create({ data: { userId: t, title: 'Checklist rejected', body: `Checklist ${params.id} rejected: ${comments}`, url: `/instances/${params.id}` } });
  }

  return NextResponse.json({ instance: updated });
}
