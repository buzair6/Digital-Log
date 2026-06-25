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

export async function GET(req: Request) {
  const { err } = await requireAdmin(req);
  if (err) return err;
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, groupId: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const { user: actor, err } = await requireAdmin(req);
  if (err) return err;
  const body = await req.json();
  const { email, password, fullName, role, groupId } = body;
  if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }
  const safeRole = String(role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      fullName: fullName || null,
      role: safeRole,
      groupId: groupId || null,
    },
  });
  await prisma.auditLog.create({
    data: { userId: actor!.id, action: 'CREATE_USER', entityType: 'user', entityId: created.id, details: `Created ${email} (${safeRole})` },
  });
  return NextResponse.json({ user: { id: created.id, email: created.email, role: created.role } }, { status: 201 });
}