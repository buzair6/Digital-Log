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

export async function PUT(req: Request, { params }: { params: { id: string; nodeId: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { parentNodeId, orderIndex, title, nodeType, inputType, options, isRequired, helpText } = body;
  const data: any = { parentNodeId: parentNodeId ?? null, orderIndex, title, nodeType, inputType: inputType ?? null, options: options ?? null, isRequired: isRequired ?? false, helpText: helpText ?? null };

  // compute depth if parent changed
  if (parentNodeId) {
    const parent = await prisma.checklistNode.findUnique({ where: { id: parentNodeId } });
    data.depthLevel = (parent?.depthLevel ?? 0) + 1;
  }

  const updated = await prisma.checklistNode.update({ where: { id: params.nodeId }, data });
  return NextResponse.json({ node: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string; nodeId: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const ids = await collectDescendants(params.id, params.nodeId);
  await prisma.checklistNode.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ deleted: ids.length });
}
