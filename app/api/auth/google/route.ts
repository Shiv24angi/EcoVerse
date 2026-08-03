// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User, { type IUser } from '@/models/User';
import { setAuthCookie } from '@/lib/auth';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';

type LeanUser = mongoose.FlattenMaps<IUser> & { _id: mongoose.Types.ObjectId };

interface GoogleAuthRequestBody {
  idToken?: string;
}

export async function POST(req: Request) {
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

  const { idToken } = body as GoogleAuthRequestBody;

  if (typeof idToken !== 'string' || !idToken.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // SECURITY: Verify the Firebase ID token server-side. The client can no
  // longer supply a trusted email/firebaseUid pair — identity is derived
  // from the verified token only.
  const verified = await verifyFirebaseIdToken(idToken.trim());

  if (!verified) {
    return NextResponse.json(
      { error: 'Invalid or expired authentication token' },
      { status: 401 }
    );
  }

  const { email, name, uid } = verified;

  let userDoc: LeanUser | null = null;
  try {
    await dbConnect();
    userDoc = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          name,
          firebaseUid: uid,
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
    console.error('Failed to upsert user in google route:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!userDoc) {
    return NextResponse.json(
      { error: 'User processing failed' },
      { status: 500 }
    );
  }

  await setAuthCookie(userDoc.email, userDoc._id.toString());

  const user = {
    _id: userDoc._id,
    name: userDoc.name || '',
    email: userDoc.email || '',
    joinedAt: userDoc.createdAt
      ? new Date(userDoc.createdAt).toISOString().split('T')[0]
      : userDoc.joinedAt || '',
    monthlyCarbon: userDoc.monthlyCarbon || 0,
    totalScanned: userDoc.totalScanned || 0,
    avatarId: userDoc.avatarId || 'avatar-1',
    avatarCustomization: userDoc.avatarCustomization || {},
  };

  return NextResponse.json({ user }, { status: 200 });
}
