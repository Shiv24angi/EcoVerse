import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

interface GoogleAuthBody {
  name: string;
  email: string;
  firebaseUid: string;
}

export async function POST(req: Request) {
  // FIX: Guard body parsing inside a try...catch to intercept malformed request payloads gracefully
  let body: GoogleAuthBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { name, email, firebaseUid } = body;

  if (!name || !email || !firebaseUid) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  let userDoc: Record<string, unknown> | null = null;
  try {
    await dbConnect();
    userDoc = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          name,
          firebaseUid,
          authProvider: 'google',
          avatarId: 'avatar-1',
          monthlyCarbon: 0,
          totalScanned: 0,
          joinedAt: new Date().toISOString(),
        },
      },
      {
        new: true,
        upsert: true,
        lean: true,
      }
    );
  } catch (err) {
    // FIX: Suppress linting rule for tracking low-level operational failures
    /* eslint-disable-next-line no-console */
    console.error('Failed to upsert user in google route:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!userDoc) {
    return NextResponse.json(
      { error: 'User processing failed' },
      { status: 500 }
    );
  }

  // Generate the JWT safely
  const token = await signToken({
    email: userDoc.email as string,
    userId: (userDoc._id as { toString(): string }).toString(),
  });

  // Set the token securely as an HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  // Map the MongoDB document back to the required frontend shape using safe fallbacks
  const user = {
    _id: userDoc._id,
    name: (userDoc.name as string) || '',
    email: (userDoc.email as string) || '',
    joinedAt: userDoc.createdAt
      ? new Date(userDoc.createdAt as string).toISOString().split('T')[0]
      : (userDoc.joinedAt as string) || '',
    monthlyCarbon: (userDoc.monthlyCarbon as number) || 0,
    totalScanned: (userDoc.totalScanned as number) || 0,
    avatarId: (userDoc.avatarId as string) || 'avatar-1',
    avatarCustomization: userDoc.avatarCustomization || {},
  };

  return NextResponse.json({ user }, { status: 200 });
}
