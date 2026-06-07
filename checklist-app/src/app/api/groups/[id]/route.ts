import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const group = await prisma.group.findUnique({ where: { id: params.id }, include: { members: true, createdBy: true } });
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ group });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, description, type } = body;
  const group = await prisma.group.update({ where: { id: params.id }, data: { name, description, type } });
  return NextResponse.json({ group });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
