import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

function computeNextRun(s: { cronExpr: string | null; intervalMinutes: number | null; nextRunAt: Date }): Date {
  const now = new Date();
  if (s.intervalMinutes) return new Date(now.getTime() + s.intervalMinutes * 60 * 1000);
  if (s.cronExpr) {
    const m = s.cronExpr.match(/daily\s+(\d{2}):(\d{2})/i);
    if (m) {
      const d = new Date(now);
      d.setHours(+m[1], +m[2], 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d;
    }
    const w = s.cronExpr.match(/weekly\s+(\w+)\s+(\d{2}):(\d{2})/i);
    if (w) {
      const days: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
      const target = days[w[1].toLowerCase()];
      const d = new Date(now);
      d.setHours(+w[2], +w[3], 0, 0);
      let diff = (target - d.getDay() + 7) % 7;
      if (diff === 0 && d <= now) diff = 7;
      d.setDate(d.getDate() + diff);
      return d;
    }
  }
  return s.nextRunAt;
}

async function requireAdmin(req: Request) {
  const u = await getUserFromRequest(req);
  if (!u) return { user: null, err: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }) };
  if (u.role !== 'ADMIN') return { user: u, err: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { user: u, err: null };
}

export async function GET(req: Request) {
  const { err } = await requireAdmin(req);
  if (err) return err;
  const schedules = await prisma.schedule.findMany({
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ schedules });
}

export async function POST(req: Request) {
  const { user, err } = await requireAdmin(req);
  if (err) return err;
  const body = await req.json();
  const { name, templateId, cronExpr, intervalMinutes, assignedToUserId, routedToGroupId } = body;
  if (!name || !templateId) return NextResponse.json({ error: 'name and templateId required' }, { status: 400 });
  if (!cronExpr && !intervalMinutes) return NextResponse.json({ error: 'cronExpr or intervalMinutes required' }, { status: 400 });

  const nextRunAt = computeNextRun({ cronExpr: cronExpr || null, intervalMinutes: intervalMinutes || null, nextRunAt: new Date() });
  const created = await prisma.schedule.create({
    data: { name, templateId, cronExpr: cronExpr || null, intervalMinutes: intervalMinutes || null, nextRunAt, assignedToUserId: assignedToUserId || null, routedToGroupId: routedToGroupId || null, createdById: user!.id },
  });
  await prisma.auditLog.create({ data: { userId: user!.id, action: 'CREATE_SCHEDULE', entityType: 'schedule', entityId: created.id, details: name } });
  return NextResponse.json({ schedule: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { user, err } = await requireAdmin(req);
  if (err) return err;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.schedule.delete({ where: { id } });
  await prisma.auditLog.create({ data: { userId: user!.id, action: 'DELETE_SCHEDULE', entityType: 'schedule', entityId: id } });
  return NextResponse.json({ ok: true });
}