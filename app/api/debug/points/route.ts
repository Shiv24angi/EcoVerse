import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import {
  getUserPointsSummary,
  confirmPendingPoints,
  POINT_CONFIRMATION,
} from '@/lib/rewards-system';

// GET /api/debug/points?email=user@email.com - Debug point system for a user
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'Invalid input type' }, { status: 400 });
  }

  try {
    await dbConnect();
    const user = (await User.findOne({ email })) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pointsSummary = getUserPointsSummary(user);
    const confirmationData = confirmPendingPoints(user);

    const transactions = user.rewardTransactions || [];
    const confirmedTransactions = transactions.filter(
      (t: any) => t.pointsType === 'confirmed'
    );
    const unconfirmedTransactions = transactions.filter(
      (t: any) => t.pointsType === 'unconfirmed'
    );

    const now = new Date();
    const transactionDetails = transactions.map((t: any) => {
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
          (sum: number, t: any) =>
            sum + (t.type === 'earned' ? t.points : -t.points),
          0
        ),
        unconfirmedPointsSum: unconfirmedTransactions.reduce(
          (sum: number, t: any) => sum + t.points,
          0
        ),
      },
    });
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('Error debugging points:', error);
    return NextResponse.json(
      { error: 'Failed to debug points' },
      { status: 500 }
    );
  }
}

// POST /api/debug/points - Force confirm points for testing
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    );
  }

  let email: unknown, action: unknown;
  try {
    const body = await req.json();
    email = body.email;
    action = body.action;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'Invalid input type' }, { status: 400 });
  }
  if (typeof action !== 'string') {
    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
  }

  try {
    await dbConnect();
    const user = (await User.findOne({ email })) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'confirm_all') {
      const unconfirmedPoints = user.unconfirmedPoints || 0;
      user.confirmedPoints = (user.confirmedPoints || 0) + unconfirmedPoints;
      user.unconfirmedPoints = 0;
      user.rewardPoints = user.confirmedPoints;

      if (user.rewardTransactions) {
        user.rewardTransactions.forEach((t: any) => {
          if (t.pointsType === 'unconfirmed') {
            t.pointsType = 'confirmed';
            t.confirmedAt = new Date();
          }
        });
      }

      await user.save();

      return NextResponse.json({
        success: true,
        message: `Confirmed ${unconfirmedPoints} points`,
        newSummary: getUserPointsSummary(user),
      });
    } else if (action === 'add_test_points') {
      const testPoints = 50;
      user.unconfirmedPoints = (user.unconfirmedPoints || 0) + testPoints;
      user.rewardPoints =
        (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0);
      user.totalPointsEarned = (user.totalPointsEarned || 0) + testPoints;

      user.rewardTransactions = user.rewardTransactions || [];
      user.rewardTransactions.push({
        type: 'earned',
        points: testPoints,
        pointsType: 'unconfirmed',
        reason: 'test',
        description: 'Test points for debugging',
        date: new Date(),
      });

      await user.save();

      return NextResponse.json({
        success: true,
        message: `Added ${testPoints} test unconfirmed points`,
        newSummary: getUserPointsSummary(user),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('Error in debug action:', error);
    return NextResponse.json(
      { error: 'Failed to perform debug action' },
      { status: 500 }
    );
  }
}
