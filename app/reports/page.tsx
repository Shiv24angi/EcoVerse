'use client';

import { useAuth } from '@/components/auth-provider';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Download,
  Share2,
  FileText,
  Leaf,
  Target,
  Save,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface MonthlyDataPoint {
  month: string;
  year: number;
  carbon: number;
  scanned: number;
  goal: number;
  isCurrentMonth: boolean;
  bonusAwarded?: boolean;
}

interface AnalyticsResponse {
  monthlyData: MonthlyDataPoint[];
  // we can ignore the rest for this specific view
}

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MonthlyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(0);

  const fetchData = useCallback(async () => {
    if (!user?.email) return;
    try {
      const response = await fetch(`/api/user/analytics`, {
        headers: {
          'x-user-email': encodeURIComponent(user.email),
        },
        cache: 'no-store',
      });
      if (response.ok) {
        const json: AnalyticsResponse = await response.json();
        // The API returns historical data + current month at the end of the array.
        // We want the most recent month first in our selection.
        const reversedData = [...json.monthlyData].reverse();
        setData(reversedData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
    } else {
      fetchData();
    }
  }, [user, router, fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const report = data[selectedMonthIdx];
    if (!report) return;

    const savings = Math.max(0, report.goal - report.carbon);
    const text = `I just reviewed my EcoVerse sustainability report for ${report.month} ${report.year}! I saved ${savings.toFixed(2)} kg CO₂ and completed ${report.scanned} eco actions. 🌍✨`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EcoVerse Sustainability Report',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  if (!user) return null;

  const currentReport = data[selectedMonthIdx];

  const chartData = currentReport
    ? [
        { name: 'Footprint', value: currentReport.carbon, fill: '#ef4444' }, // Red-ish for footprint
        { name: 'Goal', value: currentReport.goal, fill: '#10b981' }, // Green for goal
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header - Hidden on Print */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />
              Monthly Reports
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and export your sustainability progress over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="flex h-10 w-full md:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedMonthIdx}
              onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
              disabled={loading || data.length === 0}
            >
              {data.map((item, idx) => (
                <option key={idx} value={idx}>
                  {item.month} {item.year}{' '}
                  {item.isCurrentMonth ? '(Current)' : ''}
                </option>
              ))}
            </select>
            <Button
              onClick={handleShare}
              variant="outline"
              className="gap-2"
              disabled={loading || !currentReport}
            >
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button
              onClick={handlePrint}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || !currentReport}
            >
              <Download className="w-4 h-4" /> Export PDF
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-48 bg-muted rounded-xl w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-muted rounded-xl" />
              <div className="h-32 bg-muted rounded-xl" />
              <div className="h-32 bg-muted rounded-xl" />
            </div>
          </div>
        ) : !currentReport ? (
          <div className="text-center py-20 text-muted-foreground">
            No report data available. Start scanning to generate your first
            report!
          </div>
        ) : (
          <div
            className="print:bg-white print:text-black space-y-8"
            id="report-content"
          >
            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block text-center border-b pb-6 mb-6">
              <h1 className="text-4xl font-serif font-bold text-emerald-800">
                EcoVerse
              </h1>
              <h2 className="text-2xl mt-2 text-gray-600">
                Sustainability Report
              </h2>
              <p className="text-lg mt-1 text-gray-500">
                {currentReport.month} {currentReport.year} • {user.name}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Carbon Footprint */}
              <Card className="print:shadow-none print:border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-500">
                    Total Footprint
                  </CardTitle>
                  <Leaf className="w-4 h-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currentReport.carbon.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                    kg CO₂e
                  </p>
                </CardContent>
              </Card>

              {/* Scanned Items */}
              <Card className="print:shadow-none print:border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-500">
                    Eco Actions
                  </CardTitle>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {currentReport.scanned}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                    Products scanned & verified
                  </p>
                </CardContent>
              </Card>

              {/* Savings / Goal Difference */}
              <Card className="print:shadow-none print:border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground print:text-gray-500">
                    Carbon Saved
                  </CardTitle>
                  <Save className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">
                    {Math.max(
                      0,
                      currentReport.goal - currentReport.carbon
                    ).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 print:text-gray-500">
                    kg CO₂e under goal ({currentReport.goal})
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Chart Section */}
            <Card className="print:shadow-none print:border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Goal vs. Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={(val) => `${val} kg`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: number) => [`${value} kg CO₂`, '']}
                      />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={100}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Print Footer */}
            <div className="hidden print:block text-center pt-8 mt-12 border-t text-sm text-gray-400">
              Generated by EcoVerse • Together we make a difference
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
