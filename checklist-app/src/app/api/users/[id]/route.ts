import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

async function requireAdmin(req: Request) {
  const u = await getUserFromRequest(req);
  if (!u) return { user: null as { id: string; role: string } | null, err: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) };
  if (u.role !== 'ADMIN') return { user: u, err: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { user: u, err: null };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user: actor, err } = await requireAdmin(req);
  if (err) return err;
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.role === 'string') data.role = body.role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
  if (typeof body.groupId === 'string') data.groupId = body.groupId || null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.fullName === 'string') data.fullName = body.fullName || null;
  if (typeof body.password === 'string' && body.password) data.passwordHash = await hashPassword(body.password);

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, groupId: true, isActive: true },
  });
  await prisma.auditLog.create({
    data: { userId: actor!.id, action: 'UPDATE_USER', entityType: 'user', entityId: id, details: JSON.stringify(data) },
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user: actor, err } = await requireAdmin(req);
  if (err) return err;
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId: actor!.id, action: 'DELETE_USER', entityType: 'user', entityId: id },
  });
  return NextResponse.json({ ok: true });
}