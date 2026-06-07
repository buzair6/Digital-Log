import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const instance = await prisma.checklistInstance.findUnique({ where: { id: params.id } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // only assignee or admin can write responses
  if (user.role !== 'ADMIN' && instance.assignedToUserId !== user.id && instance.createdById !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { responses } = body; // array of { nodeId, value, fileUrl, isComplete }
  if (!Array.isArray(responses)) return NextResponse.json({ error: 'responses array required' }, { status: 400 });

  const results: any[] = [];
  for (const r of responses) {
    const existing = await prisma.checklistResponse.findFirst({ where: { instanceId: params.id, nodeId: r.nodeId } });
    if (existing) {
      const updated = await prisma.checklistResponse.update({ where: { id: existing.id }, data: { value: r.value ?? existing.value, fileUrl: r.fileUrl ?? existing.fileUrl, filledByUserId: user.id, filledAt: new Date(), isComplete: r.isComplete ?? existing.isComplete } });
      results.push(updated);
    } else {
      const created = await prisma.checklistResponse.create({ data: { instanceId: params.id, nodeId: r.nodeId, value: r.value ?? null, fileUrl: r.fileUrl ?? null, filledByUserId: user.id, isComplete: r.isComplete ?? false } });
      results.push(created);
    }
  }

  // update instance updatedAt
  await prisma.checklistInstance.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ responses: results });
}
