// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserPointsSummary } from '@/lib/rewards-system';

const DEFAULT_PAGE_SIZE = 20;

const isValidObjectId = (value: string): boolean =>
  mongoose.Types.ObjectId.isValid(value) &&
  /^[a-fA-F0-9]{24}$/.test(value);

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(
      Math.max(
        1,
        parseInt(limitParam || String(DEFAULT_PAGE_SIZE), 10) ||
          DEFAULT_PAGE_SIZE
      ),
      100
    );
    const userId = searchParams.get('userId');

    // Validate query params before they reach User.findById, otherwise an
    // invalid ObjectId throws a Mongoose cast error and the route returns 500
    // (issue #355). Invalid userId is a client error; an invalid cursor is
    // ignored so the caller gets a safe first-page response.
    if (userId && !isValidObjectId(userId)) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }
    const safeCursor = cursor && isValidObjectId(cursor) ? cursor : null;

    // Compute global stats once via aggregation.
    const [statsResult] = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalPoints: { $sum: '$totalPointsEarned' },
          avgLevel: { $avg: '$level' },
        },
      },
    ]).allowDiskUse(true);

    const totalUsers = statsResult?.totalUsers ?? 0;
    const totalPointsInSystem = statsResult?.totalPoints ?? 0;
    const averagePoints =
      totalUsers > 0 ? Math.round(totalPointsInSystem / totalUsers) : 0;
    const averageLevel =
      totalUsers > 0 ? (statsResult?.avgLevel ?? 1).toFixed(1) : '1.0';

    // Compute the requesting user's global rank if userId is provided.
    let currentUserRank: number | null = null;
    if (userId) {
      const target = await User.findById(userId)
        .select('totalPointsEarned level totalScanned')
        .lean();
      if (target) {
        const aheadCount = await User.countDocuments({
          $or: [
            { totalPointsEarned: { $gt: target.totalPointsEarned } },
            {
              totalPointsEarned: target.totalPointsEarned,
              level: { $gt: target.level },
            },
            {
              totalPointsEarned: target.totalPointsEarned,
              level: target.level,
              totalScanned: { $gt: target.totalScanned },
            },
            {
              totalPointsEarned: target.totalPointsEarned,
              level: target.level,
              totalScanned: target.totalScanned,
              _id: { $lt: target._id },
            },
          ],
        });
        currentUserRank = aheadCount + 1;
      }
    }

    // Build cursor-based filter matching the sort order:
    //   { totalPointsEarned: -1, level: -1, totalScanned: -1, _id: -1 }
    const filter: Record<string, unknown> = {};
    if (safeCursor) {
      const cursorDoc = await User.findById(safeCursor)
        .select('totalPointsEarned level totalScanned')
        .lean();
      if (cursorDoc) {
        const { totalPointsEarned, level, totalScanned, _id } = cursorDoc;
        filter.$or = [
          { totalPointsEarned: { $lt: totalPointsEarned } },
          { totalPointsEarned, level: { $lt: level } },
          { totalPointsEarned, level, totalScanned: { $lt: totalScanned } },
          { totalPointsEarned, level, totalScanned, _id: { $lt: _id } },
        ];
      }
    }

    const users = await User.find(filter)
      .select(
        'name monthlyCarbon totalScanned createdAt lastScanDate streakCount rewardPoints confirmedPoints unconfirmedPoints totalPointsEarned level achievements purchasedItems activeBadges avatarId'
      )
      .sort({ totalPointsEarned: -1, level: -1, totalScanned: -1, _id: -1 })
      .limit(limit + 1)
      .lean()
      .allowDiskUse();

    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    const nextCursor =
      hasMore && users.length > 0
        ? (users[users.length - 1]._id as string).toString()
        : null;

    const leaderboardData = users.map((user) => {
      let change = 'same';
      const totalPoints = user.totalPointsEarned || 0;
      if (totalPoints > 500) change = 'up';
      else if (totalPoints < 100 && user.totalScanned > 0) change = 'down';

      const levelTier =
        user.level >= 15
          ? 'Legendary'
          : user.level >= 10
            ? 'Master'
            : user.level >= 7
              ? 'Expert'
              : user.level >= 5
                ? 'Advanced'
                : user.level >= 3
                  ? 'Intermediate'
                  : 'Beginner';

      const pointsSummary = getUserPointsSummary(user);

      return {
        id: user._id.toString(),
        name: user.name,
        avatarId: user.avatarId || 'avatar-1',
        monthlyCarbon: user.monthlyCarbon || 0,
        totalScanned: user.totalScanned || 0,
        change: change as 'up' | 'down' | 'same',
        joinedAt: user.createdAt,
        streakCount: user.streakCount || 0,
        lastScanDate: user.lastScanDate,
        rewardPoints: user.rewardPoints || 0,
        pointsSummary,
        totalPointsEarned: user.totalPointsEarned || 0,
        level: user.level || 1,
        achievementCount: (user.achievements || []).length,
        levelTier,
        activeBadges: user.activeBadges || [],
        hasAdvancedFeatures: (user.purchasedItems || []).some((item) =>
          ['advanced_analytics', 'streak_protector', 'double_points'].includes(
            item.itemId
          )
        ),
      };
    });

    return NextResponse.json({
      leaderboard: leaderboardData,
      nextCursor,
      hasMore,
      currentUserRank,
      stats: {
        totalUsers,
        averagePoints,
        averageLevel,
        totalPointsInSystem,
      },
    });
  } catch (error) {
    console.error(
      'Error fetching leaderboard:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
