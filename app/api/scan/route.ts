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
import { checkAndRunMonthlyRollover, monthKey } from '@/lib/monthly-cycle';
import { inferPackaging } from '@/lib/packaging-inference';
import { validateBarcode, validateBarcodeFormat } from '@/lib/input-validation';
import { normalizeEmail } from '@/lib/normalize-email';

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

function getUtcDayKey(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export async function POST(req: Request) {
  const rawUserEmail = req.headers.get('x-user-email');

  if (!rawUserEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = normalizeEmail(rawUserEmail);

  const { barcode } = await req.json();

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode missing' }, { status: 400 });
  }
  const barcodeValidation = validateBarcode(barcode);
  if (!barcodeValidation.valid) {
    return NextResponse.json(
      { error: barcodeValidation.error || 'Invalid barcode' },
      { status: 400 }
    );
  }

  const sanitizedBarcode = barcodeValidation.sanitized!;
  const formatValidation = validateBarcodeFormat(sanitizedBarcode);
  if (!formatValidation.valid) {
    return NextResponse.json(
      { error: formatValidation.error || 'Invalid barcode format' },
      { status: 400 }
    );
  }

  try {
    let product;
    try {
      const productRes = await axios.get<OpenFoodFactsResponse>(
        `https://world.openfoodfacts.org/api/v0/product/${sanitizedBarcode}.json`
      );
      product = productRes.data.product;
    } catch (offError) {
      console.warn(
        'Open Food Facts API failed, using barcode as fallback:',
        offError instanceof Error ? offError.message : String(offError)
      );
      product = {
        product_name: `Product ${sanitizedBarcode}`,
        brands: 'Unknown',
      };
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
      const carbonData = await getCarbonFootprint(
        product.product_name,
        product.brands
      );
      const carbonEstimate = carbonData.carbonFootprint;
      await checkAndRunMonthlyRollover(userEmail);
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
        agedPointsConfirmed = (await confirmAgedPoints(userEmail)) > 0;

        if (!user) {
          // User not found is a normal flow, no need to log email
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        const isFirstScan = (user.totalScanned ?? 0) === 0;
        const totalScans = user.totalScanned ?? 0;
        const previousLastScanDate = user.lastScanDate;
        oldLevel = user.level || 1;
        scanTimestamp = new Date();
        const isFirstScanOfDay =
          !previousLastScanDate ||
          getUtcDayKey(scanTimestamp) !==
            getUtcDayKey(new Date(previousLastScanDate));

        streakUpdate = calculateStreakUpdate(
          user.lastScanDate,
          user.streakCount ?? 0,
          user.bestStreakCount ?? 0,
          user.streakProtectors ?? 0,
          scanTimestamp
        );
        const streakCount = streakUpdate.streakCount;

        pointsData = calculateScanPoints
          ? calculateScanPoints(
              carbonEstimate,
              isFirstScan,
              streakCount,
              totalScans,
              isFirstScanOfDay
            )
          : { points: 0, reasons: [], isConfirmed: false };

        isConfirmed = pointsData.isConfirmed;
        pointsEarned = pointsData.points;
        scanTimestamp = new Date();
        const statsKey = monthKey(
          scanTimestamp.getMonth(),
          scanTimestamp.getFullYear()
        );
        initialUpdate = await User.findOneAndUpdate(
          {
            email: userEmail,
            lastScanDate: previousLastScanDate,
            'scans.barcode': { $ne: sanitizedBarcode },
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
              [`monthlyStats.${statsKey}.carbon`]: carbonEstimate,
              [`monthlyStats.${statsKey}.scans`]: 1,
              [`monthlyStats.${statsKey}.points`]: pointsEarned,
              lowCarbonScans: carbonEstimate < 1 ? 1 : 0,
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
                barcode: sanitizedBarcode,
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
                barcode: sanitizedBarcode,
                date: scanTimestamp,
              },
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (initialUpdate) {
          try {
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
                      [`monthlyStats.${statsKey}.points`]: record.points,
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
            if (
              levelData.level > oldLevel ||
              actuallyInsertedAchievements.length > 0
            ) {
              const freshUser = await User.findOne({ email: userEmail });
              if (!freshUser) {
                // User document missing is a critical error but we don't expose user info
                return NextResponse.json(
                  { error: 'User account no longer exists' },
                  { status: 404 }
                );
              }
              updatedUser = freshUser;
            }
            await User.updateOne({ email: userEmail }, [
              { $set: { scans: { $slice: ['$scans', -500] } } },
              {
                $set: {
                  rewardTransactions: {
                    $concatArrays: [
                      {
                        $slice: [
                          {
                            $filter: {
                              input: { $ifNull: ['$rewardTransactions', []] },
                              as: 't',
                              cond: { $ne: ['$$t.pointsType', 'unconfirmed'] },
                            },
                          },
                          -1000,
                        ],
                      },
                      {
                        $filter: {
                          input: { $ifNull: ['$rewardTransactions', []] },
                          as: 't',
                          cond: { $eq: ['$$t.pointsType', 'unconfirmed'] },
                        },
                      },
                    ],
                  },
                },
              },
            ]);
            initialUpdate = updatedUser;
            break;
          } catch (postError) {
            console.warn(
              `Post-scan write failed, retry ${attempt + 1}/${MAX_RETRIES}:`,
              postError instanceof Error ? postError.message : String(postError)
            );
            initialUpdate = null;
          }
        }
      }

      if (!initialUpdate || !streakUpdate || !pointsData) {
        const alreadyScanned = await User.findOne(
          { email: userEmail, 'scans.barcode': sanitizedBarcode },
          { projection: { _id: 1 } }
        );
        const reason = alreadyScanned
          ? 'This product has already been scanned.'
          : 'Scan could not be recorded due to concurrent updates. Please try again.';
        return NextResponse.json({ error: reason }, { status: 409 });
      }
      if (agedPointsConfirmed && updatedUser) {
        const freshUser = await User.findOne({ email: userEmail });
        if (freshUser) updatedUser = freshUser;
      }

      const monthlyBonus = calculateMonthlyBonus
        ? calculateMonthlyBonus(initialUpdate)
        : 0;
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
      console.error(
        'Database error during scan:',
        dbError instanceof Error ? dbError.message : 'Unknown database error'
      );
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  } catch (error) {
    console.error(
      'Scan API error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to scan product' },
      { status: 500 }
    );
  }
}
