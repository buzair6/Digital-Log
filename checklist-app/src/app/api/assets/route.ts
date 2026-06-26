import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { tag, name, location, notes } = await req.json();
  if (!tag || !name) return NextResponse.json({ error: 'tag and name required' }, { status: 400 });
  if (await prisma.asset.findUnique({ where: { tag } })) return NextResponse.json({ error: 'tag already exists' }, { status: 409 });
  const created = await prisma.asset.create({ data: { tag, name, location: location || null, notes: notes || null } });
  await prisma.auditLog.create({ data: { userId: user.id, action: 'CREATE_ASSET', entityType: 'asset', entityId: created.id, details: `${tag} ${name}` } });
  return NextResponse.json({ asset: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.asset.delete({ where: { id } });
  await prisma.auditLog.create({ data: { userId: user.id, action: 'DELETE_ASSET', entityType: 'asset', entityId: id } });
  return NextResponse.json({ ok: true });
}