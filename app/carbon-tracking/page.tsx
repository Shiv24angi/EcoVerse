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
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!userData) {
    return (
      <DashboardLayout>
        <div className="text-gray-600">Failed to load data</div>
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
          <h1 className="text-3xl font-bold text-green-900">Carbon Tracking</h1>
          <p className="text-gray-600 mt-2">
            Monitor your daily carbon footprint and track progress towards your sustainability goals.
          </p>
        </div>

        {/* Current Month Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-sky-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-900">{userData.monthlyCarbon.toFixed(1)} kg</div>
              <p className="text-xs text-gray-600">CO₂ emissions</p>
            </CardContent>
          </Card>

          <Card className="bg-sky-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Daily Average</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-900">{dailyAverage.toFixed(1)} kg</div>
              <p className="text-xs text-gray-600">per day</p>
            </CardContent>
          </Card>

          <Card className="bg-sky-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Goal Progress</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-900">{Math.min(progressPercentage, 100).toFixed(0)}%</div>
              <p className="text-xs text-gray-600">of monthly goal</p>
            </CardContent>
          </Card>

          <Card className="bg-sky-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Streak</CardTitle>
              <Award className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-900">{userData.streakCount} days</div>
              <p className="text-xs text-gray-600">tracking streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Goal Progress */}
        <Card className="bg-indigo-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-indigo-900">Monthly Goal Progress</CardTitle>
            <CardDescription className="text-gray-600">
              Track your progress towards your {monthlyGoal}kg CO₂ monthly goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-600">Progress</span>
                <span className="text-indigo-600">
                  {userData.monthlyCarbon.toFixed(1)}kg / {monthlyGoal}kg
                </span>
              </div>
              <Progress value={Math.min(progressPercentage, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0kg</span>
                <span>{monthlyGoal}kg</span>
              </div>
              {progressPercentage <= 100 && (
                <Badge className="bg-green-600/50 text-green-600 border-green-700">
                  🎯 {progressPercentage < 100 ? 'On track to meet your goal!' : 'Goal achieved!'}
                </Badge>
              )}
              {progressPercentage > 100 && (
                <Badge className="bg-red-600/50 text-red-600 border-red-700">
                  ⚠️ Over monthly goal - consider reducing consumption
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-sky-100 border-sky-400">
            <TabsTrigger value="daily" className="data-[state=active]:bg-sky-300">
              Daily Scans
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-sky-300">
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <Card className="bg-cyan-100 border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-900">
                  <Calendar className="h-5 w-5" />
                  Daily Carbon Entries
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Your scanned products and their carbon footprint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uniqueDates.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No scans yet. Start scanning products to track your carbon footprint!</p>
                  ) : (
                    uniqueDates.map((dateKey) => (
                      <div key={dateKey} className="space-y-2">
                        <h4 className="font-semibold text-cyan-700 border-b border-cyan-500 pb-1">
                          {new Date(dateKey).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </h4>
                        {scansByDate[dateKey].map((scan, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-cyan-800/50 border border-cyan-700">
                            <div>
                              <div className="font-medium text-cyan-900">{scan.productName}</div>
                              <div className="text-sm text-gray-600">{scan.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-cyan-900">{scan.carbonEstimate} kg</div>
                              <div className="text-xs text-gray-600">CO₂</div>
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
              <Card className="bg-cyan-100 border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-cyan-900">Sustainability Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-900 mb-2">{userData.sustainabilityLevel}</div>
                    <Badge className={
                      userData.sustainabilityLevel === 'Excellent' ? 'bg-green-600/50 text-green-600 border-green-600' :
                      userData.sustainabilityLevel === 'Good' ? 'bg-blue-600/50 text-blue-600 border-blue-600' :
                      userData.sustainabilityLevel === 'Average' ? 'bg-yellow-600/50 text-yellow-600 border-yellow-600' :
                      'bg-red-600/50 text-red-600 border-red-600'
                    }>
                      Based on {userData.monthlyCarbon.toFixed(1)} kg CO₂ this month
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-cyan-100 border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-cyan-900">Tracking Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Products Scanned</span>
                    <span className="text-cyan-900 font-semibold">{userData.totalScanned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Streak</span>
                    <span className="text-cyan-900 font-semibold">{userData.streakCount} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Best Streak</span>
                    <span className="text-cyan-900 font-semibold">{userData.bestStreakCount} days</span>
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