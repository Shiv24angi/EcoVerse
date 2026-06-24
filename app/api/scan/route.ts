import { NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { calculateCarbonFootprint } from '@/lib/carbon-calculator';
import {
  calculateScanPoints,
  calculateLevel,
  checkAchievements,
  calculateMonthlyBonus,
  confirmPendingPoints,
  getUserPointsSummary,
  calculateStreakUpdate,
} from '@/lib/rewards-system';
import { inferPackaging } from '@/lib/packaging-inference';

type OpenFoodFactsResponse = {
  product: {
    product_name?: string;
    brands?: string;
    categories_tags?: string[];
    ingredients_text?: string;
  };
  status: number;
  code: string;
};

export async function POST(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { barcode } = await req.json();

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode missing' }, { status: 400 });
  }

  try {
    const productRes = await axios.get<OpenFoodFactsResponse>(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    const product = productRes.data.product;

    if (!product?.product_name) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const categories = (product.categories_tags || []).map((cat) =>
      cat.replace('en:', '')
    );
    const packaging = inferPackaging(categories);

    const carbonData = calculateCarbonFootprint(
      product.product_name,
      product.brands
    );
    const carbonEstimate = carbonData.carbonFootprint;

    try {
      await dbConnect();

      // The streak/points calculation depends on a snapshot of the user
      // document (lastScanDate, streakCount, streakProtectors), but two
      // concurrent scan requests could both read the same snapshot and both
      // decide to consume the same streak protector, or both compute the
      // same streak increment. To prevent that, the write is gated on
      // lastScanDate still matching what we read (compare-and-set): if
      // another request wrote first, the filter won't match, and we retry
      // the whole read-compute-write cycle against the fresh state.
      const MAX_RETRIES = 5;
      let initialUpdate = null;
      let streakUpdate = null;
      let pointsData = null;
      let scanTimestamp = new Date();
      let oldLevel = 1;
      let pointsEarned = 0;
      let isConfirmed = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const user = await User.findOne({ email: userEmail });

      const isFirstScan = (user.totalScanned ?? 0) === 0;
      const totalScans = user.totalScanned ?? 0;

      const streakUpdate = calculateStreakUpdate(
        user.lastScanDate,
        user.streakCount ?? 0,
        user.bestStreakCount ?? 0,
        user.streakProtectors ?? 0
      );
      const streakCount = streakUpdate.streakCount;

      const pointsData = calculateScanPoints
        ? calculateScanPoints(
            carbonEstimate,
            isFirstScan,
            streakCount,
            totalScans
          )
        : { points: 0, reasons: [], isConfirmed: false };

      const isConfirmed = pointsData.isConfirmed;
      const pointsEarned = pointsData.points;

      const scanTimestamp = new Date();

      // --- ATOMIC DATABASE UPDATE ---
      // We perform the atomic increment to update points and scans first.
      // We also push a new reward transaction record so it can be referenced later.
      const initialUpdate = await User.findOneAndUpdate(
        { email: userEmail },
        {
          $inc: {
            monthlyCarbon: carbonEstimate,
            totalScanned: 1,
            rewardPoints: pointsEarned,
            totalPointsEarned: pointsEarned,
            confirmedPoints: isConfirmed ? pointsEarned : 0,
            unconfirmedPoints: isConfirmed ? 0 : pointsEarned,
            streakProtectors: -streakUpdate.streakProtectorsUsed,
          },
          $set: {
            streakCount: streakUpdate.streakCount,
            bestStreakCount: streakUpdate.bestStreakCount,
            lastScanDate: scanTimestamp,
          },
          $push: {
            scans: {
              productName: product.product_name,
              carbonEstimate: carbonEstimate,
              category: carbonData.category,
              confidence: carbonData.confidence,
              barcode: barcode,
              date: scanTimestamp,
            },
            rewardTransactions: {
              _id: new mongoose.Types.ObjectId(),
              type: 'earned',
              points: pointsEarned,
              pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
              reason: 'scan',
              description: `Scanned ${product.product_name}`,
              barcode: barcode,
              date: scanTimestamp,
            },
          },
          {
            new: true, // IMPORTANT: Returns the ground-truth updated document from the DB
            runValidators: true,
          }
        );

        if (initialUpdate) {
          break; // Compare-and-set succeeded — no concurrent write raced us.
        }
        // Filter didn't match: another request updated lastScanDate between
        // our read and write. Loop and retry against the fresh state.
      }

      if (!initialUpdate || !streakUpdate || !pointsData) {
        return NextResponse.json(
          {
            error:
              'Scan could not be recorded due to concurrent updates. Please try again.',
          },
          { status: 409 }
        );
      }

      // --- POST-UPDATE DERIVED CALCULATIONS ---
      // Achievements are checked first, since their points must be credited
      // to the user's balance before level is computed — otherwise a level
      // earned via an achievement's points (rather than scan points alone)
      // would be missed.
      const earnedAchievements = checkAchievements
        ? checkAchievements(initialUpdate)
        : [];
      const monthlyBonus = calculateMonthlyBonus
        ? calculateMonthlyBonus(initialUpdate)
        : 0;

      let updatedUser = initialUpdate;
      let actuallyInsertedAchievements = earnedAchievements;

      if (earnedAchievements.length > 0) {
        const earnedAt = new Date();
        // Map from Achievement (the static definition, with a `condition`
        // function and `icon`) to IAchievement (the persisted earned-record
        // shape, with `earnedAt` instead) — pushing the raw definition would
        // try to store a function and never set earnedAt.
        const achievementRecords = earnedAchievements.map((achievement) => ({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          points: achievement.points,
          earnedAt,
        }));

        const isAchievementConfirmed = shouldConfirmImmediately
          ? shouldConfirmImmediately('achievement')
          : true;

        // Insert each achievement individually via its own findOneAndUpdate
        // (rather than batching into bulkWrite) so the return value of each
        // call tells us, unambiguously, whether THIS write was the one that
        // inserted that specific achievement — null means the filter didn't
        // match (already present, whether from this user's own prior scan or
        // a concurrent request that won the race), so we don't double-credit
        // points for it.
        //
        // The points $inc and reward transaction $push are folded into this
        // same write (rather than a separate aggregate update afterward) so
        // that an achievement is never persisted without its points being
        // credited in the same atomic operation — closing the crash window
        // where a failure between two separate writes could leave an
        // achievement recorded with no way to recover its points, since
        // checkAchievements skips already-earned IDs on every later scan.
        actuallyInsertedAchievements = [];
        for (const record of achievementRecords) {
          const inserted = await User.findOneAndUpdate(
            {
              email: userEmail,
              'achievements.id': { $ne: record.id },
            },
            {
              $push: {
                achievements: record,
                rewardTransactions: {
                  _id: new mongoose.Types.ObjectId(),
                  type: 'earned',
                  points: record.points,
                  pointsType: isAchievementConfirmed
                    ? 'confirmed'
                    : 'unconfirmed',
                  reason: 'achievement',
                  description: `Earned: ${record.name}`,
                  date: earnedAt,
                  confirmedAt: isAchievementConfirmed ? earnedAt : null,
                },
              },
              $inc: {
                rewardPoints: record.points,
                totalPointsEarned: record.points,
                confirmedPoints: isAchievementConfirmed ? record.points : 0,
                unconfirmedPoints: isAchievementConfirmed ? 0 : record.points,
              },
            },
            { new: false } // we only need to know whether it matched
          );
          if (inserted) {
            const original = earnedAchievements.find((a) => a.id === record.id);
            if (original) actuallyInsertedAchievements.push(original);
          }
        }
      }

      // Recompute level off the up-to-date total, now that achievement
      // points (if any) have been credited.
      const latestForLevel = await User.findOne({ email: userEmail });
      const levelData = calculateLevel
        ? calculateLevel(latestForLevel?.totalPointsEarned || 0)
        : { level: oldLevel };

      if (levelData.level > oldLevel) {
        // $max only applies the update if the new value is actually
        // greater, which is itself a safe guard against a concurrent
        // request regressing the level.
        await User.updateOne(
          { email: userEmail },
          {
            $max: { level: levelData.level },
            $set: { updatedAt: new Date() },
          }
        );
      }

      if (
        levelData.level > oldLevel ||
        actuallyInsertedAchievements.length > 0
      ) {
        const freshUser = await User.findOne({ email: userEmail });
        if (!freshUser) {
          // The user document vanished between our writes and this read
          // (e.g. concurrent account deletion). Don't silently fall back to
          // the stale initialUpdate snapshot — it predates the level and
          // achievement updates we just persisted, so the response would
          // misrepresent the actual (now-nonexistent) account state.
          console.error(
            '❌ User document missing after scan update:',
            userEmail
          );
          return NextResponse.json(
            { error: 'User account no longer exists' },
            { status: 404 }
          );
        }
        updatedUser = freshUser;
      }

      // We use the ground-truth data from 'updatedUser' for the final response.
      // This ensures the UI is always in sync with the actual database state.
      const pointsSummary = getUserPointsSummary(updatedUser);

      return NextResponse.json({
        productName: product.product_name,
        brand: product.brands || 'Unknown',
        carbonEstimate: carbonEstimate.toFixed(2),
        category: carbonData.category,
        confidence: carbonData.confidence,
        calculation: carbonData.calculation,
        ingredients: product.ingredients_text || 'Not available',
        packaging,
        rewards: {
          pointsEarned,
          pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
          reasons: pointsData.reasons,
          pointsSummary,
          level: updatedUser.level,
          leveledUp: updatedUser.level > oldLevel,
          newAchievements: actuallyInsertedAchievements,
          streakCount: updatedUser.streakCount,
          bestStreakCount: updatedUser.bestStreakCount,
          streakProtectorUsed: streakUpdate.streakProtectorsUsed > 0,
          streakBroken: streakUpdate.streakBroken,
          monthlyBonus,
          sustainabilityTier:
            updatedUser.monthlyCarbon < 10 && updatedUser.totalScanned >= 15
              ? 'Platinum'
              : updatedUser.monthlyCarbon < 20 && updatedUser.totalScanned >= 10
                ? 'Gold'
                : updatedUser.monthlyCarbon < 30 &&
                    updatedUser.totalScanned >= 5
                  ? 'Silver'
                  : updatedUser.monthlyCarbon < 40
                    ? 'Bronze'
                    : 'Beginner',
          pendingConfirmationInfo: (() => {
            const confirmationData = confirmPendingPoints
              ? confirmPendingPoints(updatedUser)
              : { confirmedPoints: 0, confirmedTransactions: [] };

            return confirmationData.confirmedPoints > 0
              ? {
                  pointsConfirmed: confirmationData.confirmedPoints,
                  transactionsConfirmed:
                    confirmationData.confirmedTransactions.length,
                }
              : null;
          })(),
        },
      });
    } catch (dbError) {
      console.error('🔥 Failed to update user stats:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  } catch (error) {
    console.error('🔥 Error in scan API:', error);
    return NextResponse.json(
      { error: 'Failed to scan product' },
      { status: 500 }
    );
  }
}
