import { NextResponse } from 'next/server';
import { prisma, hashPassword } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const safe = users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, groupId: u.groupId, isActive: u.isActive, createdAt: u.createdAt }));
  return NextResponse.json({ users: safe });
}

export async function POST(req: Request) {
  const admin = await getUserFromRequest(req);
  if (!admin) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (admin.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { email, password, fullName, role = 'USER', groupId } = body;
  if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'email exists' }, { status: 400 });

  const hashed = await hashPassword(password);
  const created = await prisma.user.create({ data: { email, passwordHash: hashed, fullName, role, groupId } });
  const safe = { id: created.id, email: created.email, fullName: created.fullName, role: created.role, groupId: created.groupId };
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'created_user', entityType: 'user', entityId: created.id, details: JSON.stringify({ email: created.email, role: created.role }), ipAddress: null } });
  return NextResponse.json({ user: safe }, { status: 201 });
}
