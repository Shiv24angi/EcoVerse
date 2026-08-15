// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isAvatarId } from '@/lib/avatar-options';

export async function PUT(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    const { avatarId } = (body ?? {}) as { avatarId?: string };

    if (!avatarId) {
      return NextResponse.json({ error: 'Missing avatarId' }, { status: 400 });
    }

    if (!isAvatarId(avatarId)) {
      return NextResponse.json(
        { error: 'Unsupported avatarId' },
        { status: 400 }
      );
    }

    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { avatarId } },
      { new: true }
    ).select('avatarId');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, avatarId: updatedUser.avatarId },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('🔥 Avatar update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
