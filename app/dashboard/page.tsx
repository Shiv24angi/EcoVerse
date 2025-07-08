"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Leaf, Scan, TrendingDown, Trophy, Star, Gift } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface UserStats {
  monthlyCarbon: number
  totalScanned: number
  rank: number
  totalUsers: number
  streakCount: number
  // Rewards data
  rewardPoints?: number
  pointsSummary?: {
    confirmed: number
    unconfirmed: number
    total: number
    pendingConfirmation: number
  }
  level?: number
  achievementCount?: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
    } else {
      fetchUserStats()
    }
  }, [user, router])

  const fetchUserStats = async () => {
    try {
      // Fetch leaderboard data to get user rank and stats
      const [leaderboardResponse, rewardsResponse] = await Promise.all([
        fetch('/api/leaderboard', { cache: 'no-store' }),
        fetch(`/api/rewards?email=${encodeURIComponent(user?.email || '')}`, { cache: 'no-store' })
      ])

      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json()
        const currentUser = leaderboardData.leaderboard.find((u: any) => u.email === user?.email)

        let stats: UserStats = {
          monthlyCarbon: currentUser?.monthlyCarbon || 0,
          totalScanned: currentUser?.totalScanned || 0,
          rank: currentUser?.rank || 0,
          totalUsers: leaderboardData.stats.totalUsers,
          streakCount: currentUser?.streakCount || 0,
          rewardPoints: currentUser?.rewardPoints || 0,
          level: currentUser?.level || 1,
          achievementCount: currentUser?.achievementCount || 0
        }

        // Add detailed points data from rewards API
        if (rewardsResponse.ok) {
          const rewardsData = await rewardsResponse.json()
          stats.pointsSummary = rewardsData.pointsSummary
          stats.level = rewardsData.level
          stats.achievementCount = rewardsData.achievements?.length || 0
        }

        setUserStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  const monthlyGoal = 40 // kg CO₂
  const progressPercentage = userStats ? (userStats.monthlyCarbon / monthlyGoal) * 100 : 0

  const getSustainabilityScore = (carbon: number) => {
    if (carbon < 20) return "A+"
    if (carbon < 35) return "B+"
    if (carbon < 50) return "B"
    return "C"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-green-900">Welcome back, {user.name}! 👋</h1>
          <p className="text-gray-400 mt-2">{"Here's your sustainability overview for this month."}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-green-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Monthly CO₂</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {loading ? "..." : `${userStats?.monthlyCarbon.toFixed(1) || 0} kg`}
              </div>
              <p className="text-xs text-gray-500">
                {progressPercentage < 100 ? "Below" : "Above"} monthly goal
              </p>
            </CardContent>
          </Card>

          <Card className="bg-lime-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-lime-900">Products Scanned</CardTitle>
              <Scan className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-lime-700">
                {loading ? "..." : userStats?.totalScanned || 0}
              </div>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">Sustainability Score</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {loading ? "..." : getSustainabilityScore(userStats?.monthlyCarbon || 0)}
              </div>
              <p className="text-xs text-gray-500">
                {userStats && userStats.monthlyCarbon < 35 ? "Above average" : "Room for improvement"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-900">Leaderboard Rank</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700">
                {loading ? "..." : `#${userStats?.rank || 0}`}
              </div>
              <p className="text-xs text-gray-500">
                Out of {userStats?.totalUsers || 0} users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rewards Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-yellow-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-900">Reward Points</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {loading ? "..." : userStats?.pointsSummary?.total || userStats?.rewardPoints || 0}
              </div>
              {userStats?.pointsSummary && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-green-400">✓ Confirmed:</span>
                    <span>{userStats.pointsSummary.confirmed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">⏳ Pending:</span>
                    <span>{userStats.pointsSummary.unconfirmed}</span>
                  </div>
                </div>
              )}
              {!userStats?.pointsSummary && (
                <p className="text-xs text-gray-500">Available to spend</p>
              )}
              <Link href="/rewards">
                <Button variant="outline" size="sm" className="mt-2 text-xs">
                  Visit Shop
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-cyan-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-900">Level</CardTitle>
              <Star className={`h-4 w-4 ${
                (userStats?.level || 1) >= 10 ? 'text-purple-400' : 
                (userStats?.level || 1) >= 7 ? 'text-yellow-400' : 
                (userStats?.level || 1) >= 4 ? 'text-blue-400' : 'text-green-400'
              }`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (userStats?.level || 1) >= 10 ? 'text-purple-400' : 
                (userStats?.level || 1) >= 7 ? 'text-yellow-400' : 
                (userStats?.level || 1) >= 4 ? 'text-blue-400' : 'text-green-400'
              }`}>
                {loading ? "..." : userStats?.level || 1}
              </div>
              <p className="text-xs text-gray-500">
                {(userStats?.level || 1) >= 15 ? 'Max Level!' : 'Current level'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-900">Achievements</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700">
                {loading ? "..." : userStats?.achievementCount || 0}
              </div>
              <p className="text-xs text-gray-500">Unlocked</p>
              <Link href="/rewards">
                <Button variant="outline" size="sm" className="mt-2 text-xs">
                  View All
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-orange-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Sustainability Tier</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${userStats && userStats.monthlyCarbon < 10 && userStats.totalScanned >= 15 ? 'text-gray-300' :
                userStats && userStats.monthlyCarbon < 20 && userStats.totalScanned >= 10 ? 'text-yellow-400' :
                  userStats && userStats.monthlyCarbon < 30 && userStats.totalScanned >= 5 ? 'text-gray-400' :
                    userStats && userStats.monthlyCarbon < 40 ? 'text-amber-600' : 'text-gray-500'
                }`}>
                {loading ? "..." :
                  userStats && userStats.monthlyCarbon < 10 && userStats.totalScanned >= 15 ? "Platinum" :
                    userStats && userStats.monthlyCarbon < 20 && userStats.totalScanned >= 10 ? "Gold" :
                      userStats && userStats.monthlyCarbon < 30 && userStats.totalScanned >= 5 ? "Silver" :
                        userStats && userStats.monthlyCarbon < 40 ? "Bronze" : "Beginner"
                }
              </div>
              <p className="text-xs text-gray-500">
                {userStats && userStats.monthlyCarbon < 10 && userStats.totalScanned >= 15 ? "Ultimate eco-warrior" :
                  userStats && userStats.monthlyCarbon < 20 && userStats.totalScanned >= 10 ? "Exceptional sustainability" :
                    userStats && userStats.monthlyCarbon < 30 && userStats.totalScanned >= 5 ? "Great progress" :
                      userStats && userStats.monthlyCarbon < 40 ? "Getting started" : "Room for improvement"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Progress */}
        <Card className="bg-green-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-green-900">Monthly Carbon Goal</CardTitle>
            <CardDescription className="text-green-700">
              Track your progress towards your {monthlyGoal}kg CO₂ monthly goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {userStats?.monthlyCarbon.toFixed(1) || 0}kg / {monthlyGoal}kg
                </span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0kg</span>
                <span>{monthlyGoal}kg</span>
              </div>
            </div>
            {progressPercentage < 100 && (
              <Badge variant="secondary" className="mt-4 bg-green-100 text-green-800">
                🎯 On track to meet your goal!
              </Badge>
            )}
            {userStats && userStats.streakCount > 0 && (
              <Badge variant="secondary" className="mt-2 ml-2 bg-blue-100 text-blue-800">
                🔥 {userStats.streakCount} day streak!
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-teal-900">Scan a Product</CardTitle>
              <CardDescription className="text-gray-400">
                Scan or enter a barcode to check its recyclability and carbon footprint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/scan">
                <Button className="w-full">
                  <Scan className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-teal-900">View Leaderboard</CardTitle>
              <CardDescription className="text-gray-400">
                See how you rank against other sustainable shoppers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full">
                  <Trophy className="mr-2 h-4 w-4" />
                  View Rankings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
