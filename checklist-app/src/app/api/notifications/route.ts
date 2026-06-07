import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ notifications });
}

export async function PUT(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  if (body.readAll) {
    await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid' }, { status: 400 });
}
