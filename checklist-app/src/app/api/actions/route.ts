import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const instanceId = url.searchParams.get('instanceId') || undefined;

  const where: any = {};
  if (status) where.status = status;
  if (instanceId) where.instanceId = instanceId;
  if (user.role !== 'ADMIN') where.assignedToUserId = user.id;

  const actions = await prisma.correctiveAction.findMany({
    where,
    include: { assignedToUser: { select: { email: true, fullName: true } }, instance: { select: { template: { select: { name: true } } } } },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
  return NextResponse.json({ actions });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const b = await req.json();
  if (!b.instanceId || !b.title) return NextResponse.json({ error: 'instanceId and title required' }, { status: 400 });

  const action = await prisma.correctiveAction.create({
    data: {
      instanceId: b.instanceId,
      nodeId: b.nodeId || null,
      title: b.title,
      description: b.description || null,
      priority: b.priority || 'MEDIUM',
      assignedToUserId: b.assignedToUserId || null,
      dueDate: b.dueDate ? new Date(b.dueDate) : null,
      createdById: user.id,
    },
  });

  await prisma.checklistInstance.update({ where: { id: b.instanceId }, data: { flaggedCount: { increment: 1 } } });
  if (b.assignedToUserId) {
    await prisma.notification.create({ data: { userId: b.assignedToUserId, title: 'Corrective action assigned', body: b.title, url: '/actions' } });
  }
  await prisma.auditLog.create({ data: { userId: user.id, action: 'CREATE_ACTION', entityType: 'action', entityId: action.id, details: b.title } });
  return NextResponse.json({ action }, { status: 201 });
}