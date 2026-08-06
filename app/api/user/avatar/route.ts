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

  try {
    const { avatarId } = await req.json();

    if (!avatarId) {
      return NextResponse.json({ error: 'Missing avatarId' }, { status: 400 });
    }

    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { avatarId } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.warn('User from DB:', updatedUser?.avatarId);

    return NextResponse.json(
      { success: true, user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'Avatar update error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}
