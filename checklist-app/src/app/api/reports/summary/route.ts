import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const instances = await prisma.checklistInstance.findMany({
    include: { template: { select: { name: true } }, assignedToUser: { select: { email: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const header = ['Instance ID', 'Template', 'Status', 'Assignee', 'Created', 'Submitted'];
  const rows = instances.map((i) => [
    i.id, i.template.name, i.status,
    i.assignedToUser ? (i.assignedToUser.fullName || i.assignedToUser.email) : '',
    new Date(i.createdAt).toISOString(),
    i.submittedAt ? new Date(i.submittedAt).toISOString() : '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="checklist-summary.csv"',
    },
  });
}