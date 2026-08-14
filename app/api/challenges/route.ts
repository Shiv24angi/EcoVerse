// Opt out of static generation - connects to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import {
  getActiveChallenges,
  getChallengeStatus,
  findChallengeById,
} from '@/lib/challenges';
import { calculateLevel, confirmAgedPoints } from '@/lib/rewards-system';

/**
 * GET /api/challenges
 * Returns active challenges, user's challenge progress, and completion status.
 */
export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const activeChallenges = getActiveChallenges(now);
    const completedRecords = user.completedChallenges || [];

    // Also include unclaimed completed challenges from the previous week so they remain claimable in UI
    const pastWeekDate = new Date(now);
    pastWeekDate.setUTCDate(pastWeekDate.getUTCDate() - 7);
    const pastChallenges = getActiveChallenges(pastWeekDate);

    const displayChallenges = [...activeChallenges];
    for (const pCh of pastChallenges) {
      if (!displayChallenges.some((c) => c.id === pCh.id)) {
        const pStatus = getChallengeStatus(
          pCh,
          user.scans || [],
          completedRecords,
          now
        );
        if (pStatus.isCompleted && !pStatus.isClaimed) {
          displayChallenges.push(pCh);
        }
      }
    }

    const challengesWithProgress = displayChallenges.map((challenge) => {
      const status = getChallengeStatus(
        challenge,
        user.scans || [],
        completedRecords,
        now
      );
      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
        maxProgress: challenge.maxProgress,
        rewardPoints: challenge.rewardPoints,
        icon: challenge.icon,
        category: challenge.category || 'General',
        progress: status.currentProgress,
        progressPercentage: status.progressPercentage,
        isCompleted: status.isCompleted,
        isClaimed: status.isClaimed,
        isExpired: status.isExpired,
      };
    });

    // Map completed records for UI history display
    const completedHistory = completedRecords.map((rec) => {
      const matchingDef = findChallengeById(rec.challengeId);
      return {
        challengeId: rec.challengeId,
        name:
          rec.name ||
          (matchingDef ? matchingDef.name : 'Sustainability Challenge'),
        icon: rec.icon || (matchingDef ? matchingDef.icon : '🌱'),
        category:
          rec.category || (matchingDef ? matchingDef.category : 'General'),
        pointsEarned: rec.pointsEarned,
        completedAt: rec.completedAt,
      };
    });

    return NextResponse.json({
      activeChallenges: challengesWithProgress,
      completedHistory,
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/challenges (or claim via body action)
 * Claims reward points for a completed challenge.
 */
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { challengeId } = await req.json();

    if (!challengeId) {
      return NextResponse.json(
        { error: 'Challenge ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    await confirmAgedPoints(email);

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const challenge = findChallengeById(challengeId);

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found or no longer active' },
        { status: 404 }
      );
    }

    const status = getChallengeStatus(
      challenge,
      user.scans || [],
      user.completedChallenges || [],
      now
    );

    if (status.isClaimed) {
      return NextResponse.json(
        { error: 'Challenge reward already claimed' },
        { status: 400 }
      );
    }

    if (!status.isCompleted) {
      return NextResponse.json(
        { error: 'Challenge requirements not yet met' },
        { status: 400 }
      );
    }

    const oldLevel = user.level || 1;
    const pointsToAward = challenge.rewardPoints;
    const earnedAt = new Date();
    const levelData = calculateLevel(
      (user.totalPointsEarned || 0) + pointsToAward
    );

    // Atomic update to award points, level, transaction, and completed challenge record in a single DB query
    const updatedUser = await User.findOneAndUpdate(
      {
        email,
        'completedChallenges.challengeId': { $ne: challengeId },
      },
      {
        $inc: {
          rewardPoints: pointsToAward,
          totalPointsEarned: pointsToAward,
          confirmedPoints: pointsToAward, // Challenge rewards are immediately confirmed
        },
        $max: {
          level: levelData.level,
        },
        $push: {
          completedChallenges: {
            challengeId: challenge.id,
            name: challenge.name,
            icon: challenge.icon,
            category: challenge.category || 'General',
            completedAt: earnedAt,
            pointsEarned: pointsToAward,
          },
          rewardTransactions: {
            _id: new mongoose.Types.ObjectId(),
            type: 'earned',
            points: pointsToAward,
            pointsType: 'confirmed',
            reason: 'challenge_completion',
            description: `Completed challenge: ${challenge.name}`,
            date: earnedAt,
            confirmedAt: earnedAt,
          },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to claim challenge. Reward may already be claimed.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      pointsAwarded: pointsToAward,
      rewardPoints: updatedUser.rewardPoints,
      leveledUp: levelData.level > oldLevel,
      newLevel: updatedUser.level,
      message: `Congratulations! You earned ${pointsToAward} points for completing "${challenge.name}".`,
    });
  } catch (error) {
    console.error('Error claiming challenge reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim challenge reward' },
      { status: 500 }
    );
  }
}
