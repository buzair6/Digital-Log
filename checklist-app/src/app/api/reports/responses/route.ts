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

  const responses = await prisma.checklistResponse.findMany({
    include: {
      instance: { select: { id: true, template: { select: { name: true } } } },
      node: { select: { title: true, inputType: true } },
      filledBy: { select: { email: true, fullName: true } },
    },
    orderBy: { filledAt: 'desc' },
  });

  const header = ['Instance ID', 'Template', 'Question', 'Input Type', 'Value', 'Filled By', 'Filled At'];
  const rows = responses.map((r) => [
    r.instance.id, r.instance.template.name, r.node.title, r.node.inputType || '',
    r.value || '',
    r.filledBy ? (r.filledBy.fullName || r.filledBy.email) : '',
    new Date(r.filledAt).toISOString(),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="checklist-responses.csv"' },
  });
}