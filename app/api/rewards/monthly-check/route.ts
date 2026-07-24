// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User, { type IUser } from '@/models/User';
import { calculateMonthlyBonus } from '@/lib/rewards-system';
import { verifyCookieAuth } from '@/lib/auth';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';

type LeanUser = mongoose.FlattenMaps<IUser> & { _id: mongoose.Types.ObjectId };

// POST /api/rewards/monthly-check - Check and award monthly bonuses
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Defense-in-depth: verify the auth_token cookie matches the x-user-email header
  const authError = await verifyCookieAuth(req, email);
  if (authError) return authError;

  try {
    await dbConnect();
    const rolloverProcessed = await checkAndRunMonthlyRollover(email);
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      bonusAwarded: false,
      rolloverProcessed,
      message: rolloverProcessed
        ? 'Monthly rollover processed. Bonuses are awarded for completed months only.'
        : 'No completed monthly cycle is ready for bonus processing.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check monthly bonus' },
      { status: 500 }
    );
  }
}

// GET /api/rewards/monthly-check - Get monthly bonus status
export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Defense-in-depth: verify the auth_token cookie matches the x-user-email header
  const authError = await verifyCookieAuth(req, email);
  if (authError) return authError;

  try {
    await dbConnect();
    const user = (await User.findOne({ email }).lean()) as LeanUser | null;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentDate = new Date();
    const lastCheck = user.lastMonthlyBonusCheck
      ? new Date(user.lastMonthlyBonusCheck)
      : null;
    const eligibleForBonus =
      !lastCheck ||
      lastCheck.getMonth() !== currentDate.getMonth() ||
      lastCheck.getFullYear() !== currentDate.getFullYear();

    const monthlyBonus = calculateMonthlyBonus(user);

    return NextResponse.json({
      eligibleForBonus,
      monthlyBonus,
      lastBonusCheck: user.lastMonthlyBonusCheck,
      totalBonusesEarned: user.monthlyBonusesEarned || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get monthly bonus status' },
      { status: 500 }
    );
  }
}
