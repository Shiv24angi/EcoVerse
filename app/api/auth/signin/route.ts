// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error:
            'This account uses Google Sign-In. Please continue with Google.',
        },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
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
    console.error('Signin error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
