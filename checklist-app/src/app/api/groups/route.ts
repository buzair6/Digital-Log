import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const groups = await prisma.group.findMany({
    include: {
      members: { select: { id: true, email: true, fullName: true } },
      emailMembers: true,
    },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, description, type } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const group = await prisma.group.create({
    data: { name, description: description || null, type: type || 'CUSTOM', createdById: user.id },
    include: { members: true, emailMembers: true },
  });
  return NextResponse.json({ group }, { status: 201 });
}