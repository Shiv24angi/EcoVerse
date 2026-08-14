export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User, { IScan, IAchievement } from '@/models/User';
import mongoose from 'mongoose';
import {
  calculateLevel,
  getSustainabilityTier,
  calculateScanPoints,
  checkAchievements,
  confirmAgedPoints,
  shouldConfirmImmediately,
  calculateStreakUpdate,
} from '@/lib/rewards-system';
import { checkAndRunMonthlyRollover, monthKey } from '@/lib/monthly-cycle';

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
    const levelData = calculateLevel(user.totalPointsEarned || 0);
    const tierData = getSustainabilityTier(
      user.monthlyCarbon || 0,
      user.totalScanned || 0
    );
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
      monthlyCarbonGoal: user.monthlyCarbonGoal ?? 40,
      totalScanned: user.totalScanned || 0,
      streakCount: user.streakCount || 0,
      bestStreakCount: user.bestStreakCount || 0,
      scans: user.scans || [],
      sustainabilityLevel,
      rewards: {
        points: user.rewardPoints || 0,
        totalPointsEarned: user.totalPointsEarned || 0,
        level: user.level || 1,
        nextLevelPoints: levelData.nextLevelPoints,
        progressToNext: levelData.progressToNext,
        recentTransactions: (user.rewardTransactions || []).slice(-10),
        achievements: user.achievements || [],
        achievementCount: (user.achievements || []).length,
        tier: tierData.tier,
        tierColor: tierData.color,
        tierDescription: tierData.description,
        activeBadges: user.activeBadges || [],
        purchasedItems: user.purchasedItems || [],
        specialFeatures: {
          streakProtectors: user.streakProtectors || 0,
          doublePointsDays: user.doublePointsDays || 0,
          hasAdvancedAnalytics: user.hasAdvancedAnalytics || false,
          customAvatar: user.customAvatar || null,
        },
        monthlyBonusesEarned: user.monthlyBonusesEarned || 0,
        lastMonthlyBonusCheck: user.lastMonthlyBonusCheck,
      },
    });
  } catch (error) {
    console.error(
      'Error fetching user data:',
      error instanceof Error ? error.message : 'Unknown error'
    );

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

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  try {
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
    const MAX_RETRIES = 5;
    const DUPLICATE_WINDOW_MS = 10_000;
    let finalUpdate = null;
    let pointsEarned = 0;
    let oldLevel = 1;
    let levelData = null;
    let actuallyInsertedAchievements: IAchievement[] = [];
    let finalUser = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const user = await User.findOne({ email });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const duplicateWindowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const isDuplicate = user.scans?.some(
        (scan: IScan) =>
          scan.productName === productName &&
          scan.carbonEstimate === carbonValue &&
          scan.source === 'Manual Entry' &&
          new Date(scan.date) >= duplicateWindowStart
      );

      if (isDuplicate) {
        return NextResponse.json(
          { error: 'This activity was already submitted a moment ago' },
          { status: 409 }
        );
      }
      await confirmAgedPoints(email);

      const isFirstScan = (user.totalScanned || 0) === 0;
      const totalScans = user.totalScanned || 0;
      const previousLastScanDate = user.lastScanDate;
      oldLevel = user.level || 1;
      const streakUpdate = calculateStreakUpdate(
        user.lastScanDate,
        user.streakCount ?? 0,
        user.bestStreakCount ?? 0,
        user.streakProtectors ?? 0
      );

      const streakCount = streakUpdate.streakCount;
      const pointsData = calculateScanPoints(
        carbonValue,
        isFirstScan,
        streakCount,
        totalScans
      );

      pointsEarned = pointsData.points;
      const isConfirmed = pointsData.isConfirmed;
      const statsTimestamp = new Date();
      const statsKey = monthKey(
        statsTimestamp.getMonth(),
        statsTimestamp.getFullYear()
      );

      const newTotalPoints = (user.totalPointsEarned || 0) + pointsEarned;
      levelData = calculateLevel(newTotalPoints);
      finalUpdate = await User.findOneAndUpdate(
        {
          email,
          lastScanDate: previousLastScanDate,
        },
        {
          $inc: {
            monthlyCarbon: carbonValue,
            totalScanned: 1,
            rewardPoints: pointsEarned,
            totalPointsEarned: pointsEarned,
            confirmedPoints: isConfirmed ? pointsEarned : 0,
            unconfirmedPoints: isConfirmed ? 0 : pointsEarned,
            streakProtectors: -streakUpdate.streakProtectorsUsed,
            [`monthlyStats.${statsKey}.carbon`]: carbonValue,
            [`monthlyStats.${statsKey}.scans`]: 1,
            [`monthlyStats.${statsKey}.points`]: pointsEarned,
            lowCarbonScans: carbonValue < 1 ? 1 : 0,
          },
          $set: {
            streakCount: streakUpdate.streakCount,
            bestStreakCount: streakUpdate.bestStreakCount,
            lastScanDate: new Date(),
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
        continue;
      }
      const simulatedUser = {
        ...finalUpdate.toObject(),
        totalPointsEarned: (user.totalPointsEarned || 0) + pointsEarned,
        totalScanned: (user.totalScanned || 0) + 1,
        monthlyCarbon: (user.monthlyCarbon || 0) + carbonValue,
        streakCount: streakUpdate.streakCount,
      };

      const earnedAchievements = checkAchievements(simulatedUser);

      const earnedAt = new Date();
      const achievementRecords = earnedAchievements.map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        points: achievement.points,
        earnedAt,
      }));

      const isAchievementConfirmed = shouldConfirmImmediately('achievement');
      actuallyInsertedAchievements = [];
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
          actuallyInsertedAchievements.push(record);
        }
      }
      let finalLevel = levelData.level;
      if (actuallyInsertedAchievements.length > 0) {
        const freshUser = await User.findOne({ email });
        if (freshUser) {
          const recomputedLevel = calculateLevel(
            freshUser.totalPointsEarned || 0
          );
          finalLevel = recomputedLevel.level;
          if (finalLevel > levelData.level) {
            await User.updateOne({ email }, { $max: { level: finalLevel } });
          }
        }
      }

      finalUser = finalUpdate;
      levelData.level = finalLevel;
      break;
    }

    if (!finalUpdate || !levelData) {
      return NextResponse.json(
        {
          error:
            'Scan could not be recorded due to concurrent updates. Please try again.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      newScore: finalUpdate.monthlyCarbon,
      totalScanned: finalUpdate.totalScanned,
      pointsEarned,
      level: levelData.level,
      leveledUp: levelData.level > oldLevel,
    });
  } catch (error) {
    console.error(
      'Error updating score:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}
export async function PATCH(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  try {
    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { monthlyCarbonGoal } = payload as { monthlyCarbonGoal?: unknown };
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
    console.error(
      'Error updating monthly carbon goal:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      { error: 'Failed to update monthly carbon goal' },
      { status: 500 }
    );
  }
}
