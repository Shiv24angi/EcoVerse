// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// GET /api/debug-create-user - Dev-only helper to seed a known test account
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    );
  }

  await dbConnect();

  const email = 'test@example.com';
  const password = 'test1234'; // ✅ Sample password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user already exists
  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json({
      message: 'User already exists',
      user: existing,
    });
  }

  const newUser = await User.create({
    name: 'Test User',
    email,
    password: hashedPassword, // ✅ Store hashed password
    joinedAt: new Date(),
    monthlyCarbon: 0,
    totalScanned: 0,
    streakCount: 0,
    level: 1,
    points: {
      confirmed: 0,
      unconfirmed: 0,
    },
    achievements: [],
  });

  return NextResponse.json({
    message: 'User created successfully',
    user: newUser,
  });
}
