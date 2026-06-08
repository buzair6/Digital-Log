import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const body = await req.json();
  const { comments } = body;

  const instance = await prisma.checklistInstance.findUnique({ where: { id } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // permission: admin or member of routed group
  if (user.role !== 'ADMIN' && user.groupId !== instance.routedToGroupId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const updated = await prisma.checklistInstance.update({ where: { id }, data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: user.id, reviewComments: comments ?? null } });

  await prisma.auditLog.create({ data: { userId: user.id, action: 'approved_checklist', entityType: 'instance', entityId: id, details: JSON.stringify({ comments }), ipAddress: null } });

  // notify creator and assignee
  const targets = [];
  if (instance.createdById) targets.push(instance.createdById);
  if (instance.assignedToUserId) targets.push(instance.assignedToUserId);
  for (const t of Array.from(new Set(targets))) {
    await prisma.notification.create({ data: { userId: t, title: 'Checklist approved', body: `Checklist ${id} approved by ${user.fullName ?? user.email}`, url: `/instances/${id}` } });
  }

  return NextResponse.json({ instance: updated });
}
