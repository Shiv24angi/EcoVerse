// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User, { type IUser } from '@/models/User';
import { setAuthCookie } from '@/lib/auth';

type LeanUser = mongoose.FlattenMaps<IUser> & { _id: mongoose.Types.ObjectId };

interface GoogleAuthRequestBody {
  name?: string;
  email?: string;
  firebaseUid?: string;
}

export async function POST(req: Request) {
  // FIX: Guard body parsing inside a try...catch to intercept malformed request payloads gracefully
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

  const { name, email, firebaseUid } = body as GoogleAuthRequestBody;

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof firebaseUid !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !firebaseUid.trim()
  ) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedFirebaseUid = firebaseUid.trim();

  let userDoc: LeanUser | null = null;
  try {
    await dbConnect();
    userDoc = await User.findOneAndUpdate(
      { email: trimmedEmail },
      {
        $setOnInsert: {
          email: trimmedEmail,
          name: trimmedName,
          firebaseUid: trimmedFirebaseUid,
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
    console.error('Failed to upsert user in google route:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!userDoc) {
    return NextResponse.json(
      { error: 'User processing failed' },
      { status: 500 }
    );
  }

  // Set the auth_token cookie so middleware can verify the session and
  // inject x-user-email on subsequent requests.
  await setAuthCookie(userDoc.email, userDoc._id.toString());

  // Map the MongoDB document back to the required frontend shape using safe fallbacks
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
