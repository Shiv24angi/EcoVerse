import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User, { type IRewardTransaction } from '@/models/User';
import {
  getUserPointsSummary,
  confirmPendingPoints,
  POINT_CONFIRMATION,
} from '@/lib/rewards-system';

// Force dynamic rendering — this route connects to MongoDB at request time
// and must never be statically generated during `next build`.
export const dynamic = 'force-dynamic';

// GET /api/debug/points?email=user@email.com - Debug point system for a user
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    );
  }

  // SECURITY: Require authentication to access debug endpoint
  // Only authenticated users can view their own debug info
  const authenticatedEmail = req.headers.get('x-user-email');
  const { searchParams } = new URL(req.url);
  const requestedEmail = searchParams.get('email');

  if (!authenticatedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requestedEmail) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // SECURITY: Users can only view their own debug info
  if (authenticatedEmail.toLowerCase() !== requestedEmail.toLowerCase()) {
    return NextResponse.json(
      { error: 'Access denied: can only view your own data' },
      { status: 403 }
    );
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email: requestedEmail });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pointsSummary = getUserPointsSummary(user);
    const confirmationData = confirmPendingPoints(user);

    const transactions = user.rewardTransactions || [];
    const confirmedTransactions = transactions.filter(
      (t) => t.pointsType === 'confirmed'
    );
    const unconfirmedTransactions = transactions.filter(
      (t) => t.pointsType === 'unconfirmed'
    );

    const now = new Date();
    const transactionDetails = transactions.map((t: IRewardTransaction) => {
      const transactionDate = new Date(t.date);
      const hoursElapsed =
        (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);
      const hoursRemaining =
        POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS - hoursElapsed;

      return {
        ...t,
        hoursElapsed: hoursElapsed.toFixed(2),
        hoursRemaining: hoursRemaining.toFixed(2),
        daysRemaining: (hoursRemaining / 24).toFixed(2),
        isEligibleForConfirmation:
          hoursElapsed >= POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS,
      };
    });

    return NextResponse.json({
      userEmail: email,
      rawData: {
        confirmedPoints: user.confirmedPoints,
        unconfirmedPoints: user.unconfirmedPoints,
        rewardPoints: user.rewardPoints,
        totalPointsEarned: user.totalPointsEarned,
      },
      pointsSummary,
      confirmationInfo: {
        eligibleForConfirmation: confirmationData.confirmedPoints,
        eligibleTransactions: confirmationData.confirmedTransactions.length,
        confirmationDelayHours: POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS,
      },
      transactionCounts: {
        total: transactions.length,
        confirmed: confirmedTransactions.length,
        unconfirmed: unconfirmedTransactions.length,
      },
      transactionDetails,
      validationChecks: {
        pointsMatch:
          pointsSummary.total ===
          (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0),
        legacyPointsMatch: pointsSummary.total === (user.rewardPoints || 0),
        confirmedPointsSum: confirmedTransactions.reduce(
          (sum: number, t) =>
            sum + (t.type === 'earned' ? t.points : -t.points),
          0
        ),
        unconfirmedPointsSum: unconfirmedTransactions.reduce(
          (sum: number, t) => sum + t.points,
          0
        ),
      },
    });
  } catch (error) {
    console.error('Error debugging points:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to debug points' },
      { status: 500 }
    );
  }
}
