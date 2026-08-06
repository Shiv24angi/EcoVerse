export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User, { type IUser } from '@/models/User';
import { calculateMonthlyBonus } from '@/lib/rewards-system';
import { verifyCookieAuth } from '@/lib/auth';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';

type LeanUser = mongoose.FlattenMaps<IUser> & { _id: mongoose.Types.ObjectId };
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const authError = await verifyCookieAuth(req, email);
  if (authError) return authError;

  try {
    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const rolledOver = await checkAndRunMonthlyRollover(email);

    if (rolledOver) {
      const updated = (await User.findOne({ email }).lean()) as LeanUser | null;
      const history = updated?.monthlyCarbonHistory ?? [];
      const archive =
        history.length > 0 ? history[history.length - 1] : undefined;

      if (archive && archive.bonusAwarded) {
        const confirmedPoints = updated?.confirmedPoints ?? 0;
        const unconfirmedPoints = updated?.unconfirmedPoints ?? 0;
        return NextResponse.json({
          bonusAwarded: true,
          bonus: { points: archive.bonusPoints },
          newTotalPoints: confirmedPoints + unconfirmedPoints,
          confirmedPoints,
          unconfirmedPoints,
        });
      }
    }

    return NextResponse.json({
      bonusAwarded: false,
      message: 'No monthly bonus available',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check monthly bonus' },
      { status: 500 }
    );
  }
}
export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
