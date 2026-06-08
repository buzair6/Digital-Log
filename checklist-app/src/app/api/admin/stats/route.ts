import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const [totalUsers, totalTemplates, totalInstances] = await Promise.all([
      prisma.user.count(),
      prisma.checklistTemplate.count({ where: { isActive: true } }),
      prisma.checklistInstance.count(),
    ]);

    const stats = {
      totalUsers,
      totalTemplates,
      totalInstances,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
