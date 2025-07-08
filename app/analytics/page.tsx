"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingDown, Leaf, Target, Calendar, Award } from "lucide-react"

// Mock analytics data
const monthlyData = [
  { month: "Jan", carbon: 0, scanned: 0, goal: 0 },
  { month: "Feb", carbon: 0, scanned: 0, goal: 0 },
  { month: "Mar", carbon: 0, scanned: 0, goal: 0 },
  { month: "Apr", carbon: 0, scanned: 0, goal: 0 },
  { month: "May", carbon: 0, scanned: 0, goal: 0 },
  { month: "Jun", carbon: 4.09, scanned: 2, goal: 10 },
]

const categoryBreakdown = [
  { category: "Meat & Fish", carbon: 18.5, percentage: 41, color: "bg-red-500" },
  { category: "Dairy", carbon: 8.2, percentage: 18, color: "bg-orange-500" },
  { category: "Fruits & Vegetables", carbon: 6.1, percentage: 14, color: "bg-green-500" },
  { category: "Grains & Cereals", carbon: 5.4, percentage: 12, color: "bg-yellow-500" },
  { category: "Chocolate", carbon: 2.09, percentage: 20, color: "bg-blue-500" },
  { category: "Cold Drinks", carbon: 2.0, percentage: 15, color: "bg-purple-500" },
]

const sustainabilityTips = [
  {
    title: "Reduce Meat Consumption",
    description: "Try plant-based alternatives 2-3 times per week",
    impact: "Could save 12kg CO₂/month",
    difficulty: "Medium",
    icon: "🥗",
  },
  {
    title: "Choose Local Produce",
    description: "Buy fruits and vegetables from local farmers",
    impact: "Could save 3kg CO₂/month",
    difficulty: "Easy",
    icon: "🚜",
  },
  {
    title: "Minimize Packaging",
    description: "Choose products with less plastic packaging",
    impact: "Could save 2kg CO₂/month",
    difficulty: "Easy",
    icon: "📦",
  },
  {
    title: "Seasonal Shopping",
    description: "Buy seasonal fruits and vegetables",
    impact: "Could save 4kg CO₂/month",
    difficulty: "Easy",
    icon: "🍎",
  },
]

const weeklyProgress = [
  { week: "Week 1", carbon: 0, target: 0 },
  { week: "Week 2", carbon: 0, target: 0 },
  { week: "Week 3", carbon: 0, target: 0 },
  { week: "Week 4", carbon: 4.09, target: 10 },
]

export default function AnalyticsPage() {
  const currentMonth = monthlyData[monthlyData.length - 1]
  const previousMonth = monthlyData[monthlyData.length - 2]
  const carbonChange = currentMonth.carbon - previousMonth.carbon
  const scanChange = currentMonth.scanned - previousMonth.scanned

  const totalCarbonSaved = monthlyData.reduce((acc, month) => {
    return acc + Math.max(0, month.goal - month.carbon)
  }, 0)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-900/50 text-green-400 border-green-700"
      case "Medium":
        return "bg-yellow-900/50 text-yellow-400 border-yellow-700"
      case "Hard":
        return "bg-red-900/50 text-red-400 border-red-700"
      default:
        return "bg-gray-900/50 text-gray-400 border-gray-700"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Carbon Analytics</h1>
          <p className="text-gray-400 mt-2">
            Detailed insights into your sustainability journey and carbon footprint trends.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total CO₂ Saved</CardTitle>
              <Leaf className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalCarbonSaved.toFixed(1)} kg</div>
              <p className="text-xs text-gray-500">vs monthly goals</p>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Monthly Change</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {carbonChange > 0 ? "+" : ""}
                {carbonChange.toFixed(1)} kg
              </div>
              <p className="text-xs text-gray-500">from last month</p>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Products Scanned</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currentMonth.scanned}</div>
              <p className="text-xs text-gray-500">+{scanChange} from last month</p>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Goal Achievement</CardTitle>
              <Target className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {currentMonth.carbon < currentMonth.goal ? "✅" : "❌"}
              </div>
              <p className="text-xs text-gray-500">
                {currentMonth.carbon < currentMonth.goal ? "Goal met!" : "Above goal"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="dark-card border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingDown className="h-5 w-5" />
                Carbon Footprint Trend
              </CardTitle>
              <CardDescription className="text-gray-400">Monthly CO₂ emissions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.map((data, index) => (
                  <div key={data.month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">{data.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 w-16 text-right">{data.carbon}kg</span>
                        <span className="text-xs text-gray-500">(Goal: {data.goal}kg)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${data.carbon <= data.goal ? "bg-green-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min((data.carbon / 60) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-800">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    {carbonChange < 0 ? "Decreased" : "Increased"} by {Math.abs(carbonChange).toFixed(1)}kg this month
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark-card border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5" />
                Weekly Progress
              </CardTitle>
              <CardDescription className="text-gray-400">This month's weekly breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyProgress.map((week) => (
                  <div key={week.week} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">{week.week}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          {week.carbon}kg / {week.target}kg
                        </span>
                        {week.carbon <= week.target && (
                          <Badge className="bg-green-900/50 text-green-400 border-green-700">✓</Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={(week.carbon / week.target) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card className="dark-card border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5" />
              Carbon Footprint by Category
            </CardTitle>
            <CardDescription className="text-gray-400">
              Breakdown of your CO₂ emissions by product category this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryBreakdown.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">{category.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{category.carbon}kg</span>
                      <span className="text-xs text-gray-500">({category.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${category.color}`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sustainability Tips */}
        <Card className="dark-card border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Award className="h-5 w-5" />
              Personalized Sustainability Tips
            </CardTitle>
            <CardDescription className="text-gray-400">
              Based on your shopping patterns, here are ways to reduce your carbon footprint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sustainabilityTips.map((tip, index) => (
                <div key={index} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tip.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-400 mb-2">{tip.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-400 font-medium">{tip.impact}</span>
                        <Badge className={getDifficultyColor(tip.difficulty)}>{tip.difficulty}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Environmental Impact */}
        <Card className="dark-card border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Leaf className="h-5 w-5" />
              Environmental Impact Comparison
            </CardTitle>
            <CardDescription className="text-gray-400">
              See how your carbon footprint compares to various activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-2xl mb-2">🚗</div>
                <div className="text-lg font-bold text-white">{(currentMonth.carbon * 2.3).toFixed(0)} km</div>
                <div className="text-sm text-gray-400">Equivalent car driving</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-2xl mb-2">🌳</div>
                <div className="text-lg font-bold text-white">{Math.ceil(currentMonth.carbon / 22)} trees</div>
                <div className="text-sm text-gray-400">Needed to offset CO₂</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-2xl mb-2">💡</div>
                <div className="text-lg font-bold text-white">{(currentMonth.carbon * 1.2).toFixed(0)} hours</div>
                <div className="text-sm text-gray-400">LED bulb equivalent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
