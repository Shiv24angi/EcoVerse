"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Gift, Star, Trophy, TrendingUp, Calendar, ShoppingCart, Crown, Zap, Shield, BarChart3 } from "lucide-react"

interface RewardsData {
  points: number
  pointsSummary: {
    confirmed: number
    unconfirmed: number
    total: number
    pendingConfirmation: number
  }
  totalPointsEarned: number
  level: number
  nextLevelPoints: number
  progressToNext: number
  transactions: any[]
  achievements: any[]
  availableAchievements: any[]
  purchasedItems: any[]
  availableShopItems: any[]
  activeBadges: string[]
  specialFeatures: {
    streakProtectors: number
    doublePointsDays: number
    hasAdvancedAnalytics: boolean
    customAvatar: string | null
  }
}

export default function RewardsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
    } else {
      fetchRewardsData()
    }
  }, [user, router])

  const fetchRewardsData = async () => {
    try {
      const response = await fetch(`/api/rewards?email=test@example.com`)
      if (response.ok) {
        const data = await response.json()
        setRewardsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch rewards data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (itemId: string) => {
    if (!user || purchasing) return

    setPurchasing(true)
    try {
      const response = await fetch('/api/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: "test@example.com",
          itemId
        })

      })

      const result = await response.json()

      if (response.ok) {
        // Show success message and refresh data
        alert(`${result.purchasedItem.name} purchased successfully!`)
        fetchRewardsData()
      } else {
        // Handle insufficient confirmed points error with more detail
        if (result.error === "Insufficient confirmed points") {
          alert(`Insufficient confirmed points!\n\nRequired: ${result.required} points\nYou have: ${result.confirmedPoints} confirmed points\nUnconfirmed: ${result.unconfirmedPoints} points\n\n${result.message}`)
        } else {
          alert(result.error || 'Failed to purchase item')
        }
      }
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Failed to purchase item')
    } finally {
      setPurchasing(false)
    }
  }

  if (!user || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading rewards...</div>
        </div>
      </DashboardLayout>
    )
  }

  const getAchievementIcon = (icon: string) => {
    return icon || '🏆'
  }

  const getItemIcon = (iconString: string) => {
    switch (iconString) {
      case '🎖️': return <Crown className="h-6 w-6" />
      case '⚔️': return <Trophy className="h-6 w-6" />
      case '👤': return <div className="text-2xl">👤</div>
      case '📊': return <BarChart3 className="h-6 w-6" />
      case '🛡️': return <Shield className="h-6 w-6" />
      case '⚡': return <Zap className="h-6 w-6" />
      default: return <div className="text-2xl">{iconString}</div>
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'text-purple-400'
    if (level >= 7) return 'text-yellow-400'
    if (level >= 4) return 'text-blue-400'
    return 'text-green-400'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Rewards & Achievements 🎉</h1>
          <p className="text-gray-400 mt-2">Track your sustainability journey and earn rewards!</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600">Overview</TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-green-600">Achievements</TabsTrigger>
            <TabsTrigger value="shop" className="data-[state=active]:bg-green-600">Reward Shop</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-green-600">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="dark-card border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Available Points</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {rewardsData?.pointsSummary?.total || rewardsData?.points || 0}
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">✓ Confirmed (Spendable):</span>
                      <span className="text-green-400 font-medium">
                        {rewardsData?.pointsSummary?.confirmed || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-yellow-400">⏳ Unconfirmed:</span>
                      <span className="text-yellow-400 font-medium">
                        {rewardsData?.pointsSummary?.unconfirmed || 0}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {rewardsData?.totalPointsEarned || 0} total earned
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Current Level</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getLevelColor(rewardsData?.level || 1)}`}>
                    Level {rewardsData?.level || 1}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress to next level</span>
                      <span>{rewardsData?.progressToNext.toFixed(0) || 0}%</span>
                    </div>
                    <Progress value={rewardsData?.progressToNext || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Achievements</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {rewardsData?.achievements.length || 0}
                  </div>
                  <p className="text-xs text-gray-500">
                    {rewardsData?.availableAchievements.length || 0} more to unlock
                  </p>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Shop Items</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {rewardsData?.purchasedItems.length || 0}
                  </div>
                  <p className="text-xs text-gray-500">
                    {rewardsData?.availableShopItems.length || 0} available to buy
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Point Confirmation Info */}
            {rewardsData && rewardsData.pointsSummary && rewardsData.pointsSummary.unconfirmed > 0 && (
              <Card className="dark-card border-yellow-700 bg-yellow-900/10">
                <CardHeader>
                  <CardTitle className="text-yellow-400 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Point Confirmation System
                  </CardTitle>
                  <CardDescription className="text-yellow-200">
                    Understanding your reward points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-green-400 mt-1">✓</div>
                      <div>
                        <p className="text-white font-medium">Confirmed Points ({rewardsData.pointsSummary.confirmed})</p>
                        <p className="text-sm text-gray-300">Ready to spend in the reward shop immediately</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-400 mt-1">⏳</div>
                      <div>
                        <p className="text-white font-medium">Unconfirmed Points ({rewardsData.pointsSummary.unconfirmed})</p>
                        <p className="text-sm text-gray-300">
                          Will be automatically confirmed after 7 days. Some points like achievements and level bonuses are immediately confirmed.
                        </p>
                      </div>
                    </div>
                    {rewardsData.pointsSummary.pendingConfirmation > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-blue-900/20 border border-blue-700">
                        <p className="text-sm text-blue-300">
                          <strong>{rewardsData.pointsSummary.pendingConfirmation} points</strong> will be confirmed soon based on your scan activity.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Special Features */}
            {rewardsData && (rewardsData.specialFeatures.streakProtectors > 0 ||
              rewardsData.specialFeatures.doublePointsDays > 0 ||
              rewardsData.specialFeatures.hasAdvancedAnalytics) && (
                <Card className="dark-card border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Active Features</CardTitle>
                    <CardDescription className="text-gray-400">
                      Special items and bonuses you've unlocked
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {rewardsData.specialFeatures.streakProtectors > 0 && (
                        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700">
                          <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-400" />
                            <span className="text-white font-medium">Streak Protectors</span>
                          </div>
                          <p className="text-sm text-blue-300 mt-1">
                            {rewardsData.specialFeatures.streakProtectors} available
                          </p>
                        </div>
                      )}
                      {rewardsData.specialFeatures.doublePointsDays > 0 && (
                        <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700">
                          <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            <span className="text-white font-medium">Double Points Days</span>
                          </div>
                          <p className="text-sm text-yellow-300 mt-1">
                            {rewardsData.specialFeatures.doublePointsDays} available
                          </p>
                        </div>
                      )}
                      {rewardsData.specialFeatures.hasAdvancedAnalytics && (
                        <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-400" />
                            <span className="text-white font-medium">Advanced Analytics</span>
                          </div>
                          <p className="text-sm text-purple-300 mt-1">Unlocked</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Active Badges */}
            {rewardsData && rewardsData.activeBadges.length > 0 && (
              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Active Badges</CardTitle>
                  <CardDescription className="text-gray-400">
                    Badges you've earned and activated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {rewardsData.activeBadges.map((badgeId, index) => (
                      <Badge key={index} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1">
                        {badgeId === 'eco_hero_badge' ? '🎖️ Eco Hero' : '⚔️ Carbon Warrior'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {/* Earned Achievements */}
            {rewardsData && rewardsData.achievements.length > 0 && (
              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Earned Achievements</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your sustainability accomplishments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardsData.achievements.map((achievement, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-gray-600 bg-gradient-to-br from-green-900/20 to-blue-900/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{getAchievementIcon(achievement.icon || '🏆')}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            +{achievement.points} pts
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-white mb-1">{achievement.name}</h3>
                        <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(achievement.earnedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Achievements */}
            {rewardsData && rewardsData.availableAchievements.length > 0 && (
              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Available Achievements</CardTitle>
                  <CardDescription className="text-gray-400">
                    Keep going to unlock these rewards!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardsData.availableAchievements.map((achievement, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-gray-600 bg-gray-800/30 opacity-75"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl grayscale">{achievement.icon}</span>
                          <Badge variant="outline" className="border-gray-500 text-gray-400">
                            +{achievement.points} pts
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-gray-300 mb-1">{achievement.name}</h3>
                        <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {achievement.progress === 100 ? 'Ready to unlock!' : 'In progress...'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="shop" className="space-y-6">
            {/* Reward Shop */}
            <Card className="dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Reward Shop 🛍️</CardTitle>
                <CardDescription className="text-gray-400">
                  Use your points to unlock exclusive features and badges
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rewardsData && rewardsData.availableShopItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardsData.availableShopItems.map((item) => {
                      const confirmedPoints = rewardsData?.pointsSummary?.confirmed || rewardsData?.points || 0
                      const canAfford = confirmedPoints >= item.cost
                      const totalPoints = rewardsData?.pointsSummary?.total || rewardsData?.points || 0
                      const wouldAffordWithUnconfirmed = totalPoints >= item.cost

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-lg border border-gray-600 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-2xl">{getItemIcon(item.icon)}</div>
                            <Badge
                              variant="outline"
                              className={`${canAfford
                                ? 'border-green-500 text-green-400'
                                : wouldAffordWithUnconfirmed
                                  ? 'border-yellow-500 text-yellow-400'
                                  : 'border-red-500 text-red-400'
                                }`}
                            >
                              {item.cost} pts
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                          <p className="text-sm text-gray-400 mb-3">{item.description}</p>

                          {!canAfford && wouldAffordWithUnconfirmed && (
                            <div className="mb-3 p-2 rounded bg-yellow-900/20 border border-yellow-700">
                              <p className="text-xs text-yellow-300">
                                You'll have enough once unconfirmed points are confirmed (7 days)
                              </p>
                            </div>
                          )}

                          <Button
                            onClick={() => handlePurchase(item.id)}
                            disabled={!canAfford || purchasing}
                            className={`w-full ${canAfford
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gray-600 cursor-not-allowed'
                              }`}
                          >
                            {purchasing ? 'Purchasing...' :
                              canAfford ? 'Purchase' :
                                wouldAffordWithUnconfirmed ? 'Need Confirmed Points' : 'Insufficient Points'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">All available items have been purchased!</p>
                    <p className="text-sm text-gray-500 mt-2">Check back later for new items.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchased Items */}
            {rewardsData && rewardsData.purchasedItems.length > 0 && (
              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Your Items</CardTitle>
                  <CardDescription className="text-gray-400">
                    Items you've purchased from the reward shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewardsData.purchasedItems.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-gray-600 bg-gradient-to-br from-purple-900/20 to-pink-900/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-green-100 text-green-800">Owned</Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(item.purchasedAt)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-gray-500 text-gray-400">
                            {item.cost} pts
                          </Badge>
                          {item.active && (
                            <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Recent Transactions */}
            {rewardsData && rewardsData.transactions.length > 0 && (
              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                  <CardDescription className="text-gray-400">
                    Your latest reward transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rewardsData.transactions.slice(-15).reverse().map((transaction, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.type === 'earned' ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            {transaction.type === 'earned' ? (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            ) : (
                              <ShoppingCart className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{transaction.description}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                              {transaction.type === 'earned' && transaction.pointsType && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${transaction.pointsType === 'confirmed'
                                      ? 'border-green-500 text-green-400'
                                      : 'border-yellow-500 text-yellow-400'
                                    }`}
                                >
                                  {transaction.pointsType === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ${transaction.type === 'earned' ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {transaction.type === 'earned' ? '+' : '-'}{transaction.points} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
