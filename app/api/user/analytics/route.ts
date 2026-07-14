// Opt out of static generation - connects to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';
import { verifyCookieAuth } from '@/lib/auth';

// ─── Types returned to the client ───────────────────────────────────────────

interface MonthlyDataPoint {
  month: string; // e.g. "Jan"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/** Returns the week label for a day-of-month (1-indexed). */
function weekLabel(day: number): string {
  if (day <= 7) return 'Week 1';
  if (day <= 14) return 'Week 2';
  if (day <= 21) return 'Week 3';
  return 'Week 4';
}

/**
 * GET /api/user/analytics
 *
 * Returns:
 *  - monthlyData: up to 12 months of history + current month
 *  - categoryBreakdown: carbon by product category for current month
 *  - weeklyProgress: carbon per week for current month
 *  - currentMonth: summary card stats
 *  - totalCarbonSaved: sum of (goal - carbon) for months where goal was met
 */
export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Defense-in-depth: verify the auth_token cookie matches the x-user-email header
  const authError = await verifyCookieAuth(req, email);
  if (authError) return authError;

  try {
    await dbConnect();

    // Run rollover first so the data we read is current-month accurate.
    await checkAndRunMonthlyRollover(email);

    const user = await User.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyGoal = user.monthlyCarbonGoal ?? 40;

    // ── Historical data from archive ─────────────────────────────────────
    const history = (user.monthlyCarbonHistory ?? [])
      .slice() // don't mutate the original
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(-11); // keep at most 11 past months (+ current = 12 total)

    const monthlyData: MonthlyDataPoint[] = history.map((h) => ({
      month: MONTH_LABELS[h.month],
      year: h.year,
      carbon: h.carbonSpent,
      scanned: h.totalScans,
      goal: h.carbonGoal,
      isCurrentMonth: false,
      bonusAwarded: h.bonusAwarded,
    }));

    // ── Current month data from live scans ───────────────────────────────
    const currentMonthScans = (user.scans ?? []).filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const currentMonthCarbon = currentMonthScans.reduce(
      (acc, s) => acc + (s.carbonEstimate ?? 0),
      0
    );

    monthlyData.push({
      month: MONTH_LABELS[currentMonth],
      year: currentYear,
      carbon: parseFloat(currentMonthCarbon.toFixed(2)),
      scanned: currentMonthScans.length,
      goal: monthlyGoal,
      isCurrentMonth: true,
    });

    // ── Category breakdown (current month only) ──────────────────────────
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
      .slice(0, 8); // top 8 categories

    // ── Weekly progress (current month) ─────────────────────────────────
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

    // ── Total carbon saved across all history ────────────────────────────
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
        scanned: currentMonthScans.length,
        goal: monthlyGoal,
        month: MONTH_LABELS[currentMonth],
        year: currentYear,
      },
      totalCarbonSaved: parseFloat(totalCarbonSaved.toFixed(2)),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
