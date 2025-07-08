// app/api/user/score/route.ts

import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { calculateLevel, getSustainabilityTier } from "@/lib/rewards-system"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email }).lean() as any

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate current level data
    const levelData = calculateLevel(user.totalPointsEarned || 0);
    const tierData = getSustainabilityTier(user.monthlyCarbon || 0, user.totalScanned || 0);

    return NextResponse.json({
      monthlyCarbon: user.monthlyCarbon || 0,
      totalScanned: user.totalScanned || 0,
      streakCount: user.streakCount || 0,
      bestStreakCount: user.bestStreakCount || 0,
      scans: user.scans || [],
      sustainabilityLevel: user.monthlyCarbon < 20 ? 'Excellent' : 
                          user.monthlyCarbon < 35 ? 'Good' : 
                          user.monthlyCarbon < 50 ? 'Average' : 'Needs Improvement',
      // Enhanced rewards data
      rewards: {
        points: user.rewardPoints || 0,
        totalPointsEarned: user.totalPointsEarned || 0,
        level: user.level || 1,
        nextLevelPoints: levelData.nextLevelPoints,
        progressToNext: levelData.progressToNext,
        recentTransactions: (user.rewardTransactions || []).slice(-10), // Last 10 transactions
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
          customAvatar: user.customAvatar || null
        },
        // Monthly bonus tracking
        monthlyBonusesEarned: user.monthlyBonusesEarned || 0,
        lastMonthlyBonusCheck: user.lastMonthlyBonusCheck
      }
    })
  } catch (error) {
    console.error("Error fetching user data:", error)
    return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { email, productName, carbonEstimate } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      newScore: user.monthlyCarbon,
      totalScanned: user.totalScanned
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 })
  }
}
