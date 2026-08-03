// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { confirmAgedPoints, getUserPointsSummary } from '@/lib/rewards-system';

/**
 * POST /api/rewards/confirm - Explicitly confirm points whose 7-day delay has
 * elapsed. This is the only rewards endpoint that mutates confirmation state;
 * GET /api/rewards is strictly read-only (Issue #421).
 */
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    // Idempotent aggregation-pipeline update: confirms every unconfirmed
    // 'earned' transaction older than the delay and returns the delta.
    const pointsConfirmed = await confirmAgedPoints(email);

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      pointsConfirmed,
      pointsSummary: getUserPointsSummary(user),
      confirmedPoints: user.confirmedPoints || 0,
      unconfirmedPoints: user.unconfirmedPoints || 0,
      transactions: user.rewardTransactions || [],
    });
  } catch (error) {
    console.error('Error confirming points:', error);
    return NextResponse.json(
      { error: 'Failed to confirm points' },
      { status: 500 }
    );
  }
}
