import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const instance = await prisma.checklistInstance.findUnique({ where: { id: params.id }, include: { template: true, responses: { include: { filledBy: true } }, createdBy: true, assignedToUser: true, reviewedBy: true } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // permission: admins or instance creator/assignee/reviewer
  if (user.role !== 'ADMIN' && user.id !== instance.createdById && user.id !== instance.assignedToUserId && user.id !== instance.reviewedById) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // fetch audit logs for this instance
  const audits = await prisma.auditLog.findMany({ where: { entityType: 'instance', entityId: params.id }, orderBy: { createdAt: 'asc' } });

  // build response history from audits + responses
  const responseHistory = (instance.responses || []).map(r => ({ id: r.id, nodeId: r.nodeId, value: r.value, fileUrl: r.fileUrl, filledBy: r.filledBy ? { id: r.filledBy.id, fullName: r.filledBy.fullName } : null, filledAt: r.filledAt, isComplete: r.isComplete }));

  return NextResponse.json({ instance: { id: instance.id, status: instance.status, template: { id: instance.template.id, name: instance.template.name }, createdById: instance.createdById, assignedToUserId: instance.assignedToUserId, routedToGroupId: instance.routedToGroupId, createdAt: instance.createdAt, submittedAt: instance.submittedAt, reviewedAt: instance.reviewedAt }, responses: responseHistory, audits });
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const instance = await prisma.checklistInstance.findUnique({ where: { id: params.id } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // permission: admin, assignee, or member of routed group
  if (user.role !== 'ADMIN' && instance.assignedToUserId !== user.id && user.groupId !== instance.routedToGroupId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const audit = await prisma.auditLog.findMany({ where: { entityType: 'instance', entityId: params.id }, orderBy: { createdAt: 'asc' } });
  const responses = await prisma.checklistResponse.findMany({ where: { instanceId: params.id }, include: { filledBy: true }, orderBy: { filledAt: 'asc' } });

  return NextResponse.json({ audit, responses });
}
