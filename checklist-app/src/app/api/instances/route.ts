import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const assignee = url.searchParams.get('assignee');
  const template = url.searchParams.get('template');
  const group = url.searchParams.get('group');
  const mine = url.searchParams.get('mine') === '1';

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (assignee) where.assignedToUserId = assignee;
  if (template) where.templateId = template;
  if (group) where.routedToGroupId = group;

  if (user.role !== 'ADMIN' || mine) {
    where.OR = [
      { assignedToUserId: user.id },
      { routedToGroupId: user.groupId },
      { createdById: user.id },
    ];
  }

  const instances = await prisma.checklistInstance.findMany({
    where,
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ instances });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  const { templateId, assignedToUserId, routedToGroupId, assetId } = body;
  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

  const inst = await prisma.checklistInstance.create({
    data: {
      templateId,
      assignedToUserId: assignedToUserId ?? null,
      routedToGroupId: routedToGroupId ?? null,
      assetId: assetId ?? null,
      createdById: user.id,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
    },
  });
  return NextResponse.json({ instance: inst }, { status: 201 });
}
