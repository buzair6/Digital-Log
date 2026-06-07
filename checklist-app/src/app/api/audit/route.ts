import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const entityType = url.searchParams.get('entityType') ?? undefined;
  const entityId = url.searchParams.get('entityId') ?? undefined;
  const userId = url.searchParams.get('userId') ?? undefined;
  const action = url.searchParams.get('action') ?? undefined;
  const take = Number(url.searchParams.get('take') ?? 50);
  const skip = Number(url.searchParams.get('skip') ?? 0);

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip });
  return NextResponse.json({ logs });
}
