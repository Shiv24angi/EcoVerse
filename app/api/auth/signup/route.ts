import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();

    const { name, email, password, firebaseUid } = body;

    // Require basic fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Require either password OR firebaseUid
    if (!password && !firebaseUid) {
      return NextResponse.json(
        {
          error: 'Password or Firebase UID is required',
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password only for manual signup
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const createdUser = await User.create({
      name,
      username: name,
      full_name: name,
      email,

      // manual auth
      password: hashedPassword,

      // google auth
      firebaseUid: firebaseUid || null,

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
    /* eslint-disable-next-line no-console */
    console.error('🔥 Signup API error:', message);

    // FIX: Do not expose low-level database or system diagnostics directly to downstream clients
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
