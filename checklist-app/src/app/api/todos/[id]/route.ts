import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const { id } = await context.params;

    const body = await request.json();
    const { completed } = body;

    const existing = await prisma.todo.findUnique({ where: { id } });
    if (!existing || (existing.userId !== user.id && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: { completed },
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const { id } = await context.params;

    const existing = await prisma.todo.findUnique({ where: { id } });
    if (!existing || (existing.userId !== user.id && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await prisma.todo.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
