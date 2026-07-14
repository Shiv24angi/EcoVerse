// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import {
  calculateLevel,
  getSustainabilityTier,
  calculateScanPoints,
  checkAchievements,
  confirmAgedPoints,
  shouldConfirmImmediately,
} from '@/lib/rewards-system';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';

export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    await checkAndRunMonthlyRollover(email);
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate current level data
    const levelData = calculateLevel(user.totalPointsEarned || 0);
    const tierData = getSustainabilityTier(
      user.monthlyCarbon || 0,
      user.totalScanned || 0
    );

    // FIX: Extracted and normalized monthlyCarbon value to prevent ternary misclassification
    const monthlyCarbon = user.monthlyCarbon || 0;

    const sustainabilityLevel =
      monthlyCarbon < 20
        ? 'Excellent'
        : monthlyCarbon < 35
          ? 'Good'
          : monthlyCarbon < 50
            ? 'Average'
            : 'Needs Improvement';

    return NextResponse.json({
      monthlyCarbon,
      // Falls back to the app's existing default (40kg) when the user
      // hasn't set a personal goal yet, so this is backward-compatible
      // with the previously-hardcoded constant on the frontend.
      monthlyCarbonGoal: user.monthlyCarbonGoal ?? 40,
      totalScanned: user.totalScanned || 0,
      streakCount: user.streakCount || 0,
      bestStreakCount: user.bestStreakCount || 0,
      scans: user.scans || [],
      sustainabilityLevel,

      // Enhanced rewards data
      rewards: {
        points: user.rewardPoints || 0,
        totalPointsEarned: user.totalPointsEarned || 0,
        level: user.level || 1,
        nextLevelPoints: levelData.nextLevelPoints,
        progressToNext: levelData.progressToNext,
        recentTransactions: (user.rewardTransactions || []).slice(-10),
        achievements: user.achievements || [],
        achievementCount: (user.achievements || []).length,

        // Sustainability tier
        tier: tierData.tier,
        tierColor: tierData.color,
        tierDescription: tierData.description,

        // Special features
        activeBadges: user.activeBadges || [],
        purchasedItems: user.purchasedItems || [],
        specialFeatures: {
          streakProtectors: user.streakProtectors || 0,
          doublePointsDays: user.doublePointsDays || 0,
          hasAdvancedAnalytics: user.hasAdvancedAnalytics || false,
          customAvatar: user.customAvatar || null,
        },

        // Monthly bonus tracking
        monthlyBonusesEarned: user.monthlyBonusesEarned || 0,
        lastMonthlyBonusCheck: user.lastMonthlyBonusCheck,
      },
    });
  } catch (error) {
    console.error('Error fetching user data:', error);

    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: unknown = await req.json();

    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { productName, carbonEstimate } = payload as {
      productName?: unknown;
      carbonEstimate?: unknown;
    };

    if (
      typeof productName !== 'string' ||
      !productName.trim() ||
      carbonEstimate === undefined ||
      carbonEstimate === null
    ) {
      return NextResponse.json(
        { error: 'Missing productName or carbonEstimate' },
        { status: 400 }
      );
    }

    const carbonValue = Number(carbonEstimate);

    if (!Number.isFinite(carbonValue) || carbonValue < 0) {
      return NextResponse.json(
        { error: 'carbonEstimate must be a non-negative number' },
        { status: 400 }
      );
    }

    await dbConnect();
    await checkAndRunMonthlyRollover(email);
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isFirstScan = (user.totalScanned || 0) === 0;
    const totalScans = user.totalScanned || 0;

    // Streak logic
    const now = new Date();
    let newStreakCount = user.streakCount || 0;

    const lastScanDate = user.lastScanDate ? new Date(user.lastScanDate) : null;

    const isSameDay =
      lastScanDate && now.toDateString() === lastScanDate.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      lastScanDate && yesterday.toDateString() === lastScanDate.toDateString();

    if (!lastScanDate || isYesterday) {
      newStreakCount += 1;
    } else if (!isSameDay) {
      newStreakCount = 1;
    }

    const newBestStreak = Math.max(newStreakCount, user.bestStreakCount || 0);

    // Calculate points for this manual entry
    const pointsData = calculateScanPoints(
      carbonValue,
      isFirstScan,
      newStreakCount,
      totalScans
    );

    const pointsEarned = pointsData.points;
    const isConfirmed = pointsData.isConfirmed;

    // Pre-calculate expected state for level and achievements
    const newTotalPoints = (user.totalPointsEarned || 0) + pointsEarned;

    const newTotalScanned = (user.totalScanned || 0) + 1;

    const levelData = calculateLevel(newTotalPoints);

    // Simulate user state for achievement check
    const simulatedUser = {
      ...user.toObject(),
      totalPointsEarned: newTotalPoints,
      totalScanned: newTotalScanned,
      monthlyCarbon: (user.monthlyCarbon || 0) + carbonValue,
      streakCount: newStreakCount,
    };

    const earnedAchievements = checkAchievements(simulatedUser);

    const oldLevel = user.level || 1;

    // Confirm any aged unconfirmed points before recording new scan
    await confirmAgedPoints(email);

    // Transform Achievement[] to IAchievement[] before persisting
    const earnedAt = new Date();
    const achievementRecords = earnedAchievements.map((achievement) => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      points: achievement.points,
      earnedAt,
    }));

    // Single atomic update to user stats and history
    const finalUpdate = await User.findOneAndUpdate(
      { email },
      {
        $inc: {
          monthlyCarbon: carbonValue,
          totalScanned: 1,
          rewardPoints: pointsEarned,
          totalPointsEarned: pointsEarned,
          confirmedPoints: isConfirmed ? pointsEarned : 0,
          unconfirmedPoints: isConfirmed ? 0 : pointsEarned,
        },
        $set: {
          streakCount: newStreakCount,
          bestStreakCount: newBestStreak,
          lastScanDate: now,
        },
        $max: {
          level: levelData.level,
        },
        $push: {
          scans: {
            productName,
            carbonEstimate: carbonValue,
            category: 'Manual Entry',
            confidence: 'medium',
            barcode: `MANUAL-${Date.now()}`,
            date: new Date(),
            source: 'Manual Entry',
          },
          rewardTransactions: {
            _id: new mongoose.Types.ObjectId(),
            type: 'earned',
            points: pointsEarned,
            pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
            reason: 'scan',
            description: `Manual entry: ${productName}`,
            date: new Date(),
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!finalUpdate) {
      return NextResponse.json(
        { error: 'Failed to update user score' },
        { status: 500 }
      );
    }

    // Insert achievements with deduplication
    const isAchievementConfirmed = shouldConfirmImmediately('achievement');
    let actuallyInsertedAchievements = 0;
    for (const record of achievementRecords) {
      const inserted = await User.findOneAndUpdate(
        { email, 'achievements.id': { $ne: record.id } },
        {
          $push: { achievements: record },
          $inc: {
            rewardPoints: record.points,
            totalPointsEarned: record.points,
            confirmedPoints: isAchievementConfirmed ? record.points : 0,
            unconfirmedPoints: isAchievementConfirmed ? 0 : record.points,
          },
        },
        { new: false }
      );
      if (inserted) {
        actuallyInsertedAchievements++;
      }
    }

    // Recompute level from the persisted post-scan total; refresh again if
    // achievement inserts added more points after the main update.
    let finalLevel = calculateLevel(finalUpdate.totalPointsEarned || 0).level;
    if (actuallyInsertedAchievements > 0) {
      const freshUser = await User.findOne({ email });
      if (freshUser) {
        const recomputedLevel = calculateLevel(
          freshUser.totalPointsEarned || 0
        );
        finalLevel = recomputedLevel.level;
      }
    }

    if (finalLevel > levelData.level) {
      await User.updateOne({ email }, { $max: { level: finalLevel } });
    }

    return NextResponse.json({
      newScore: finalUpdate.monthlyCarbon,
      totalScanned: finalUpdate.totalScanned,
      pointsEarned,
      level: finalLevel,
      leveledUp: finalLevel > oldLevel,
    });
  } catch (error) {
    console.error('Error updating score:', error);

    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/score - Set or clear the user's personal monthly carbon goal
export async function PATCH(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: unknown = await req.json();

    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { monthlyCarbonGoal } = payload as { monthlyCarbonGoal?: unknown };

    // Allow null explicitly, to let a user clear their goal and revert to
    // the app default (40kg) rather than forcing them to always have one.
    if (monthlyCarbonGoal !== null) {
      const goalValue = Number(monthlyCarbonGoal);

      if (
        typeof monthlyCarbonGoal !== 'number' ||
        !Number.isFinite(goalValue) ||
        goalValue <= 0 ||
        goalValue > 10000
      ) {
        return NextResponse.json(
          {
            error:
              'monthlyCarbonGoal must be a positive number (kg CO2), or null to clear it',
          },
          { status: 400 }
        );
      }
    }

    await dbConnect();
    await checkAndRunMonthlyRollover(email);

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { monthlyCarbonGoal } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      monthlyCarbonGoal: updatedUser.monthlyCarbonGoal ?? 40,
    });
  } catch (error) {
    console.error('Error updating monthly carbon goal:', error);

    return NextResponse.json(
      { error: 'Failed to update monthly carbon goal' },
      { status: 500 }
    );
  }
}
