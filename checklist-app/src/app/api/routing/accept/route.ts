import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { verifyRoutingToken } from '@/lib/email';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const instanceId = url.searchParams.get('instanceId');
  const groupId = url.searchParams.get('groupId');

  if (!token || !instanceId || !groupId) {
    return NextResponse.redirect(new URL('/login?error=invalid_routing_link', req.url));
  }

  // Verify the token
  const verified = verifyRoutingToken(token);
  if (!verified || verified.instanceId !== instanceId || verified.groupId !== groupId) {
    return NextResponse.redirect(new URL('/login?error=invalid_or_expired_token', req.url));
  }

  // Mark the route as accepted
  try {
    const route = await prisma.checklistRoute.findFirst({
      where: { instanceId, groupId, status: 'PENDING' },
      orderBy: { routedAt: 'desc' },
    });

    if (route) {
      await prisma.checklistRoute.update({
        where: { id: route.id },
        data: { status: 'ACCEPTED' },
      });
    }

    // Update instance status
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { status: 'IN_PROGRESS', routedToGroupId: groupId },
    });

    // Redirect to the fill page
    return NextResponse.redirect(new URL(`/instances/${instanceId}/fill?routed=1`, req.url));
  } catch (err) {
    console.error('Routing accept error:', err);
    return NextResponse.redirect(new URL('/login?error=routing_error', req.url));
  }
}