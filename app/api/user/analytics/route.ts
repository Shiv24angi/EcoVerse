export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkAndRunMonthlyRollover, monthKey } from '@/lib/monthly-cycle';
import { verifyCookieAuth } from '@/lib/auth';

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

interface AnalyticsResponse {
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

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
function weekLabel(day: number): string {
  if (day <= 7) return 'Week 1';
  if (day <= 14) return 'Week 2';
  if (day <= 21) return 'Week 3';
  return 'Week 4';
}

export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const authError = await verifyCookieAuth(req, email);
  if (authError) return authError;

  try {
    await dbConnect();
    await checkAndRunMonthlyRollover(email);

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyGoal = user.monthlyCarbonGoal ?? 40;
    const history = (user.monthlyCarbonHistory ?? [])
      .slice()
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(-11);

    const monthlyData: MonthlyDataPoint[] = history.map((h) => ({
      month: MONTH_LABELS[h.month],
      year: h.year,
      carbon: h.carbonSpent,
      scanned: h.totalScans,
      goal: h.carbonGoal,
      isCurrentMonth: false,
      bonusAwarded: h.bonusAwarded,
    }));
    const currentMonthScans = (user.scans ?? []).filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const currentMonthStats =
      user.monthlyStats?.[monthKey(currentMonth, currentYear)] ?? {};

    const currentMonthCarbon =
      currentMonthStats.carbon ??
      currentMonthScans.reduce((acc, s) => acc + (s.carbonEstimate ?? 0), 0);
    const currentMonthScanCount =
      currentMonthStats.scans ?? currentMonthScans.length;

    monthlyData.push({
      month: MONTH_LABELS[currentMonth],
      year: currentYear,
      carbon: parseFloat(currentMonthCarbon.toFixed(2)),
      scanned: currentMonthScanCount,
      goal: monthlyGoal,
      isCurrentMonth: true,
    });
    const categoryMap: Record<string, number> = {};
    for (const scan of currentMonthScans) {
      const cat = scan.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + (scan.carbonEstimate ?? 0);
    }

    const totalCategoryCarbon = Object.values(categoryMap).reduce(
      (a, b) => a + b,
      0
    );

    const categoryBreakdown: CategoryDataPoint[] = Object.entries(categoryMap)
      .map(([category, carbon]) => ({
        category,
        carbon: parseFloat(carbon.toFixed(2)),
        percentage:
          totalCategoryCarbon > 0
            ? Math.round((carbon / totalCategoryCarbon) * 100)
            : 0,
      }))
      .sort((a, b) => b.carbon - a.carbon)
      .slice(0, 8);
    const weekMap: Record<string, number> = {
      'Week 1': 0,
      'Week 2': 0,
      'Week 3': 0,
      'Week 4': 0,
    };
    for (const scan of currentMonthScans) {
      const day = new Date(scan.date).getDate();
      const label = weekLabel(day);
      weekMap[label] = (weekMap[label] ?? 0) + (scan.carbonEstimate ?? 0);
    }

    const weeklyTarget = parseFloat((monthlyGoal / 4).toFixed(2));
    const weeklyProgress: WeeklyDataPoint[] = Object.entries(weekMap).map(
      ([week, carbon]) => ({
        week,
        carbon: parseFloat(carbon.toFixed(2)),
        target: weeklyTarget,
      })
    );
    const totalCarbonSaved = [
      ...history,
      {
        carbonSpent: currentMonthCarbon,
        carbonGoal: monthlyGoal,
      },
    ].reduce((acc, m) => {
      const saved = m.carbonGoal - m.carbonSpent;
      return acc + (saved > 0 ? saved : 0);
    }, 0);

    const response: AnalyticsResponse = {
      monthlyData,
      categoryBreakdown,
      weeklyProgress,
      currentMonth: {
        carbon: parseFloat(currentMonthCarbon.toFixed(2)),
        scanned: currentMonthScanCount,
        goal: monthlyGoal,
        month: MONTH_LABELS[currentMonth],
        year: currentYear,
      },
      totalCarbonSaved: parseFloat(totalCarbonSaved.toFixed(2)),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      'Error fetching analytics:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
