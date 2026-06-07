import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const templates = await prisma.checklistTemplate.findMany({ select: { id: true, name: true, description: true, version: true, isActive: true, createdAt: true } });
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, description, defaultRoutingGroupId, isActive } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const template = await prisma.checklistTemplate.create({ data: { name, description, createdById: user.id, defaultRoutingGroupId: defaultRoutingGroupId || null, isActive: isActive ?? true } });
  return NextResponse.json({ template }, { status: 201 });
}
