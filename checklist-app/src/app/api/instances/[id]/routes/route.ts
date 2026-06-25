import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  // Verify instance exists and user has access
  const instance = await prisma.checklistInstance.findUnique({ where: { id } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (user.role !== 'ADMIN' && instance.assignedToUserId !== user.id && instance.routedToGroupId !== user.groupId && instance.createdById !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const routes = await prisma.checklistRoute.findMany({
    where: { instanceId: id },
    include: {
      group: { select: { name: true } },
      routedBy: { select: { email: true, fullName: true } },
    },
    orderBy: { routedAt: 'desc' },
  });

  return NextResponse.json({ routes });
}