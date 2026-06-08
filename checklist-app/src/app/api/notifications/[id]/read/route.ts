import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json({ notification: updated });
}
