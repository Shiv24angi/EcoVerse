// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function PUT(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let avatarId;
  try {
    ({ avatarId } = await req.json());
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  if (!avatarId) {
    return NextResponse.json({ error: 'Missing avatarId' }, { status: 400 });
  }

  try {
    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { avatarId } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('🔥 Avatar update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
