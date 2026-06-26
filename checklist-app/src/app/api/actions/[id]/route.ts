import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

const FLOW: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'DONE'],
  IN_PROGRESS: ['DONE'],
  DONE: ['VERIFIED', 'IN_PROGRESS'],
  VERIFIED: [],
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await ctx.params;
  const { status, evidenceUrl } = await req.json();

  const action = await prisma.correctiveAction.findUnique({ where: { id } });
  if (!action) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (user.role !== 'ADMIN' && action.assignedToUserId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (status && !FLOW[action.status]?.includes(status)) {
    return NextResponse.json({ error: `cannot move ${action.status} -> ${status}` }, { status: 400 });
  }
  if (status === 'VERIFIED' && user.role !== 'ADMIN') return NextResponse.json({ error: 'only admin can verify' }, { status: 403 });

  const updated = await prisma.correctiveAction.update({
    where: { id },
    data: {
      status: status ?? action.status,
      evidenceUrl: evidenceUrl ?? action.evidenceUrl,
      completedAt: (status === 'DONE' || status === 'VERIFIED') ? new Date() : action.completedAt,
    },
  });
  return NextResponse.json({ action: updated });
}