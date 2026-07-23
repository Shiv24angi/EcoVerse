// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/auth';

interface SignupRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  firebaseUid?: unknown;
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { name, email, password, firebaseUid } = body as SignupRequestBody;

    // Require basic fields
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim()
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const hasPassword = typeof password === 'string' && password.length > 0;
    const hasFirebaseUid =
      typeof firebaseUid === 'string' && firebaseUid.length > 0;

    // Require either password OR firebaseUid
    if (!hasPassword && !hasFirebaseUid) {
      return NextResponse.json(
        {
          error: 'Password or Firebase UID is required',
        },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedFirebaseUid = hasFirebaseUid ? firebaseUid : null;

    await dbConnect();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password only for manual signup
    let hashedPassword = null;

    if (hasPassword) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const createdUser = await User.create({
      name: trimmedName,
      username: trimmedName,
      full_name: trimmedName,
      email: normalizedEmail,

      // manual auth
      password: hashedPassword,

      // google auth
      firebaseUid: normalizedFirebaseUid,

      monthlyCarbon: 0,
      totalScanned: 0,
      joinedAt: new Date().toISOString(),
    });

    // FIX: Convert document to a plain object and strip the password property to prevent credential leaking
    const userObject = createdUser.toObject
      ? createdUser.toObject()
      : { ...createdUser };
    const { password: _password, ...user } = userObject;

    // Set the auth_token cookie so middleware can verify the session and
    // inject x-user-email on subsequent requests, matching the behavior
    // already implemented for Google Sign-In.
    await setAuthCookie(createdUser.email, createdUser._id.toString());

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    // Safely wrap critical runtime tracing with explicit rule suppression

    console.error('🔥 Signup API error:', message);

    // FIX: Do not expose low-level database or system diagnostics directly to downstream clients
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
