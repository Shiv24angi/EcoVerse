"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Medal, Award, TrendingUp, Loader2, Users, Target, BarChart3, Star, Zap } from "lucide-react"

interface LeaderboardUser {
  id: string
  name: string
  email: string
  monthlyCarbon: number
  totalScanned: number
  rank: number
  change: "up" | "down" | "same"
  joinedAt: string
  streakCount: number
  totalPointsEarned: number
  level: number
  achievementCount: number
  levelTier: string
  pointsSummary: {
    confirmed: number
    unconfirmed: number
    total: number
  }
}

interface LeaderboardStats {
  totalUsers: number
  averagePoints: number
  averageLevel: string
  totalPointsInSystem: number
  levelTierDistribution: {
    legendary: number
    master: number
    expert: number
    advanced: number
    intermediate: number
    beginner: number
  }
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[]
  stats: LeaderboardStats
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [currentUserData, setCurrentUserData] = useState<LeaderboardUser | null>(null)

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  const fetchLeaderboardData = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (response.ok) {
        const data: LeaderboardData = await response.json()
        setLeaderboardData(data.leaderboard)
        setStats(data.stats)
        
        // Find current user's rank and data
        if (user) {
          const userEntry = data.leaderboard.find(entry => entry.email === user.email)
          if (userEntry) {
            setCurrentUserRank(userEntry.rank)
            setCurrentUserData(userEntry)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>
    }
  }

  const getChangeIndicator = (change: string) => {
    switch (change) {
      case "up":
        return <span className="text-green-600 text-sm">↗ Up</span>
      case "down":
        return <span className="text-red-600 text-sm">↘ Down</span>
      default:
        return <span className="text-gray-400 text-sm">→ Same</span>
    }
  }

  const getLevelTierBadge = (tier: string) => {
    const tierConfig = {
      'Legendary': { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400", icon: "👑" },
      'Master': { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400", icon: "🏆" },
      'Expert': { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400", icon: "⭐" },
      'Advanced': { color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400", icon: "🎯" },
      'Intermediate': { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400", icon: "📈" },
      'Beginner': { color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", icon: "🌱" }
    }
    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.Beginner
    return { ...config }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Points Leaderboard</h1>
          <p className="text-gray-400 mt-2">See how you rank against other eco-warriors by points and level.</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="ml-2 text-white">Loading leaderboard...</span>
          </div>
        ) : (
          <>
            {/* Current User Stats */}
            {currentUserData && (
              <Card className="dark-card border-gray-700 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Your Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getRankIcon(currentUserData.rank)}
                      <div>
                        <div className="text-lg font-bold text-white">Rank #{currentUserData.rank}</div>
                        <div className="text-sm text-gray-400">
                          {currentUserData.totalPointsEarned.toLocaleString()} points • Level {currentUserData.level} • {currentUserData.achievementCount} achievements
                        </div>
                        <div className="text-xs text-gray-500">
                          {currentUserData.totalScanned} scans • {currentUserData.streakCount} day streak
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getLevelTierBadge(currentUserData.levelTier).color}>
                        {getLevelTierBadge(currentUserData.levelTier).icon} {currentUserData.levelTier}
                      </Badge>
                      <div className="mt-1">{getChangeIndicator(currentUserData.change)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top 3 Podium */}
            {leaderboardData.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {leaderboardData.slice(0, 3).map((userEntry: LeaderboardUser, index: number) => (
                  <Card key={userEntry.id} className={`dark-card border-gray-700 ${index === 0 ? "ring-2 ring-yellow-400/50" : ""}`}>
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-2">{getRankIcon(userEntry.rank)}</div>
                      <CardTitle className="text-lg text-white">
                        {user && userEntry.email === user.email ? "You" : userEntry.name}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {userEntry.totalPointsEarned.toLocaleString()} points
                      </CardDescription>
                      <CardDescription className="text-gray-500 text-xs">
                        Level {userEntry.level} • {userEntry.achievementCount} achievements • {userEntry.streakCount} day streak
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <Badge className={getLevelTierBadge(userEntry.levelTier).color}>
                        {getLevelTierBadge(userEntry.levelTier).icon} {userEntry.levelTier}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Full Leaderboard */}
            <Card className="dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5" />
                  Points Rankings
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Rankings based on total points earned and level achieved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboardData.map((userEntry: LeaderboardUser) => {
                    const isCurrentUser = user && userEntry.email === user.email
                    const tierBadge = getLevelTierBadge(userEntry.levelTier)
                    return (
                      <div
                        key={userEntry.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                          isCurrentUser ? "bg-blue-900/30 border-blue-700 ring-1 ring-blue-500/50" : "bg-gray-800/50 border-gray-700 hover:bg-gray-800/70"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10">{getRankIcon(userEntry.rank)}</div>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gray-100">
                              {userEntry.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {isCurrentUser ? "You" : userEntry.name}
                              {isCurrentUser && (
                                <Badge variant="secondary" className="bg-green-900/50 text-green-400 border-green-700 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              <Zap className="inline h-3 w-3 mr-1" />
                              {userEntry.totalPointsEarned.toLocaleString()} points • Level {userEntry.level} • {userEntry.achievementCount} achievements
                            </div>
                            <div className="text-xs text-gray-500">
                              {userEntry.totalScanned} scans • {userEntry.streakCount} day streak • Joined {new Date(userEntry.joinedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={tierBadge.color}>
                            {tierBadge.icon} {userEntry.levelTier}
                          </Badge>
                          <div className="text-right">
                            {getChangeIndicator(userEntry.change)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="dark-card border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Your Rank
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {currentUserRank ? `#${currentUserRank}` : "N/A"}
                  </div>
                  <p className="text-xs text-gray-500">
                    Out of {stats?.totalUsers || 0} users
                  </p>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-gray-500">Active eco-warriors</p>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Average Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.averagePoints?.toLocaleString() || "0"}</div>
                  <p className="text-xs text-gray-500">Community average</p>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Average Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.averageLevel || "1.0"}</div>
                  <p className="text-xs text-gray-500">Community level</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
