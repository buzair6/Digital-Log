import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';
import { sendRoutingEmails } from '@/lib/email';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { userId, groupId } = body;
  if (!userId && !groupId) return NextResponse.json({ error: 'userId or groupId required' }, { status: 400 });

  // Load the instance with template info
  const instance = await prisma.checklistInstance.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!instance) return NextResponse.json({ error: 'instance not found' }, { status: 404 });

  const data: any = {};
  if (userId) data.assignedToUserId = userId;
  
  if (groupId) {
    data.routedToGroupId = groupId;
    data.status = 'ROUTED';

    // Load group info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { emailMembers: true },
    });
    if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });

    // Build recipients list from email members + user members
    const userMembers = await prisma.user.findMany({
      where: { groupId },
      select: { email: true, fullName: true },
    });

    const recipients: { email: string; name?: string }[] = [
      ...group.emailMembers.map((m: { email: string; name: string | null }) => ({
        email: m.email,
        name: m.name || undefined,
      })),
      ...userMembers.map((m: { email: string; fullName: string | null }) => ({
        email: m.email,
        name: m.fullName || undefined,
      })),
    ];

    // Send email notifications
    const emailCount = await sendRoutingEmails(
      id,
      groupId,
      group.name,
      recipients,
      instance.template.name,
      instance.template.name, // title fallback
    );

    // Generate signed token
    const { signRoutingToken } = await import('@/lib/email');
    const signedToken = signRoutingToken(id, groupId);

    // Create ChecklistRoute record
    await prisma.checklistRoute.create({
      data: {
        instanceId: id,
        groupId,
        groupName: group.name,
        emailCount,
        signedToken,
        status: 'PENDING',
        routedById: user.id,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ROUTE_CHECKLIST',
        entityType: 'instance',
        entityId: id,
        details: `Routed instance ${id} to group ${group.name} (${groupId}) with ${emailCount} email notifications`,
      },
    });
  }

  const updated = await prisma.checklistInstance.update({ where: { id }, data });
  return NextResponse.json({ instance: updated });
}