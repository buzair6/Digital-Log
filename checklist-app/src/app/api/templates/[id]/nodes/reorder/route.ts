import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await context.params;

  const body = await req.json();
  const { updates } = body; // [{ id, parentNodeId, orderIndex }]
  if (!Array.isArray(updates)) return NextResponse.json({ error: 'updates array required' }, { status: 400 });

  const tx = updates.map((u: any) => prisma.checklistNode.update({ where: { id: u.id }, data: { parentNodeId: u.parentNodeId ?? null, orderIndex: u.orderIndex ?? 0 } }));
  const result = await prisma.$transaction(tx);
  return NextResponse.json({ updated: result.length });
}
