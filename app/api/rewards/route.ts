// Opt out of static generation - all handlers connect to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import {
  calculateLevel,
  ACHIEVEMENTS,
  REWARD_SHOP_ITEMS,
  confirmPendingPoints,
  getUserPointsSummary,
} from '@/lib/rewards-system';

// Repeatable/consumable shop items that can be purchased multiple times
const REPEATABLE_ITEMS = ['streak_protector', 'double_points'];

/**
 * GET /api/rewards - Get user's complete rewards data
 * Fetches user's current points, transaction history, achievements, and lists
 * all available shop items. Injected logic preserves repeatable/consumable
 * items in the available items list even after purchase.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    let user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate current level data
    const levelData = calculateLevel(user.totalPointsEarned || 0);

    // --- ATOMIC POINT CONFIRMATION ---
    // We check for points that have passed the confirmation threshold.
    const confirmationData = confirmPendingPoints(user);

    if (confirmationData.confirmedPoints > 0) {
      const now = new Date();
      const transactionIdsToConfirm =
        confirmationData.confirmedTransactions.map((t) => t._id);

      // We perform an atomic update to move points from unconfirmed to confirmed status.
      // We use an aggregation-pipeline update to ensure we only increment/decrement
      // based on transactions that are currently in 'unconfirmed' status,
      // preventing double-counting if a retry occurs.
      const updatedUser = await User.findOneAndUpdate(
        { email },
        [
          {
            $set: {
              // Calculate points from transactions that are actually still unconfirmed
              matchedPoints: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$rewardTransactions', []] },
                        as: 't',
                        cond: {
                          $and: [
                            { $in: ['$$t._id', transactionIdsToConfirm] },
                            { $eq: ['$$t.pointsType', 'unconfirmed'] },
                          ],
                        },
                      },
                    },
                    as: 'mt',
                    in: { $ifNull: ['$$mt.points', 0] },
                  },
                },
              },
            },
          },
          {
            $set: {
              confirmedPoints: {
                $add: [
                  { $ifNull: ['$confirmedPoints', 0] },
                  { $ifNull: ['$matchedPoints', 0] },
                ],
              },
              unconfirmedPoints: {
                $subtract: [
                  { $ifNull: ['$unconfirmedPoints', 0] },
                  { $ifNull: ['$matchedPoints', 0] },
                ],
              },
              rewardTransactions: {
                $map: {
                  input: { $ifNull: ['$rewardTransactions', []] },
                  as: 't',
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $in: ['$$t._id', transactionIdsToConfirm] },
                          { $eq: ['$$t.pointsType', 'unconfirmed'] },
                        ],
                      },
                      then: {
                        $mergeObjects: [
                          '$$t',
                          { pointsType: 'confirmed', confirmedAt: now },
                        ],
                      },
                      else: '$$t',
                    },
                  },
                },
              },
            },
          },
          { $unset: 'matchedPoints' },
        ],
        { new: true }
      );

      // Re-assign local user to the ground-truth updated document from DB.
      // This ensures all subsequent logic (summaries, achievements) uses
      // the most accurate and consistent data.
      if (updatedUser) {
        user = updatedUser;
      }
    }

    const pointsSummary = getUserPointsSummary(user);

    // Get available achievements (not yet earned)
    const earnedAchievementIds = (user.achievements || []).map((a) => a.id);
    const availableAchievements = ACHIEVEMENTS.filter(
      (achievement) => !earnedAchievementIds.includes(achievement.id)
    );

    // Get purchased item IDs
    const purchasedItemIds = (user.purchasedItems || []).map(
      (item) => item.itemId
    );

    // Filter available shop items (not yet purchased, unless repeatable)
    const availableShopItems = REWARD_SHOP_ITEMS.filter(
      (item) =>
        REPEATABLE_ITEMS.includes(item.id) ||
        !purchasedItemIds.includes(item.id)
    );

    return NextResponse.json({
      // Enhanced points data with dual system
      points: user.rewardPoints || 0, // Legacy field for backward compatibility
      pointsSummary: pointsSummary,
      totalPointsEarned: user.totalPointsEarned || 0,
      level: user.level || 1,
      nextLevelPoints: levelData.nextLevelPoints,
      progressToNext: levelData.progressToNext,
      transactions: user.rewardTransactions || [],
      achievements: user.achievements || [],
      availableAchievements: availableAchievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        points: a.points,
        icon: a.icon,
        progress: a.condition(user) ? 100 : 0, // Simple progress - either 0 or 100%
      })),
      // New reward shop data
      purchasedItems: user.purchasedItems || [],
      availableShopItems,
      activeBadges: user.activeBadges || [],
      specialFeatures: {
        streakProtectors: user.streakProtectors || 0,
        doublePointsDays: user.doublePointsDays || 0,
        hasAdvancedAnalytics: user.hasAdvancedAnalytics || false,
        customAvatar: user.customAvatar || null,
      },
      // Point confirmation info
      pendingConfirmation:
        confirmationData.confirmedPoints > 0
          ? {
              pointsConfirmed: confirmationData.confirmedPoints,
              transactionsConfirmed:
                confirmationData.confirmedTransactions.length,
            }
          : null,
    });
  } catch (error) {
    console.error('Error fetching rewards data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rewards/redeem - Redeem reward points for shop items
 * Validates purchase eligibility and updates user status. Repeatable items (e.g.
 * streak protectors, double points) bypass duplicate-purchase validation and are
 * omitted from the unique constraint query in the atomic update.
 */
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await req.json();

  if (!itemId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Step 1: Initial read for validation (gives specific error messages to frontend)
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the item in the shop
    const shopItem = REWARD_SHOP_ITEMS.find((item) => item.id === itemId);
    if (!shopItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if item is available
    if (!shopItem.available) {
      return NextResponse.json(
        { error: 'Item not available' },
        { status: 400 }
      );
    }

    // Check if user already purchased this item (only for non-repeatable items)
    const isRepeatable = REPEATABLE_ITEMS.includes(itemId);
    const alreadyPurchased =
      !isRepeatable &&
      user.purchasedItems?.some((item) => item.itemId === itemId);
    if (alreadyPurchased) {
      return NextResponse.json(
        { error: 'Item already purchased' },
        { status: 400 }
      );
    }

    // Check if user has enough confirmed points
    const confirmedPoints = user.confirmedPoints || 0;
    if (confirmedPoints < shopItem.cost) {
      return NextResponse.json(
        {
          error: 'Insufficient confirmed points',
          required: shopItem.cost,
          confirmedPoints: confirmedPoints,
          unconfirmedPoints: user.unconfirmedPoints || 0,
          message:
            'Only confirmed points can be used for purchases. Unconfirmed points will be confirmed automatically after 7 days.',
        },
        { status: 400 }
      );
    }

    // Step 2: Atomic Update to prevent TOCTOU race conditions (Double Spending)
    // Build the dynamic update object based on item effects
    interface RedeemUpdateQuery {
      $inc: {
        confirmedPoints: number;
        rewardPoints: number;
        streakProtectors?: number;
        doublePointsDays?: number;
      };
      $push: {
        purchasedItems: {
          itemId: string;
          name: string;
          cost: number;
          category: 'badge' | 'feature' | 'cosmetic';
          purchasedAt: Date;
          active: boolean;
        };
        rewardTransactions: {
          type: 'redeemed';
          points: number;
          pointsType: 'confirmed';
          reason: string;
          description: string;
          date: Date;
        };
        activeBadges?: string;
      };
      $set?: {
        hasAdvancedAnalytics: boolean;
      };
    }

    const updateQuery: RedeemUpdateQuery = {
      $inc: {
        confirmedPoints: -shopItem.cost,
        rewardPoints: -shopItem.cost,
      },
      $push: {
        purchasedItems: {
          itemId: shopItem.id,
          name: shopItem.name,
          cost: shopItem.cost,
          category: shopItem.category,
          purchasedAt: new Date(),
          active: true,
        },
        rewardTransactions: {
          type: 'redeemed',
          points: shopItem.cost,
          pointsType: 'confirmed',
          reason: 'item_purchase',
          description: `Purchased ${shopItem.name}`,
          date: new Date(),
        },
      },
    };

    // Apply specific item effects
    switch (shopItem.id) {
      case 'eco_hero_badge':
      case 'carbon_warrior_badge':
        updateQuery.$push.activeBadges = shopItem.id;
        break;
      case 'advanced_analytics':
        updateQuery.$set = { hasAdvancedAnalytics: true };
        break;
      case 'streak_protector':
        updateQuery.$inc.streakProtectors = 1;
        break;
      case 'double_points':
        updateQuery.$inc.doublePointsDays = 1;
        break;
      case 'custom_avatar':
        // Handled elsewhere
        break;
    }

    // Execute atomic update - MongoDB guarantees single-document atomicity
    const updateFilter: {
      email: string;
      confirmedPoints: { $gte: number };
      'purchasedItems.itemId'?: { $ne: string };
    } = {
      email,
      confirmedPoints: { $gte: shopItem.cost },
    };

    if (!isRepeatable) {
      updateFilter['purchasedItems.itemId'] = { $ne: itemId };
    }

    const updatedUser = await User.findOneAndUpdate(
      updateFilter,
      updateQuery,
      { new: true } // Return the updated document
    );

    // If updatedUser is null, it means a concurrent request already deducted the points!
    if (!updatedUser) {
      return NextResponse.json(
        {
          error: 'Transaction failed',
          message:
            'The purchase could not be completed. The item may have already been purchased or your point balance changed during the transaction.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      remainingPoints: updatedUser.rewardPoints,
      purchasedItem: shopItem,
      message: `${shopItem.name} redeemed successfully!`,
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}
