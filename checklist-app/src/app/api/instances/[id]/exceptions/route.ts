import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

// POST /api/instances/[id]/exceptions
// Body: { exceptions: [{ nodeId, title, value }] }
// Creates an in-app notification for every admin so they're alerted to out-of-range readings.
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const instance = await prisma.checklistInstance.findUnique({
    where: { id },
    include: { template: { select: { name: true } } },
  });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json();
  const exceptions: Array<{ nodeId: string; title: string; value: string }> = body.exceptions || [];
  if (!exceptions.length) return NextResponse.json({ notified: 0 });

  // Notify every admin
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
  const summary = exceptions.map((e) => `${e.title} = ${e.value}`).join('; ');
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      title: `Exception on "${instance.template.name}"`,
      body: `Out-of-range reading(s): ${summary}. Reported by ${user.email}.`,
      url: `/instances/${id}/fill`,
    })),
  });

  // Also write an audit log entry
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'EXCEPTION_DETECTED',
      entityType: 'instance',
      entityId: id,
      details: summary,
    },
  });

  return NextResponse.json({ notified: admins.length });
}