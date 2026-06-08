import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const comments = await prisma.checklistComment.findMany({ where: { instanceId: id }, include: { author: true }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ comments });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  // Only supervisors and admins can add inline review comments
  if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { nodeId, text } = body;
  if (!text || !text.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });

  // verify instance exists
  const instance = await prisma.checklistInstance.findUnique({ where: { id } });
  if (!instance) return NextResponse.json({ error: 'instance not found' }, { status: 404 });

  const created = await prisma.checklistComment.create({ data: { instanceId: id, nodeId: nodeId ?? null, authorId: user.id, text } });

  // notify assigned user if present
  if (instance.assignedToUserId) {
    await prisma.notification.create({ data: { userId: instance.assignedToUserId, title: 'New review comment', body: text.slice(0, 200), url: `/instances/${id}` } });
  }

  await prisma.auditLog.create({ data: { userId: user.id, action: 'added_comment', entityType: 'instance', entityId: id, details: JSON.stringify({ nodeId, text }), ipAddress: null } });

  return NextResponse.json({ comment: created });
}
