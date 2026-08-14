import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const MONTHS = [
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

export async function GET(req: Request) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email: userEmail }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const scans = user.scans || [];
    const monthlyCarbonGoal = user.monthlyCarbonGoal || 40;

    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTotals: Record<number, { carbon: number; scanned: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthTotals[i] = { carbon: 0, scanned: 0 };
    }

    for (const scan of scans) {
      if (!scan.date) continue;
      const d = new Date(scan.date);
      const scanYear = d.getFullYear();
      const scanMonth = d.getMonth();

      if (scanYear === currentYear && scanMonth in monthTotals) {
        monthTotals[scanMonth].carbon += scan.carbonEstimate || 0;
        monthTotals[scanMonth].scanned += 1;
      }
    }

    const monthlyData = MONTHS.map((month, i) => ({
      month,
      year: currentYear,
      carbon: parseFloat(monthTotals[i].carbon.toFixed(2)),
      scanned: monthTotals[i].scanned,
      goal: monthlyCarbonGoal,
      isCurrentMonth: i === currentMonthIndex,
      bonusAwarded: false,
    }));

    const categoryTotals: Record<string, { carbon: number; count: number }> =
      {};
    for (const scan of scans) {
      const d = new Date(scan.date);
      if (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonthIndex
      ) {
        const cat = scan.category || 'Unknown';
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { carbon: 0, count: 0 };
        }
        categoryTotals[cat].carbon += scan.carbonEstimate || 0;
        categoryTotals[cat].count += 1;
      }
    }

    const totalCategoryCarbon = Object.values(categoryTotals).reduce(
      (sum, c) => sum + c.carbon,
      0
    );
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        carbon: parseFloat(data.carbon.toFixed(2)),
        percentage:
          totalCategoryCarbon > 0
            ? Math.round((data.carbon / totalCategoryCarbon) * 100)
            : 0,
      }))
      .sort((a, b) => b.carbon - a.carbon);

    const weeklyProgress = buildWeeklyProgress(
      scans,
      currentMonthIndex,
      currentYear,
      monthlyCarbonGoal
    );

    const tips = generateTips(categoryBreakdown);

    const totalCarbonSaved = parseFloat(
      monthlyData
        .slice(0, currentMonthIndex)
        .reduce((sum, m) => sum + Math.max(m.goal - m.carbon, 0), 0)
        .toFixed(2)
    );

    const filteredScans = scans.filter((s) => {
      const d = new Date(s.date);
      return d.getFullYear() === currentYear;
    });
    const averagePerScan =
      filteredScans.length > 0
        ? parseFloat(
            (
              filteredScans.reduce(
                (sum, s) => sum + (s.carbonEstimate || 0),
                0
              ) / filteredScans.length
            ).toFixed(2)
          )
        : 0;

    return NextResponse.json({
      monthlyData,
      categoryBreakdown,
      weeklyProgress,
      tips,
      currentMonth: {
        carbon: parseFloat(monthTotals[currentMonthIndex].carbon.toFixed(2)),
        scanned: monthTotals[currentMonthIndex].scanned,
        goal: monthlyCarbonGoal,
        month: MONTHS[currentMonthIndex],
        year: currentYear,
      },
      totalCarbonSaved,
      averagePerScan,
    });
  } catch (error) {
    console.error(
      'Analytics API error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function buildWeeklyProgress(
  scans: Array<{ date?: Date | string; carbonEstimate?: number }>,
  currentMonth: number,
  currentYear: number,
  goal: number
) {
  const weeklyData: Record<string, { carbon: number; count: number }> = {};

  for (let w = 1; w <= 4; w++) {
    weeklyData[`Week ${w}`] = { carbon: 0, count: 0 };
  }

  for (const scan of scans) {
    if (!scan.date) continue;
    const d = new Date(scan.date);
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear)
      continue;

    const day = d.getDate();
    let weekIndex = Math.min(Math.ceil(day / 7), 4);
    if (weekIndex < 1) weekIndex = 1;
    const weekLabel = `Week ${weekIndex}`;

    if (!weeklyData[weekLabel]) {
      weeklyData[weekLabel] = { carbon: 0, count: 0 };
    }
    weeklyData[weekLabel].carbon += scan.carbonEstimate || 0;
    weeklyData[weekLabel].count += 1;
  }

  const weeklyGoal = Math.round(goal / 4);
  return Object.entries(weeklyData).map(([week, data]) => ({
    week,
    carbon: parseFloat(data.carbon.toFixed(2)),
    target: weeklyGoal,
  }));
}

