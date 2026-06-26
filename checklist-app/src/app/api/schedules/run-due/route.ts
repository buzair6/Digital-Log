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

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const now = new Date();
  const due = await prisma.schedule.findMany({ where: { isActive: true, nextRunAt: { lte: now } } });

  let created = 0;
  for (const s of due) {
    const inst = await prisma.checklistInstance.create({
      data: {
        templateId: s.templateId,
        assignedToUserId: s.assignedToUserId,
        routedToGroupId: s.routedToGroupId,
        createdById: s.createdById,
        startedAt: now,
        status: s.routedToGroupId ? 'ROUTED' : 'IN_PROGRESS',
      },
    });
    await prisma.auditLog.create({
      data: { action: 'SCHEDULE_RUN', entityType: 'instance', entityId: inst.id, details: `Auto-created by schedule ${s.name}` },
    });
    const next = computeNextRun(s);
    await prisma.schedule.update({ where: { id: s.id }, data: { lastRunAt: now, nextRunAt: next } });
    created++;
  }
  return NextResponse.json({ ran: created });
}