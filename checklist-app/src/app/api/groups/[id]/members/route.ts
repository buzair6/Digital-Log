import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

// GET /api/groups/[id]/members - list all members (user + email)
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { id } = await context.params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { select: { id: true, email: true, fullName: true, role: true } },
      emailMembers: true,
    },
  });
  if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    userMembers: group.members,
    emailMembers: group.emailMembers,
  });
}

// POST /api/groups/[id]/members - add a member (can be userId or email)
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await context.params;

  // Verify group exists
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });

  const body = await req.json();
  const { userId, email, name } = body;

  if (userId) {
    // Add existing user to group (set their groupId)
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { groupId: id },
    });

    return NextResponse.json({ user: { id: updated.id, email: updated.email, groupId: updated.groupId } });
  } else if (email) {
    // Add email-based member (external)
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_email: { groupId: id, email } },
    });
    if (existing) {
      return NextResponse.json({ error: 'member already exists with this email' }, { status: 409 });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        email,
        name: name || null,
        addedById: user.id,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } else {
    return NextResponse.json({ error: 'userId or email required' }, { status: 400 });
  }
}