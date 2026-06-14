import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import {
  calculateLevel,
  getSustainabilityTier,
  calculateScanPoints,
  checkAchievements,
} from '@/lib/rewards-system';

export async function GET(req: Request) {
  // FIX: Look up identity from headers OR fall back to query strings (?email=...) for page contract compatibility
  const { searchParams } = new URL(req.url);
  const email = req.headers.get('x-user-email') ?? searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = (await User.findOne({ email }).lean()) as any;

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
    /* eslint-disable-next-line no-console */
    console.error('Error fetching user data:', error);

    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // FIX: Read email identity gracefully using headers or fallback search parameter query strings
  const { searchParams } = new URL(req.url);
  const email = req.headers.get('x-user-email') ?? searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { productName, carbonEstimate } = await req.json();

    if (!productName || carbonEstimate === undefined || carbonEstimate === null) {
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
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isFirstScan = (user.totalScanned || 0) === 0;
    const totalScans = user.totalScanned || 0;

    // Streak logic
    const now = new Date();
    let newStreakCount = user.streakCount || 0;

    const lastScanDate = user.lastScanDate
      ? new Date(user.lastScanDate)
      : null;

    const isSameDay =
      lastScanDate &&
      now.toDateString() === lastScanDate.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      lastScanDate &&
      yesterday.toDateString() === lastScanDate.toDateString();

    if (!lastScanDate || isYesterday) {
      newStreakCount += 1;
    } else if (!isSameDay) {
      newStreakCount = 1;
    }

    const newBestStreak = Math.max(
      newStreakCount,
      user.bestStreakCount || 0
    );

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
    const newTotalPoints =
      (user.totalPointsEarned || 0) + pointsEarned;

    const newTotalScanned =
      (user.totalScanned || 0) + 1;

    const levelData = calculateLevel(newTotalPoints);

    // Simulate user state for achievement check
    const simulatedUser = {
      ...user.toObject(),
      totalPointsEarned: newTotalPoints,
      totalScanned: newTotalScanned,
      monthlyCarbon: (user.monthlyCarbon || 0) + carbonValue,
      streakCount: newStreakCount,
    };

    const earnedAchievements =
      checkAchievements(simulatedUser);

    const oldLevel = user.level || 1;

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
          ...(earnedAchievements.length > 0 && {
            achievements: {
              $each: earnedAchievements,
            },
          }),
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

    return NextResponse.json({
      newScore: finalUpdate.monthlyCarbon,
      totalScanned: finalUpdate.totalScanned,
      pointsEarned,
      level: finalUpdate.level,
      leveledUp: finalUpdate.level > oldLevel,
    });
  } catch (error) {
    console.error('Error updating score:', error);

    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}