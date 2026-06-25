import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: true, emailMembers: true },
  });
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ group });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json();
  const { name, description, type } = body;

  const updated = await prisma.group.update({
    where: { id },
    data: { name, description, type: type || 'CUSTOM' },
  });

  return NextResponse.json({ group: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await context.params;
  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ message: 'deleted' });
}