import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { getUserPointsSummary } from "@/lib/rewards-system"

export async function GET() {
  try {
    await dbConnect()

    // Fetch all users and sort by totalPointsEarned (descending) and level (descending)
    const users = await User.find({})
      .select('name email monthlyCarbon totalScanned createdAt lastScanDate streakCount rewardPoints confirmedPoints unconfirmedPoints totalPointsEarned level achievements purchasedItems activeBadges rewardTransactions')
      .sort({ totalPointsEarned: -1, level: -1, totalScanned: -1 }) // Primary: highest points, Secondary: highest level, Tertiary: most scans
      .lean()

    // Calculate rank changes (simulate for now - you'd need historical data for real changes)
    const leaderboardData = users.map((user: any, index) => {
      // Simple change calculation based on user activity and points
      let change = "same"
      const totalPoints = user.totalPointsEarned || 0
      if (totalPoints > 500) change = "up"
      else if (totalPoints < 100 && user.totalScanned > 0) change = "down"
      
      // Calculate level tier based on level instead of carbon
      const levelTier = user.level >= 15 ? 'Legendary' :
                       user.level >= 10 ? 'Master' :
                       user.level >= 7 ? 'Expert' :
                       user.level >= 5 ? 'Advanced' :
                       user.level >= 3 ? 'Intermediate' : 'Beginner'
      
      // Get detailed points summary
      const pointsSummary = getUserPointsSummary(user)
      
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        monthlyCarbon: user.monthlyCarbon || 0,
        totalScanned: user.totalScanned || 0,
        rank: index + 1,
        change: change as "up" | "down" | "same",
        joinedAt: user.createdAt,
        streakCount: user.streakCount || 0,
        lastScanDate: user.lastScanDate,
        // Enhanced rewards data with dual point system
        rewardPoints: user.rewardPoints || 0, // Legacy field
        pointsSummary: pointsSummary,
        totalPointsEarned: user.totalPointsEarned || 0,
        level: user.level || 1,
        achievementCount: (user.achievements || []).length,
        levelTier,
        activeBadges: user.activeBadges || [],
        hasAdvancedFeatures: (user.purchasedItems || []).some((item: any) => 
          ['advanced_analytics', 'streak_protector', 'double_points'].includes(item.itemId))
      }
    })

    // Calculate enhanced stats
    const totalUsers = users.length
    const averagePoints = totalUsers > 0 
      ? users.reduce((sum, user) => sum + (user.totalPointsEarned || 0), 0) / totalUsers
      : 0
    
    const averageLevel = totalUsers > 0
      ? users.reduce((sum, user) => sum + (user.level || 1), 0) / totalUsers
      : 1

    const totalPointsInSystem = users.reduce((sum, user) => sum + (user.totalPointsEarned || 0), 0)
    
    const levelTierDistribution = {
      legendary: leaderboardData.filter(u => u.levelTier === 'Legendary').length,
      master: leaderboardData.filter(u => u.levelTier === 'Master').length,
      expert: leaderboardData.filter(u => u.levelTier === 'Expert').length,
      advanced: leaderboardData.filter(u => u.levelTier === 'Advanced').length,
      intermediate: leaderboardData.filter(u => u.levelTier === 'Intermediate').length,
      beginner: leaderboardData.filter(u => u.levelTier === 'Beginner').length,
    }

    return NextResponse.json({
      leaderboard: leaderboardData,
      stats: {
        totalUsers,
        averagePoints: Math.round(averagePoints),
        averageLevel: averageLevel.toFixed(1),
        totalPointsInSystem,
        levelTierDistribution
      }
    })

  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
