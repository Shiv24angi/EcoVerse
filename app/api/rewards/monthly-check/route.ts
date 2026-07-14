// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import User, { type IUser } from '@/models/User';
import { calculateMonthlyBonus } from '@/lib/rewards-system';
import { verifyCookieAuth } from '@/lib/auth';

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
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentDate = new Date();
    const lastCheck = user.lastMonthlyBonusCheck
      ? new Date(user.lastMonthlyBonusCheck)
      : null;

    // Check if we need to award monthly bonus
    const isSameMonthAndYear =
      !!lastCheck &&
      lastCheck.getMonth() === currentDate.getMonth() &&
      lastCheck.getFullYear() === currentDate.getFullYear();

    if (!isSameMonthAndYear) {
      const monthlyBonus = calculateMonthlyBonus(user);

      if (monthlyBonus) {
        // Atomically award monthly bonus to prevent race conditions
        const bonusMonth = currentDate.getMonth();
        const bonusYear = currentDate.getFullYear();
        const updatedUser = await User.findOneAndUpdate(
          {
            _id: user._id,
            $or: [
              { lastMonthlyBonusCheck: null },
              {
                $expr: {
                  $or: [
                    {
                      $ne: [
                        { $month: '$lastMonthlyBonusCheck' },
                        bonusMonth + 1,
                      ],
                    },
                    { $ne: [{ $year: '$lastMonthlyBonusCheck' }, bonusYear] },
                  ],
                },
              },
            ],
          },
          {
            $inc: {
              confirmedPoints: monthlyBonus.points,
              totalPointsEarned: monthlyBonus.points,
              monthlyBonusesEarned: 1,
            },
            $push: {
              rewardTransactions: {
                type: 'earned',
                points: monthlyBonus.points,
                pointsType: 'confirmed',
                reason: 'monthly_bonus',
                description: monthlyBonus.reason,
                date: currentDate,
                confirmedAt: currentDate,
              },
            },
            $set: { lastMonthlyBonusCheck: currentDate },
          },
          { new: true }
        );

        if (!updatedUser) {
          // Another request already awarded the bonus
          return NextResponse.json({
            bonusAwarded: false,
            message: 'Monthly bonus already awarded',
          });
        }

        const newRewardPoints =
          (updatedUser.confirmedPoints || 0) +
          (updatedUser.unconfirmedPoints || 0);
        await User.findByIdAndUpdate(updatedUser._id, {
          $set: { rewardPoints: newRewardPoints },
        });

        return NextResponse.json({
          bonusAwarded: true,
          bonus: monthlyBonus,
          newTotalPoints: newRewardPoints,
          confirmedPoints: updatedUser.confirmedPoints,
          unconfirmedPoints: updatedUser.unconfirmedPoints,
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
