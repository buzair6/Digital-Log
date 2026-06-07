import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const instance = await prisma.checklistInstance.findUnique({ where: { id: params.id }, include: { template: true } });
  if (!instance) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // only assignee or admin can submit
  if (user.role !== 'ADMIN' && instance.assignedToUserId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // validate required fields
  const requiredNodes = await prisma.checklistNode.findMany({ where: { templateId: instance.templateId, isRequired: true, nodeType: 'QUESTION' } });
  const missing: string[] = [];
  for (const n of requiredNodes) {
    const resp = await prisma.checklistResponse.findFirst({ where: { instanceId: instance.id, nodeId: n.id } });
    if (!resp || resp.value == null || (typeof resp.value === 'string' && resp.value.trim() === '')) {
      missing.push(n.id);
    }
  }
  if (missing.length) return NextResponse.json({ error: 'missing required fields', missing }, { status: 400 });

  // route to group's default if not set
  let routedGroupId = instance.routedToGroupId;
  // Evaluate routing rules (if any) on the template. routingRules stored as JSON string.
  try {
    const rulesRaw = (instance.template as any).routingRules;
    if (rulesRaw) {
      const parsed = JSON.parse(rulesRaw);
      const rules = Array.isArray(parsed) ? parsed : [parsed];
      // fetch all responses for instance once
      const allResponses = await prisma.checklistResponse.findMany({ where: { instanceId: instance.id } });
      const respMap: Record<string, any> = {};
      for (const r of allResponses) respMap[r.nodeId] = r;

      for (const rule of rules) {
        const cond = rule.condition;
        if (!cond || !cond.node_id) continue;
        const resp = respMap[cond.node_id];
        const respVal = resp?.value ?? null;
        const op = (cond.operator || 'equals').toLowerCase();
        let match = false;
        if (op === 'equals') match = String(respVal) === String(cond.value);
        else if (op === 'not_equals') match = String(respVal) !== String(cond.value);
        else if (op === 'contains') match = String(respVal || '').includes(String(cond.value));

        if (match) {
          routedGroupId = rule.route_to_group_id ?? rule.routeToGroupId ?? routedGroupId;
          break;
        }
      }
    }
  } catch (e) {
    // ignore routing rule parse errors and fall back to defaults
    // console.warn('routing rules parse error', e)
  }

  if (!routedGroupId) routedGroupId = instance.template.defaultRoutingGroupId ?? null;

  const updated = await prisma.checklistInstance.update({ where: { id: instance.id }, data: { status: 'SUBMITTED', submittedAt: new Date(), routedToGroupId: routedGroupId } });

  // create notification for routed group's members
  if (routedGroupId) {
    const members = await prisma.user.findMany({ where: { groupId: routedGroupId } });
    for (const m of members) {
      await prisma.notification.create({ data: { userId: m.id, title: 'Checklist submitted', body: `Checklist ${instance.id} submitted`, url: `/instances/${instance.id}` } });
    }
  }

  return NextResponse.json({ instance: updated });
}
