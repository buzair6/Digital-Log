import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, validateUserCredentials } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, isSignup, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (isSignup) {
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required for signup' },
          { status: 400 }
        );
      }

      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }

      const userRole = role === 'admin' ? 'admin' : 'user';
      const user = await createUser(email, password, name, userRole);

      return NextResponse.json(
        { 
          message: 'User created successfully',
          user: { id: user.id, email: user.email, name: user.name, role: user.role }
        },
        { status: 201 }
      );
    } else {
      // Login
      const user = await validateUserCredentials(email, password);
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        message: 'Login successful',
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
