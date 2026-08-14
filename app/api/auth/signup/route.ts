// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/auth';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
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

    const { name, password, idToken } = body as {
      name?: string;
      password?: string;
      idToken?: string;
    };

    if (!name || !password || typeof idToken !== 'string' || !idToken.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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

    const email = normalizeEmail(verified.email);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password only for manual signup
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await User.create({
      name,
      username: name,
      full_name: name,
      email,

      // manual auth
      password: hashedPassword,

      // google auth
      firebaseUid: verified.uid,

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
  } catch (error: any) {
    if (
      error?.code === 11000 ||
      (error?.name === 'MongoServerError' && error?.code === 11000)
    ) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    // Safely wrap critical runtime tracing with explicit rule suppression

    console.error('Signup API error:', message);

    // FIX: Do not expose low-level database or system diagnostics directly to downstream clients
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