function generateTips(
  categoryBreakdown: Array<{
    category: string;
    carbon: number;
    percentage: number;
  }>
) {
  const tips: Array<{
    title: string;
    description: string;
    impact: string;
    difficulty: string;
    icon: string;
  }> = [];

  const highCarbonCategory = categoryBreakdown.find((c) => c.percentage > 30);

  if (highCarbonCategory) {
    const cat = highCarbonCategory.category.toLowerCase();
    let tip: {
      title: string;
      description: string;
      impact: string;
      difficulty: string;
      icon: string;
    };

    if (
      cat.includes('food') ||
      cat.includes('groceries') ||
      cat.includes('meat') ||
      cat.includes('dairy')
    ) {
      tip = {
        title: `Reduce ${highCarbonCategory.category} Consumption`,
        description: `${highCarbonCategory.category} makes up ${highCarbonCategory.percentage}% of your footprint. Try plant-based alternatives 2-3 times per week.`,
        impact: `Could save ~${Math.round(highCarbonCategory.carbon * 0.3)} kg CO\u2082/month`,
        difficulty: 'Medium',
        icon: '\uD83E\uDD66',
      };
    } else if (cat.includes('transport') || cat.includes('travel')) {
      tip = {
        title: `Reduce ${highCarbonCategory.category} Emissions`,
        description: `${highCarbonCategory.category} makes up ${highCarbonCategory.percentage}% of your footprint. Consider carpooling, public transit, or cycling.`,
        impact: `Could save ~${Math.round(highCarbonCategory.carbon * 0.3)} kg CO\u2082/month`,
        difficulty: 'Medium',
        icon: '\uD83D\uDE8C',
      };
    } else if (
      cat.includes('energy') ||
      cat.includes('electric') ||
      cat.includes('utilities')
    ) {
      tip = {
        title: `Reduce ${highCarbonCategory.category} Usage`,
        description: `${highCarbonCategory.category} makes up ${highCarbonCategory.percentage}% of your footprint. Switch to energy-efficient appliances and LED bulbs.`,
        impact: `Could save ~${Math.round(highCarbonCategory.carbon * 0.3)} kg CO\u2082/month`,
        difficulty: 'Medium',
        icon: '\uD83D\uDCA1',
      };
    } else {
      tip = {
        title: `Reduce ${highCarbonCategory.category} Footprint`,
        description: `${highCarbonCategory.category} makes up ${highCarbonCategory.percentage}% of your footprint. Look for eco-friendly alternatives.`,
        impact: `Could save ~${Math.round(highCarbonCategory.carbon * 0.3)} kg CO\u2082/month`,
        difficulty: 'Medium',
        icon: '\uD83C\uDF3F',
      };
    }

    tips.push(tip);
  }

  tips.push(
    {
      title: 'Choose Local Produce',
      description:
        'Buy fruits and vegetables from local farmers to reduce transport emissions.',
      impact: 'Could save 3 kg CO\u2082/month',
      difficulty: 'Easy',
      icon: '\uD83C\uDF3F',
    },
    {
      title: 'Minimise Packaging',
      description:
        'Choose products with less plastic packaging to reduce waste.',
      impact: 'Could save 2 kg CO\u2082/month',
      difficulty: 'Easy',
      icon: '\u267B\uFE0F',
    },
    {
      title: 'Seasonal Shopping',
      description:
        'Buy seasonal fruits and vegetables \u2014 they have a lower carbon footprint.',
      impact: 'Could save 4 kg CO\u2082/month',
      difficulty: 'Easy',
      icon: '\uD83C\uDF4E',
    }
  );

  return tips;
}
