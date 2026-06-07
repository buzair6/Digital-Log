import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany();
    const todos = await prisma.todo.findMany({
      include: { user: true },
    });

    const stats = {
      totalUsers: users.length,
      totalTodos: todos.length,
      completedTodos: todos.filter(t => t.completed).length,
    };

    return NextResponse.json({
      stats,
      todos,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
