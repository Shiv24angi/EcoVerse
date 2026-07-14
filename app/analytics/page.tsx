'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import DashboardLayout from '@/components/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingDown,
  Leaf,
  Target,
  Calendar,
  Award,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyDataPoint {
  month: string;
  year: number;
  carbon: number;
  scanned: number;
  goal: number;
  isCurrentMonth: boolean;
  bonusAwarded?: boolean;
}

interface CategoryDataPoint {
  category: string;
  carbon: number;
  percentage: number;
}

interface WeeklyDataPoint {
  week: string;
  carbon: number;
  target: number;
}

interface AnalyticsData {
  monthlyData: MonthlyDataPoint[];
  categoryBreakdown: CategoryDataPoint[];
  weeklyProgress: WeeklyDataPoint[];
  currentMonth: {
    carbon: number;
    scanned: number;
    goal: number;
    month: string;
    year: number;
  };
  totalCarbonSaved: number;
}

// ─── Category colour palette ──────────────────────────────────────────────────

const CATEGORY_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
];

// ─── Sustainability tips (static) ─────────────────────────────────────────────

const sustainabilityTips = [
  {
    title: 'Reduce Meat Consumption',
    description: 'Try plant-based alternatives 2–3 times per week',
    impact: 'Could save 12 kg CO₂/month',
    difficulty: 'Medium',
    icon: '🥦',
  },
  {
    title: 'Choose Local Produce',
    description: 'Buy fruits and vegetables from local farmers',
    impact: 'Could save 3 kg CO₂/month',
    difficulty: 'Easy',
    icon: '🌿',
  },
  {
    title: 'Minimise Packaging',
    description: 'Choose products with less plastic packaging',
    impact: 'Could save 2 kg CO₂/month',
    difficulty: 'Easy',
    icon: '♻️',
  },
  {
    title: 'Seasonal Shopping',
    description: 'Buy seasonal fruits and vegetables',
    impact: 'Could save 4 kg CO₂/month',
    difficulty: 'Easy',
    icon: '🍎',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch('/api/user/analytics');
        if (!res.ok) throw new Error('Failed to load analytics');
        const json: AnalyticsData = await res.json();
        setData(json);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Unable to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user?.email]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-900/20 text-green-800 border-green-700';
      case 'Medium':
        return 'bg-yellow-900/20 text-yellow-800 border-yellow-700';
      case 'Hard':
        return 'bg-red-900/20 text-red-800 border-red-700';
      default:
        return 'bg-gray-900/20 text-gray-800 border-gray-700';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading analytics…</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-red-600 p-6">{error ?? 'No data available.'}</div>
      </DashboardLayout>
    );
  }

  const {
    monthlyData,
    categoryBreakdown,
    weeklyProgress,
    currentMonth,
    totalCarbonSaved,
  } = data;
  const previousMonth =
    monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const carbonChange = previousMonth
    ? currentMonth.carbon - previousMonth.carbon
    : 0;
  const scanChange = previousMonth
    ? currentMonth.scanned - previousMonth.scanned
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-900">Carbon Analytics</h1>
          <p className="text-gray-800 mt-2">
            Detailed insights into your sustainability journey and carbon
            footprint trends.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700">
                Total CO₂ Saved
              </CardTitle>
              <Leaf className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-800">
                {totalCarbonSaved.toFixed(1)} kg
              </div>
              <p className="text-xs text-teal-700">vs monthly goals</p>
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700">
                Monthly Change
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-800">
                {carbonChange > 0 ? '+' : ''}
                {carbonChange.toFixed(1)} kg
              </div>
              <p className="text-xs text-teal-700">from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700">
                Products Scanned
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-800">
                {currentMonth.scanned}
              </div>
              <p className="text-xs text-teal-700">
                {scanChange >= 0 ? '+' : ''}
                {scanChange} from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700">
                Goal Achievement
              </CardTitle>
              <Target className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-800">
                {currentMonth.carbon < currentMonth.goal ? '✅' : '❌'}
              </div>
              <p className="text-xs text-teal-700">
                {currentMonth.carbon < currentMonth.goal
                  ? 'Goal met!'
                  : 'Above goal'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends + Weekly Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <TrendingDown className="h-5 w-5" />
                Carbon Footprint Trend
              </CardTitle>
              <CardDescription className="text-teal-500">
                Monthly CO₂ emissions over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-teal-600 text-sm py-4 text-center">
                  No historical data yet — start scanning to build your trend!
                </p>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((d) => (
                    <div key={`${d.year}-${d.month}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-teal-500">
                          {d.month} {d.year !== currentMonth.year ? d.year : ''}
                          {d.isCurrentMonth && (
                            <span className="ml-1 text-xs text-teal-400">
                              (current)
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-teal-500 w-16 text-right">
                            {d.carbon.toFixed(1)} kg
                          </span>
                          <span className="text-xs text-teal-500">
                            (Goal: {d.goal} kg)
                          </span>
                          {d.bonusAwarded && (
                            <span title="Eco bonus awarded">🏆</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-400 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${d.carbon <= d.goal ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{
                            width: `${Math.min((d.carbon / Math.max(d.goal, d.carbon, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {previousMonth && (
                <div className="mt-4 p-3 bg-teal-900/20 rounded-lg border border-teal-800">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-teal-700">
                      {carbonChange < 0 ? 'Decreased' : 'Increased'} by{' '}
                      {Math.abs(carbonChange).toFixed(1)} kg this month
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <Calendar className="h-5 w-5" />
                Weekly Progress
              </CardTitle>
              <CardDescription className="text-teal-700">
                {currentMonth.month} {currentMonth.year} — weekly breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyProgress.map((week) => (
                  <div key={week.week} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-teal-500">
                        {week.week}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-teal-500">
                          {week.carbon.toFixed(1)} kg / {week.target} kg
                        </span>
                        {week.carbon <= week.target && week.carbon > 0 && (
                          <Badge className="bg-green-400/50 text-green-600 border-green-500">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress
                      value={
                        week.target > 0 ? (week.carbon / week.target) * 100 : 0
                      }
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card className="bg-teal-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <BarChart3 className="h-5 w-5" />
              Carbon Footprint by Category
            </CardTitle>
            <CardDescription className="text-teal-500">
              Breakdown of your CO₂ emissions by product category this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="text-teal-600 text-sm py-4 text-center">
                No scans this month yet — start scanning to see your category
                breakdown!
              </p>
            ) : (
              <div className="space-y-4">
                {categoryBreakdown.map((category, idx) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-teal-900">
                        {category.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-teal-500">
                          {category.carbon.toFixed(2)} kg
                        </span>
                        <span className="text-xs text-teal-500">
                          ({category.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-teal-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sustainability Tips */}
        <Card className="bg-teal-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Award className="h-5 w-5" />
              Personalised Sustainability Tips
            </CardTitle>
            <CardDescription className="text-teal-600">
              Based on your shopping patterns, here are ways to reduce your
              carbon footprint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sustainabilityTips.map((tip, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-teal-200/50 border border-teal-600"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tip.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-teal-700 mb-1">
                        {tip.title}
                      </h4>
                      <p className="text-sm text-teal-700 mb-2">
                        {tip.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-700 font-medium">
                          {tip.impact}
                        </span>
                        <Badge className={getDifficultyColor(tip.difficulty)}>
                          {tip.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Environmental Impact Comparison */}
        <Card className="bg-teal-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-teal-900">
              <Leaf className="h-5 w-5" />
              Environmental Impact Comparison
            </CardTitle>
            <CardDescription className="text-teal-700">
              See how your carbon footprint compares to various activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-teal-200/50 border border-teal-700">
                <div className="text-2xl mb-2">🚗</div>
                <div className="text-lg font-bold text-teal-900">
                  {(currentMonth.carbon * 2.3).toFixed(0)} km
                </div>
                <div className="text-sm text-teal-700">
                  Equivalent car driving
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-teal-200/50 border border-teal-700">
                <div className="text-2xl mb-2">🌳</div>
                <div className="text-lg font-bold text-teal-900">
                  {Math.ceil(currentMonth.carbon / 22)} trees
                </div>
                <div className="text-sm text-teal-700">
                  Needed to offset CO₂
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-teal-200/50 border border-teal-700">
                <div className="text-2xl mb-2">💡</div>
                <div className="text-lg font-bold text-teal-900">
                  {(currentMonth.carbon * 1.2).toFixed(0)} hours
                </div>
                <div className="text-sm text-teal-700">LED bulb equivalent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
