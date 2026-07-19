// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import axios from 'axios';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getCarbonFootprint } from '@/lib/climatiq';
import {
  calculateScanPoints,
  calculateLevel,
  checkAchievements,
  calculateMonthlyBonus,
  confirmPendingPoints,
  confirmAgedPoints,
  getUserPointsSummary,
  calculateStreakUpdate,
  shouldConfirmImmediately,
} from '@/lib/rewards-system';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';
import { inferPackaging } from '@/lib/packaging-inference';

type OpenFoodFactsResponse = {
  product: {
    product_name?: string;
    brands?: string;
    categories_tags?: string[];
    ingredients_text?: string;
    image_front_url?: string;
    image_url?: string;
    image_front_small_url?: string;
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

  // Barcode validation: must be 8-14 digit string
  if (
    typeof barcode !== 'string' ||
    !/^\d{8,14}$/.test(barcode) ||
    barcode.length > 14
  ) {
    return NextResponse.json(
      { error: 'Invalid barcode format' },
      { status: 400 }
    );
  }

  try {
    let product;
    try {
      const productRes = await axios.get<OpenFoodFactsResponse>(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      product = productRes.data.product;
    } catch (offError) {
      console.warn(
        'Open Food Facts API failed, using barcode as fallback:',
        offError
      );
      product = { product_name: `Product ${barcode}`, brands: 'Unknown' };
    }

    if (!product?.product_name) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const categories = (product.categories_tags || []).map((cat) =>
      cat.replace('en:', '')
    );
    const packaging = inferPackaging(categories);

    try {
      await dbConnect();

      // Resolve carbon footprint using Climatiq with fallback
      const carbonData = await getCarbonFootprint(
        product.product_name,
        product.brands
      );
      const carbonEstimate = carbonData.carbonFootprint;

      // Run monthly rollover if the month has changed before any scan
      // computations so monthlyCarbon is reset to 0 for the new month.
      await checkAndRunMonthlyRollover(userEmail);

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
      let actuallyInsertedAchievements: any[] = [];
      let updatedUser: any = null;
      let agedPointsConfirmed = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const user = await User.findOne({ email: userEmail });

        // Confirm any aged unconfirmed points before computing the response
        agedPointsConfirmed = (await confirmAgedPoints(userEmail)) > 0;

        if (!user) {
          console.error('❌ No user found with email:', userEmail);
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        const isFirstScan = (user.totalScanned ?? 0) === 0;
        const totalScans = user.totalScanned ?? 0;
        const previousLastScanDate = user.lastScanDate;
        oldLevel = user.level || 1;

        streakUpdate = calculateStreakUpdate(
          user.lastScanDate,
          user.streakCount ?? 0,
          user.bestStreakCount ?? 0,
          user.streakProtectors ?? 0
        );
        const streakCount = streakUpdate.streakCount;

        pointsData = calculateScanPoints
          ? calculateScanPoints(
              carbonEstimate,
              isFirstScan,
              streakCount,
              totalScans
            )
          : { points: 0, reasons: [], isConfirmed: false };

        isConfirmed = pointsData.isConfirmed;
        pointsEarned = pointsData.points;
        scanTimestamp = new Date();

        // --- ATOMIC DATABASE UPDATE ---
        // We perform the atomic increment to update points and scans first.
        // We also push a new reward transaction record so it can be referenced later.
        // The lastScanDate match in the filter is the compare-and-set guard:
        // it only succeeds if the document is still in the state we read it
        // in, so a concurrent scan can't cause this one to double-consume a
        // streak protector or double-increment the streak.
        initialUpdate = await User.findOneAndUpdate(
          {
            email: userEmail,
            lastScanDate: previousLastScanDate,
            'scans.barcode': { $ne: barcode },
            streakProtectors: { $gte: streakUpdate.streakProtectorsUsed },
          },
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
                source: carbonData.source,
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
          },
          {
            new: true, // IMPORTANT: Returns the ground-truth updated document from the DB
            runValidators: true,
          }
        );

        if (initialUpdate) {
          // Compare-and-set succeeded — now process achievements and
          // level-up within the same retry scope. If any post-scan write
          // fails, the next retry iteration re-reads fresh state and
          // re-computes everything (achievement dedup via $ne and level
          // $max are both idempotent).
          try {
            // --- ACHIEVEMENTS ---
            const computedAchievements = checkAchievements
              ? checkAchievements(initialUpdate)
              : [];
            actuallyInsertedAchievements = [];
            updatedUser = initialUpdate;

            if (computedAchievements.length > 0) {
              const earnedAt = new Date();
              const achievementRecords = computedAchievements.map((a: any) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                points: a.points,
                earnedAt,
              }));

              const isAchievementConfirmed = shouldConfirmImmediately
                ? shouldConfirmImmediately('achievement')
                : true;

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
                      confirmedPoints: isAchievementConfirmed
                        ? record.points
                        : 0,
                      unconfirmedPoints: isAchievementConfirmed
                        ? 0
                        : record.points,
                    },
                  },
                  { new: false }
                );
                if (inserted) {
                  const original = computedAchievements.find(
                    (a: any) => a.id === record.id
                  );
                  if (original) actuallyInsertedAchievements.push(original);
                }
              }
            }

            // --- LEVEL-UP ---
            const latestForLevel = await User.findOne({ email: userEmail });
            const levelData = calculateLevel
              ? calculateLevel(latestForLevel?.totalPointsEarned || 0)
              : { level: oldLevel };

            if (levelData.level > oldLevel) {
              await User.updateOne(
                { email: userEmail },
                {
                  $max: { level: levelData.level },
                  $set: { updatedAt: new Date() },
                }
              );
            }

            // All post-scan writes succeeded — exit the retry loop.
            // Re-fetch the user if achievements or level changed.
            if (
              levelData.level > oldLevel ||
              actuallyInsertedAchievements.length > 0
            ) {
              const freshUser = await User.findOne({ email: userEmail });
              if (!freshUser) {
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

            // Cap scans to last 500 entries and rewardTransactions to last 1000
            await User.updateOne({ email: userEmail }, [
              { $set: { scans: { $slice: ['$scans', -500] } } },
              {
                $set: {
                  rewardTransactions: {
                    $slice: ['$rewardTransactions', -1000],
                  },
                },
              },
            ]);

            // Store final state for response and break retry loop
            initialUpdate = updatedUser;
            break;
          } catch (_postError) {
            // Post-scan write failed (achievement or level-up). Log and
            // retry the entire cycle from fresh state — the compare-and-set
            // guard on lastScanDate ensures we don't double-count the scan.
            console.warn(
              `Post-scan write failed, retry ${attempt + 1}/${MAX_RETRIES}:`,
              _postError
            );
            initialUpdate = null;
          }
        }
        // Filter didn't match (another request updated lastScanDate) or
        // post-scan writes failed — retry against fresh state.
      }

      if (!initialUpdate || !streakUpdate || !pointsData) {
        const alreadyScanned = await User.findOne(
          { email: userEmail, 'scans.barcode': barcode },
          { projection: { _id: 1 } }
        );
        const reason = alreadyScanned
          ? 'This product has already been scanned.'
          : 'Scan could not be recorded due to concurrent updates. Please try again.';
        return NextResponse.json({ error: reason }, { status: 409 });
      }

      // Refresh user snapshot if confirmAgedPoints made changes
      // and achievements/level-up didn't already re-fetch
      if (agedPointsConfirmed && updatedUser) {
        const freshUser = await User.findOne({ email: userEmail });
        if (freshUser) updatedUser = freshUser;
      }

      const monthlyBonus = calculateMonthlyBonus
        ? calculateMonthlyBonus(initialUpdate)
        : 0;

      // We use the ground-truth data from 'updatedUser' for the final response.
      // This ensures the UI is always in sync with the actual database state.
      const pointsSummary = getUserPointsSummary(updatedUser);

      const productImage =
        product.image_front_url ||
        product.image_url ||
        product.image_front_small_url ||
        null;

      return NextResponse.json({
        productName: product.product_name,
        brand: product.brands || 'Unknown',
        carbonEstimate: carbonEstimate.toFixed(2),
        category: carbonData.category,
        confidence: carbonData.confidence,
        calculation: carbonData.calculation,
        source: carbonData.source,
        ingredients: product.ingredients_text || 'Not available',
        image: productImage,
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
          streakProtectorsUsed: streakUpdate.streakProtectorsUsed,
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
