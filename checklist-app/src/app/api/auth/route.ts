import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, validateUserCredentials } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, fullName, isSignup, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (isSignup) {
      if (!name && !fullName) {
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

      const userRole = String(role ?? '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
      const user = await createUser(email, password, fullName ?? name, userRole);
      const token = Buffer.from(user.id).toString('base64');

      return NextResponse.json(
        { 
          message: 'User created successfully',
          user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
          token
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
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
        token: Buffer.from(user.id).toString('base64')
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
