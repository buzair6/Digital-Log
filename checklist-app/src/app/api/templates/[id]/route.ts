import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

type TemplateNodeRecord = {
  id: string;
  parentNodeId: string | null;
  orderIndex: number;
};

type TemplateNode = TemplateNodeRecord & {
  children: TemplateNode[];
};

function buildTree(nodes: TemplateNodeRecord[]) {
  const map = new Map<string, TemplateNode>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: TemplateNode[] = [];
  for (const node of map.values()) {
    if (!node.parentNodeId) roots.push(node);
    else {
      const parent = map.get(node.parentNodeId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  // sort children by orderIndex
  const sortRec = (arr: TemplateNode[]) => {
    arr.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const template = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const nodes = await prisma.checklistNode.findMany({ where: { templateId: id } });
  const tree = buildTree(nodes.map((n) => ({ ...n })));
  return NextResponse.json({ template, nodes: tree });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await context.params;

  const body = await req.json();
  const { name, description, defaultRoutingGroupId, isActive } = body;

  // if there are existing instances, create a new version instead of mutating
  const instanceCount = await prisma.checklistInstance.count({ where: { templateId: id } });
  if (instanceCount > 0) {
    const old = await prisma.checklistTemplate.findUnique({ where: { id }, include: { nodes: true } });
    const newTemplate = await prisma.checklistTemplate.create({ data: { name: name ?? old?.name ?? 'Copy', description: description ?? old?.description, createdById: user.id, version: (old?.version ?? 1) + 1, isActive: isActive ?? true, defaultRoutingGroupId: defaultRoutingGroupId ?? old?.defaultRoutingGroupId } });
    // duplicate nodes
    if (old?.nodes?.length) {
      const createNodes = old.nodes.map((n) => ({ templateId: newTemplate.id, parentNodeId: n.parentNodeId, orderIndex: n.orderIndex, title: n.title, nodeType: n.nodeType, inputType: n.inputType, options: n.options, isRequired: n.isRequired, helpText: n.helpText, depthLevel: n.depthLevel }));
      await prisma.checklistNode.createMany({ data: createNodes });
    }
    return NextResponse.json({ template: newTemplate }, { status: 201 });
  }

  const updated = await prisma.checklistTemplate.update({ where: { id }, data: { name, description, defaultRoutingGroupId, isActive } });
  return NextResponse.json({ template: updated });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await context.params;

  // soft delete
  const updated = await prisma.checklistTemplate.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ template: updated });
}
