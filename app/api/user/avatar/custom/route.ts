export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function PUT(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const { customAvatar } = (body ?? {}) as { customAvatar?: unknown };

  if (typeof customAvatar !== 'string' || !customAvatar.trim()) {
    return NextResponse.json(
      { error: 'Missing or invalid customAvatar URL' },
      { status: 400 }
    );
  }

  const avatarUrl = customAvatar.trim();

  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'customAvatar must be an http(s) URL' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'customAvatar must be a valid URL' },
      { status: 400 }
    );
  }

  try {
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
      { $set: { customAvatar: avatarUrl } },
      { new: true }
    );

    return NextResponse.json(
      { success: true, customAvatar: updatedUser?.customAvatar },
      { status: 200 }
    );
  } catch (error) {
    console.error('Custom avatar update error:', error);
    return NextResponse.json(
      { error: 'Failed to update custom avatar' },
      { status: 500 }
    );
  }
}
