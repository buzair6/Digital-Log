import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/auth'
import { getUserFromRequest } from '@/lib/session'

async function collectSubtree(templateId: string, rootNodeId: string) {
  // BFS collect nodes in subtree
  const nodes: any[] = []
  const queue = [rootNodeId]
  while (queue.length) {
    const parentId = queue.shift()!
    const children = await prisma.checklistNode.findMany({
      where: { templateId, parentNodeId: parentId },
      orderBy: { orderIndex: 'asc' },
    })
    for (const c of children) {
      nodes.push(c)
      queue.push(c.id)
    }
  }
  return nodes
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string; nodeId: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: templateId, nodeId } = await context.params

  // Fetch the root node
  const root = await prisma.checklistNode.findUnique({ where: { id: nodeId } })
  if (!root || root.templateId !== templateId) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  // Only admins may duplicate templates/nodes
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Collect subtree (including root)
  const subtree = [root]
  const children = await collectSubtree(templateId, nodeId)
  subtree.push(...children)

  // We'll create copies in BFS order so parents exist before children
  // Map oldId -> newId
  const idMap: Record<string, string> = {}

  // Duplicate root as sibling under same parent
  const newRoot = await prisma.checklistNode.create({
    data: {
      templateId: root.templateId,
      parentNodeId: root.parentNodeId,
      orderIndex: root.orderIndex + 1,
      title: root.title + ' (Copy)',
      nodeType: root.nodeType,
      inputType: root.inputType,
      options: root.options,
      isRequired: root.isRequired,
      helpText: root.helpText,
      depthLevel: root.depthLevel,
    },
  })
  idMap[root.id] = newRoot.id

  // Now duplicate children; use queue ordering of subtree excluding root
  for (const node of subtree.slice(1)) {
    const newParentId = node.parentNodeId && idMap[node.parentNodeId] ? idMap[node.parentNodeId] : node.parentNodeId
    const created = await prisma.checklistNode.create({
      data: {
        templateId: node.templateId,
        parentNodeId: newParentId,
        orderIndex: node.orderIndex,
        title: node.title,
        nodeType: node.nodeType,
        inputType: node.inputType,
        options: node.options,
        isRequired: node.isRequired,
        helpText: node.helpText,
        depthLevel: node.depthLevel,
      },
    })
    idMap[node.id] = created.id
  }

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'duplicate_node',
      entityType: 'checklist_node',
      entityId: nodeId,
      details: JSON.stringify({ duplicatedNodeId: idMap[root.id], originalNodeId: nodeId }),
      ipAddress: (req.headers.get('x-forwarded-for') ?? null) as string | null,
    },
  })

  return NextResponse.json({ duplicatedNodeId: idMap[root.id] })
}
