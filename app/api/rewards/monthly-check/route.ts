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
    const currentDate = new Date();
    const bonusMonth = currentDate.getMonth();
    const bonusYear = currentDate.getFullYear();

    const notCheckedThisMonthFilter = {
      $or: [
        { lastMonthlyBonusCheck: null },
        {
          $expr: {
            $or: [
              {
                $ne: [{ $month: '$lastMonthlyBonusCheck' }, bonusMonth + 1],
              },
              { $ne: [{ $year: '$lastMonthlyBonusCheck' }, bonusYear] },
            ],
          },
        },
      ],
    };

    // Attempt Tier 1 atomic update (Eco Champion: < 20kg monthly carbon & >= 10 scans)
    let bonusConfig = {
      points: 1000,
      reason: 'Eco Champion - Monthly carbon under 20kg',
    };

    let updatedUser = await User.findOneAndUpdate(
      {
        email,
        monthlyCarbon: { $lt: 20 },
        totalScanned: { $gte: 10 },
        ...notCheckedThisMonthFilter,
      },
      {
        $inc: {
          confirmedPoints: bonusConfig.points,
          totalPointsEarned: bonusConfig.points,
          rewardPoints: bonusConfig.points,
          monthlyBonusesEarned: 1,
        },
        $push: {
          rewardTransactions: {
            type: 'earned',
            points: bonusConfig.points,
            pointsType: 'confirmed',
            reason: 'monthly_bonus',
            description: bonusConfig.reason,
            date: currentDate,
            confirmedAt: currentDate,
          },
        },
        $set: { lastMonthlyBonusCheck: currentDate },
      },
      { new: true }
    );

    // If not eligible for Tier 1, attempt Tier 2 atomic update (Monthly Goal: < 30kg monthly carbon & >= 5 scans)
    if (!updatedUser) {
      bonusConfig = {
        points: 500,
        reason: 'Monthly Goal - Carbon under 30kg',
      };

      updatedUser = await User.findOneAndUpdate(
        {
          email,
          monthlyCarbon: { $lt: 30 },
          totalScanned: { $gte: 5 },
          ...notCheckedThisMonthFilter,
        },
        {
          $inc: {
            confirmedPoints: bonusConfig.points,
            totalPointsEarned: bonusConfig.points,
            rewardPoints: bonusConfig.points,
            monthlyBonusesEarned: 1,
          },
          $push: {
            rewardTransactions: {
              type: 'earned',
              points: bonusConfig.points,
              pointsType: 'confirmed',
              reason: 'monthly_bonus',
              description: bonusConfig.reason,
              date: currentDate,
              confirmedAt: currentDate,
            },
          },
          $set: { lastMonthlyBonusCheck: currentDate },
        },
        { new: true }
      );
    }

    if (updatedUser) {
      const newRewardPoints =
        (updatedUser.confirmedPoints || 0) +
        (updatedUser.unconfirmedPoints || 0);

      return NextResponse.json({
        bonusAwarded: true,
        bonus: bonusConfig,
        newTotalPoints: newRewardPoints,
        confirmedPoints: updatedUser.confirmedPoints,
        unconfirmedPoints: updatedUser.unconfirmedPoints,
      });
    }

    // Check if user exists to distinguish 404 from "No bonus available"
    const userExists = await User.exists({ email });
    if (!userExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
