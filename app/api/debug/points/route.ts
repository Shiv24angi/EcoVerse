import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { 
  getUserPointsSummary, 
  confirmPendingPoints,
  POINT_CONFIRMATION
} from "@/lib/rewards-system"

// GET /api/debug/points?email=user@email.com - Debug point system for a user
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email }) as any

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const pointsSummary = getUserPointsSummary(user)
    const confirmationData = confirmPendingPoints(user)
    
    // Get transaction breakdown
    const transactions = user.rewardTransactions || []
    const confirmedTransactions = transactions.filter((t: any) => t.pointsType === 'confirmed')
    const unconfirmedTransactions = transactions.filter((t: any) => t.pointsType === 'unconfirmed')
    
    const now = new Date()
    const transactionDetails = transactions.map((t: any) => {
      const transactionDate = new Date(t.date)
      const hoursElapsed = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60)
      const hoursRemaining = POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS - hoursElapsed
      
      return {
        ...t,
        hoursElapsed: hoursElapsed.toFixed(2),
        hoursRemaining: hoursRemaining.toFixed(2),
        daysRemaining: (hoursRemaining / 24).toFixed(2),
        isEligibleForConfirmation: hoursElapsed >= POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS
      }
    })

    return NextResponse.json({
      userEmail: email,
      rawData: {
        confirmedPoints: user.confirmedPoints,
        unconfirmedPoints: user.unconfirmedPoints,
        rewardPoints: user.rewardPoints,
        totalPointsEarned: user.totalPointsEarned
      },
      pointsSummary,
      confirmationInfo: {
        eligibleForConfirmation: confirmationData.confirmedPoints,
        eligibleTransactions: confirmationData.confirmedTransactions.length,
        confirmationDelayHours: POINT_CONFIRMATION.CONFIRMATION_DELAY_HOURS
      },
      transactionCounts: {
        total: transactions.length,
        confirmed: confirmedTransactions.length,
        unconfirmed: unconfirmedTransactions.length
      },
      transactionDetails,
      validationChecks: {
        pointsMatch: pointsSummary.total === (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0),
        legacyPointsMatch: pointsSummary.total === (user.rewardPoints || 0),
        confirmedPointsSum: confirmedTransactions.reduce((sum: number, t: any) => sum + (t.type === 'earned' ? t.points : -t.points), 0),
        unconfirmedPointsSum: unconfirmedTransactions.reduce((sum: number, t: any) => sum + t.points, 0)
      }
    })

  } catch (error) {
    console.error("Error debugging points:", error)
    return NextResponse.json({ error: "Failed to debug points" }, { status: 500 })
  }
}

// POST /api/debug/points - Force confirm points for testing
export async function POST(req: Request) {
  const { email, action } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email }) as any

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (action === 'confirm_all') {
      // Force confirm all unconfirmed points
      const unconfirmedPoints = user.unconfirmedPoints || 0
      user.confirmedPoints = (user.confirmedPoints || 0) + unconfirmedPoints
      user.unconfirmedPoints = 0
      user.rewardPoints = user.confirmedPoints
      
      // Update all unconfirmed transactions to confirmed
      if (user.rewardTransactions) {
        user.rewardTransactions.forEach((t: any) => {
          if (t.pointsType === 'unconfirmed') {
            t.pointsType = 'confirmed'
            t.confirmedAt = new Date()
          }
        })
      }
      
      await user.save()
      
      return NextResponse.json({
        success: true,
        message: `Confirmed ${unconfirmedPoints} points`,
        newSummary: getUserPointsSummary(user)
      })
    } else if (action === 'add_test_points') {
      // Add some test points for debugging
      const testPoints = 50
      user.unconfirmedPoints = (user.unconfirmedPoints || 0) + testPoints
      user.rewardPoints = (user.confirmedPoints || 0) + (user.unconfirmedPoints || 0)
      user.totalPointsEarned = (user.totalPointsEarned || 0) + testPoints
      
      user.rewardTransactions = user.rewardTransactions || []
      user.rewardTransactions.push({
        type: 'earned',
        points: testPoints,
        pointsType: 'unconfirmed',
        reason: 'test',
        description: 'Test points for debugging',
        date: new Date()
      })
      
      await user.save()
      
      return NextResponse.json({
        success: true,
        message: `Added ${testPoints} test unconfirmed points`,
        newSummary: getUserPointsSummary(user)
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error) {
    console.error("Error in debug action:", error)
    return NextResponse.json({ error: "Failed to perform debug action" }, { status: 500 })
  }
}
