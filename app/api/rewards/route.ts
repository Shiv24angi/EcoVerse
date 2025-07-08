import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import {
  calculateLevel,
  ACHIEVEMENTS,
  REWARD_SHOP_ITEMS,
  confirmPendingPoints,
  getUserPointsSummary
} from "@/lib/rewards-system"

// GET /api/rewards - Get user's complete rewards data
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = "test@example.com" // 🔒 Hardcoded temporarily

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email }) as any

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate current level data
    const levelData = calculateLevel(user.totalPointsEarned || 0)

    // Confirm any pending points and get point summary
    const confirmationData = confirmPendingPoints(user);
    if (confirmationData.confirmedPoints > 0) {
      // Update user's confirmed points if any were confirmed
      user.confirmedPoints = (user.confirmedPoints || 0) + confirmationData.confirmedPoints;
      user.unconfirmedPoints = Math.max(0, (user.unconfirmedPoints || 0) - confirmationData.confirmedPoints);
      user.rewardPoints = (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0);
      await user.save();
    }

    const pointsSummary = getUserPointsSummary(user);

    // Get available achievements (not yet earned)
    const earnedAchievementIds = (user.achievements || []).map((a: any) => a.id)
    const availableAchievements = ACHIEVEMENTS.filter(
      achievement => !earnedAchievementIds.includes(achievement.id)
    )

    // Get purchased item IDs
    const purchasedItemIds = (user.purchasedItems || []).map((item: any) => item.itemId)

    // Filter available shop items (not yet purchased)
    const availableShopItems = REWARD_SHOP_ITEMS.filter(
      item => !purchasedItemIds.includes(item.id)
    )

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
      availableAchievements: availableAchievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        points: a.points,
        icon: a.icon,
        progress: a.condition(user) ? 100 : 0 // Simple progress - either 0 or 100%
      })),
      // New reward shop data
      purchasedItems: user.purchasedItems || [],
      availableShopItems,
      activeBadges: user.activeBadges || [],
      specialFeatures: {
        streakProtectors: user.streakProtectors || 0,
        doublePointsDays: user.doublePointsDays || 0,
        hasAdvancedAnalytics: user.hasAdvancedAnalytics || false,
        customAvatar: user.customAvatar || null
      },
      // Point confirmation info
      pendingConfirmation: confirmationData.confirmedPoints > 0 ? {
        pointsConfirmed: confirmationData.confirmedPoints,
        transactionsConfirmed: confirmationData.confirmedTransactions.length
      } : null
    })

  } catch (error) {
    console.error("Error fetching rewards data:", error)
    return NextResponse.json({ error: "Failed to fetch rewards data" }, { status: 500 })
  }
}

// POST /api/rewards/redeem - Redeem reward points for shop items
export async function POST(req: Request) {
  const { itemId } = await req.json()
  const email = "test@example.com" // 🔒 use same hardcoded email


  if (!email || !itemId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email }) as any

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Find the item in the shop
    const shopItem = REWARD_SHOP_ITEMS.find(item => item.id === itemId)
    if (!shopItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    // Check if item is available
    if (!shopItem.available) {
      return NextResponse.json({ error: "Item not available" }, { status: 400 })
    }

    // Check if user already purchased this item
    const alreadyPurchased = user.purchasedItems?.some((item: any) => item.itemId === itemId)
    if (alreadyPurchased) {
      return NextResponse.json({ error: "Item already purchased" }, { status: 400 })
    }

    // Check if user has enough confirmed points (only confirmed points can be redeemed)
    const confirmedPoints = user.confirmedPoints || 0;
    if (confirmedPoints < shopItem.cost) {
      return NextResponse.json({
        error: "Insufficient confirmed points",
        required: shopItem.cost,
        confirmedPoints: confirmedPoints,
        unconfirmedPoints: user.unconfirmedPoints || 0,
        message: "Only confirmed points can be used for purchases. Unconfirmed points will be confirmed automatically after 7 days."
      }, { status: 400 })
    }

    // Deduct confirmed points only
    user.confirmedPoints -= shopItem.cost
    user.rewardPoints = (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0)

    // Add purchased item
    user.purchasedItems = user.purchasedItems || []
    user.purchasedItems.push({
      itemId: shopItem.id,
      name: shopItem.name,
      cost: shopItem.cost,
      category: shopItem.category,
      purchasedAt: new Date(),
      active: true
    })

    // Apply item effects
    switch (shopItem.id) {
      case 'eco_hero_badge':
      case 'carbon_warrior_badge':
        user.activeBadges = user.activeBadges || []
        user.activeBadges.push(shopItem.id)
        break
      case 'advanced_analytics':
        user.hasAdvancedAnalytics = true
        break
      case 'streak_protector':
        user.streakProtectors = (user.streakProtectors || 0) + 1
        break
      case 'double_points':
        user.doublePointsDays = (user.doublePointsDays || 0) + 1
        break
      case 'custom_avatar':
        // This would be handled in a separate avatar upload endpoint
        break
    }

    // Add transaction record
    user.rewardTransactions = user.rewardTransactions || []
    user.rewardTransactions.push({
      type: 'redeemed',
      points: shopItem.cost,
      reason: 'item_purchase',
      description: `Purchased ${shopItem.name}`,
      date: new Date()
    })

    await user.save()

    return NextResponse.json({
      success: true,
      remainingPoints: user.rewardPoints,
      purchasedItem: shopItem,
      message: `${shopItem.name} redeemed successfully!`
    })

  } catch (error) {
    console.error("Error redeeming reward:", error)
    return NextResponse.json({ error: "Failed to redeem reward" }, { status: 500 })
  }
}
