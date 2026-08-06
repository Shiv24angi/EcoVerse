// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/auth';
import { normalizeEmail } from '@/lib/normalize-email';

export async function POST(req: Request) {
  try {
    await dbConnect();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { email, password } = body as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || !email) {
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'Password is required and must be a string' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Generic error to prevent user enumeration
    const genericError = { error: 'Invalid credentials' };

    const user = await User.findOne({ email: normalizedEmail });

    // Return generic error for any auth failure
    if (!user || !user.password) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return NextResponse.json(genericError, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return NextResponse.json(genericError, { status: 401 });
    }

    const userData = {
      _id: user._id,
      email: user.email,
      name: user.name,
      monthlyCarbon: user.monthlyCarbon || 0,
      totalScanned: user.totalScanned || 0,
      joinedAt:
        user.createdAt?.toISOString().split('T')[0] ||
        new Date().toISOString().split('T')[0],
    };

    // Set the auth_token cookie so middleware can verify the session and
    // inject x-user-email on subsequent requests, matching the behavior
    // already implemented for Google Sign-In.
    await setAuthCookie(user.email, user._id.toString());

    return NextResponse.json({ user: userData }, { status: 200 });
  } catch (error) {
    console.error(
      'Signin error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
