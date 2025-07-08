"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, TrendingDown, Target, Award } from "lucide-react"

interface UserData {
  monthlyCarbon: number
  totalScanned: number
  streakCount: number
  bestStreakCount: number
  scans: Array<{
    productName: string
    carbonEstimate: number
    category: string
    date: string
    barcode: string
  }>
  sustainabilityLevel: string
}

export default function CarbonTrackingPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.email) return

      try {
        const res = await fetch(`/api/user/score?email=${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          setUserData(data)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user?.email])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="text-white">Failed to load data</div>
      </DashboardLayout>
    )
  }

  const monthlyGoal = 40
  const progressPercentage = (userData.monthlyCarbon / monthlyGoal) * 100
  const dailyAverage = userData.scans.length > 0 ? userData.monthlyCarbon / userData.scans.length : 0

  // Group scans by date for better display
  const scansByDate = userData.scans.reduce((acc: { [date: string]: any[] }, scan) => {
    const dateKey = new Date(scan.date).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(scan)
    return acc
  }, {})

  const uniqueDates = Object.keys(scansByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Carbon Tracking</h1>
          <p className="text-gray-400 mt-2">
            Monitor your daily carbon footprint and track progress towards your sustainability goals.
          </p>
        </div>

        {/* Current Month Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{userData.monthlyCarbon.toFixed(1)} kg</div>
              <p className="text-xs text-gray-500">CO₂ emissions</p>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Daily Average</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{dailyAverage.toFixed(1)} kg</div>
              <p className="text-xs text-gray-500">per day</p>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Goal Progress</CardTitle>
              <Target className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{Math.min(progressPercentage, 100).toFixed(0)}%</div>
              <p className="text-xs text-gray-500">of monthly goal</p>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Streak</CardTitle>
              <Award className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{userData.streakCount} days</div>
              <p className="text-xs text-gray-500">tracking streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Goal Progress */}
        <Card className="dark-card border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Monthly Goal Progress</CardTitle>
            <CardDescription className="text-gray-400">
              Track your progress towards your {monthlyGoal}kg CO₂ monthly goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Progress</span>
                <span className="text-gray-300">
                  {userData.monthlyCarbon.toFixed(1)}kg / {monthlyGoal}kg
                </span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0kg</span>
                <span>{monthlyGoal}kg</span>
              </div>
              {progressPercentage <= 100 && (
                <Badge className="bg-green-900/50 text-green-400 border-green-700">
                  🎯 {progressPercentage < 100 ? 'On track to meet your goal!' : 'Goal achieved!'}
                </Badge>
              )}
              {progressPercentage > 100 && (
                <Badge className="bg-red-900/50 text-red-400 border-red-700">
                  ⚠️ Over monthly goal - consider reducing consumption
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="daily" className="data-[state=active]:bg-green-600">
              Daily Scans
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-green-600">
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <Card className="dark-card border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5" />
                  Daily Carbon Entries
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your scanned products and their carbon footprint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uniqueDates.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No scans yet. Start scanning products to track your carbon footprint!</p>
                  ) : (
                    uniqueDates.map((dateKey) => (
                      <div key={dateKey} className="space-y-2">
                        <h4 className="font-semibold text-white border-b border-gray-700 pb-1">
                          {new Date(dateKey).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </h4>
                        {scansByDate[dateKey].map((scan, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                            <div>
                              <div className="font-medium text-white">{scan.productName}</div>
                              <div className="text-sm text-gray-400">{scan.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-white">{scan.carbonEstimate} kg</div>
                              <div className="text-xs text-gray-500">CO₂</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Sustainability Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{userData.sustainabilityLevel}</div>
                    <Badge className={
                      userData.sustainabilityLevel === 'Excellent' ? 'bg-green-900/50 text-green-400 border-green-700' :
                      userData.sustainabilityLevel === 'Good' ? 'bg-blue-900/50 text-blue-400 border-blue-700' :
                      userData.sustainabilityLevel === 'Average' ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700' :
                      'bg-red-900/50 text-red-400 border-red-700'
                    }>
                      Based on {userData.monthlyCarbon.toFixed(1)} kg CO₂ this month
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark-card border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Tracking Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Products Scanned</span>
                    <span className="text-white font-semibold">{userData.totalScanned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Current Streak</span>
                    <span className="text-white font-semibold">{userData.streakCount} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Best Streak</span>
                    <span className="text-white font-semibold">{userData.bestStreakCount} days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}