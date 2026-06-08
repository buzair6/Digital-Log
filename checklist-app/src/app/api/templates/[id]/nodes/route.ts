import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await context.params;

  const body = await req.json();
  const { parentNodeId, orderIndex, title, nodeType, inputType, options, isRequired, helpText } = body;
  if (!title || !nodeType) return NextResponse.json({ error: 'title and nodeType required' }, { status: 400 });

  let depthLevel = 0;
  if (parentNodeId) {
    const parent = await prisma.checklistNode.findUnique({ where: { id: parentNodeId } });
    depthLevel = (parent?.depthLevel ?? 0) + 1;
  }

  const node = await prisma.checklistNode.create({ data: { templateId: id, parentNodeId: parentNodeId ?? null, orderIndex: orderIndex ?? 0, title, nodeType, inputType: inputType ?? null, options: options ?? null, isRequired: isRequired ?? false, helpText: helpText ?? null, depthLevel } });
  return NextResponse.json({ node }, { status: 201 });
}
