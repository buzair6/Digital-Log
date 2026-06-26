import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const instance = await prisma.checklistInstance.findUnique({ where: { id } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // only assignee, creator, or admin can write responses
  if (user.role !== 'ADMIN'
      && instance.assignedToUserId !== user.id
      && instance.createdById !== user.id
      && instance.routedToGroupId !== user.groupId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Don't allow editing submitted/approved/rejected instances
  if (instance.status === 'SUBMITTED' || instance.status === 'APPROVED' || instance.status === 'REJECTED') {
    return NextResponse.json({ error: 'checklist is read-only in its current state' }, { status: 400 });
  }

  const body = await req.json();
  // Accept either { responses: [...] } or { updates: [...] } for backward compat
  const responses = Array.isArray(body.responses) ? body.responses
                  : Array.isArray(body.updates) ? body.updates
                  : null;
  if (!responses) return NextResponse.json({ error: 'responses array required' }, { status: 400 });

  const results: any[] = [];
  for (const r of responses) {
    const existing = await prisma.checklistResponse.findFirst({ where: { instanceId: id, nodeId: r.nodeId } });
    if (existing) {
      const updated = await prisma.checklistResponse.update({
        where: { id: existing.id },
        data: {
          value: r.value ?? existing.value,
          fileUrl: r.fileUrl ?? existing.fileUrl,
          filledByUserId: user.id,
          filledAt: new Date(),
          isComplete: r.isComplete ?? existing.isComplete,
        },
      });
      results.push(updated);
    } else {
      const created = await prisma.checklistResponse.create({
        data: {
          instanceId: id, nodeId: r.nodeId,
          value: r.value ?? null, fileUrl: r.fileUrl ?? null,
          filledByUserId: user.id, isComplete: r.isComplete ?? false,
        },
      });
      results.push(created);
    }
  }

  await prisma.checklistInstance.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ responses: results });
}