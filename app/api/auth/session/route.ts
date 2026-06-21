import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, signToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// 1. Define an explicit interface for your JWT Payload to avoid 'any'
interface JWTPayload {
  email: string;
  userId: string;
  exp?: number;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // 2. Cast the payload verification to our custom or unknown structure safely
    const payload = (await verifyToken(token)) as JWTPayload | null;

    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: payload.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Map the MongoDB document back to the required frontend shape
    const userData = {
      _id: user._id,
      name: user.name || '',
      email: user.email || '',
      joinedAt: user.createdAt
        ? new Date(user.createdAt).toISOString().split('T')[0]
        : user.joinedAt || '',
      monthlyCarbon: user.monthlyCarbon || 0,
      totalScanned: user.totalScanned || 0,
      avatarId: user.avatarId || 'avatar-1',
      avatarCustomization: user.avatarCustomization || {},
    };

    // Sliding Expiration: Check if token has less than 3 days remaining
    // 3. Changed from (payload as any).exp to safe structural checking
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const threeDaysInSeconds = 3 * 24 * 60 * 60;

    if (exp && exp - now < threeDaysInSeconds) {
      const newToken = await signToken({
        email: user.email,
        userId: user._id.toString(),
      });

      cookieStore.set('auth_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    return NextResponse.json({ user: userData }, { status: 200 });
  } catch (error) {
    console.error('Session route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
