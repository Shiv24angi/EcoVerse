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

      const user = await User.findOne({ email: userEmail });

      if (!user) {
        console.error('❌ No user found with email:', userEmail);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isFirstScan = (user.totalScanned ?? 0) === 0;
      const streakCount = user.streakCount ?? 0;
      const totalScans = user.totalScanned ?? 0;

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
          },
          $push: {
            scans: {
              productName: product.product_name,
              carbonEstimate: carbonEstimate,
              category: carbonData.category,
              confidence: carbonData.confidence,
              barcode: barcode,
              date: new Date(),
            },
            rewardTransactions: {
              _id: new mongoose.Types.ObjectId(),
              type: 'earned',
              points: pointsEarned,
              pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
              reason: 'scan',
              description: `Scanned ${product.product_name}`,
              barcode: barcode,
              date: new Date(),
            },
          },
        },
        {
          new: true, // IMPORTANT: Returns the ground-truth updated document from the DB
          runValidators: true,
        }
      );

      if (!initialUpdate) {
        return NextResponse.json(
          { error: 'Failed to update user stats' },
          { status: 500 }
        );
      }

      // --- POST-UPDATE DERIVED CALCULATIONS ---
      // Compute level, achievements, and bonuses based on the actual post-increment state.
      const oldLevel = user.level || 1;
      const levelData = calculateLevel
        ? calculateLevel(initialUpdate.totalPointsEarned || 0)
        : { level: oldLevel };
      const earnedAchievements = checkAchievements
        ? checkAchievements(initialUpdate)
        : [];
      const monthlyBonus = calculateMonthlyBonus
        ? calculateMonthlyBonus(initialUpdate)
        : 0;

      // Persist any changed level/achievements with a subsequent update.
      let updatedUser = initialUpdate;
      if (levelData.level > oldLevel || earnedAchievements.length > 0) {
        updatedUser =
          (await User.findOneAndUpdate(
            { email: userEmail },
            {
              $set: {
                level: levelData.level,
                updatedAt: new Date(),
              },
              $push: {
                achievements: { $each: earnedAchievements },
              },
            },
            { new: true }
          )) || initialUpdate;
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
          newAchievements: earnedAchievements,
          streakCount: updatedUser.streakCount,
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
