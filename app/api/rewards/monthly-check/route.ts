import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { calculateMonthlyBonus, POINT_REWARDS } from "@/lib/rewards-system"

// POST /api/rewards/monthly-check - Check and award monthly bonuses
export async function POST(req: Request) {
  const { email: _email } = await req.json()

  // ✅ Hardcoded test user (keep this for dev)
  const primaryEmail = "test@example.com"
  const fallbackEmail = "shivangidps40@gmail.com"

  const email = _email || primaryEmail

  try {
    await dbConnect()

    // Try primary user
    let user = await User.findOne({ email: email }) as any

    // Fallback if primary not found
    if (!user && email === primaryEmail) {
      user = await User.findOne({ email: fallbackEmail }) as any
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentDate = new Date()
    const lastCheck = user.lastMonthlyBonusCheck ? new Date(user.lastMonthlyBonusCheck) : null

    if (!lastCheck || lastCheck.getMonth() !== currentDate.getMonth()) {
      const monthlyBonus = calculateMonthlyBonus(user)

      if (monthlyBonus) {
        user.confirmedPoints = (user.confirmedPoints || 0) + monthlyBonus.points
        user.rewardPoints = (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0)
        user.totalPointsEarned = (user.totalPointsEarned || 0) + monthlyBonus.points

        user.rewardTransactions = user.rewardTransactions || []
        user.rewardTransactions.push({
          type: 'earned',
          points: monthlyBonus.points,
          pointsType: 'confirmed',
          reason: 'monthly_bonus',
          description: monthlyBonus.reason,
          date: currentDate,
          confirmedAt: currentDate
        })

        user.lastMonthlyBonusCheck = currentDate
        user.monthlyBonusesEarned = (user.monthlyBonusesEarned || 0) + 1

        await user.save()

        return NextResponse.json({
          bonusAwarded: true,
          bonus: monthlyBonus,
          newTotalPoints: user.rewardPoints,
          confirmedPoints: user.confirmedPoints,
          unconfirmedPoints: user.unconfirmedPoints
        })
      }
    }

    return NextResponse.json({
      bonusAwarded: false,
      message: "No monthly bonus available"
    })

  } catch (error) {
    console.error("Error checking monthly bonus:", error)
    return NextResponse.json({ error: "Failed to check monthly bonus" }, { status: 500 })
  }
}

// GET /api/rewards/monthly-check - Get monthly bonus status
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const _email = searchParams.get('email')

  const primaryEmail = "test@example.com"
  const fallbackEmail = "shivangidps40@gmail.com"

  const email = _email || primaryEmail

  try {
    await dbConnect()

    let user = await User.findOne({ email: email }).lean() as any
    if (!user && email === primaryEmail) {
      user = await User.findOne({ email: fallbackEmail }).lean() as any
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentDate = new Date()
    const lastCheck = user.lastMonthlyBonusCheck ? new Date(user.lastMonthlyBonusCheck) : null
    const eligibleForBonus = !lastCheck || lastCheck.getMonth() !== currentDate.getMonth()

    const monthlyBonus = calculateMonthlyBonus(user)

    return NextResponse.json({
      eligibleForBonus,
      monthlyBonus,
      lastBonusCheck: user.lastMonthlyBonusCheck,
      totalBonusesEarned: user.monthlyBonusesEarned || 0
    })

  } catch (error) {
    console.error("Error getting monthly bonus status:", error)
    return NextResponse.json({ error: "Failed to get monthly bonus status" }, { status: 500 })
  }
}
