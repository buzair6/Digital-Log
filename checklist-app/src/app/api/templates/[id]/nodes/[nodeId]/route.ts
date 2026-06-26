import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

async function collectDescendants(templateId: string, nodeId: string) {
  const ids = [nodeId];
  for (let i = 0; i < ids.length; i++) {
    const children = await prisma.checklistNode.findMany({ where: { templateId, parentNodeId: ids[i] }, select: { id: true } });
    for (const c of children) ids.push(c.id);
  }
  return ids;
}

export async function PUT(req: Request, context: { params: Promise<{ id: string; nodeId: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { nodeId } = await context.params;

  const body = await req.json();
  const { parentNodeId, orderIndex, title, nodeType, inputType, options, isRequired, helpText, minValue, maxValue, exceptionAction } = body;
  const data: any = { parentNodeId: parentNodeId ?? null, orderIndex, title, nodeType, inputType: inputType ?? null, options: options ?? null, isRequired: isRequired ?? false, helpText: helpText ?? null, minValue: minValue ?? null, maxValue: maxValue ?? null, exceptionAction: exceptionAction ?? null };

  // compute depth if parent changed
  if (parentNodeId) {
    const parent = await prisma.checklistNode.findUnique({ where: { id: parentNodeId } });
    data.depthLevel = (parent?.depthLevel ?? 0) + 1;
  }

  const updated = await prisma.checklistNode.update({ where: { id: nodeId }, data });
  return NextResponse.json({ node: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; nodeId: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id, nodeId } = await context.params;

  const ids = await collectDescendants(id, nodeId);
  await prisma.checklistNode.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: ids.length });
}
