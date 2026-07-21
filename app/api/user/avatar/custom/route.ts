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
    const { customAvatar } = await req.json();

    if (typeof customAvatar !== 'string' || !customAvatar.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid customAvatar URL' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasPurchased = (user.purchasedItems || []).some(
      (item) => item.itemId === 'custom_avatar'
    );

    if (!hasPurchased) {
      return NextResponse.json(
        { error: 'Custom avatar feature not purchased' },
        { status: 403 }
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { customAvatar: customAvatar.trim() } },
      { new: true }
    );

    return NextResponse.json(
      { success: true, customAvatar: updatedUser?.customAvatar },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown server error';
    console.error('Custom avatar update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
