import { IScan } from '@/models/User';

export interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  condition: (scansInWindow: IScan[]) => boolean;
  progress: (scansInWindow: IScan[]) => number;
  maxProgress: number;
  rewardPoints: number;
  icon: string;
  category?: 'Scanning' | 'Eco-Friendly' | 'Carbon' | 'Community';
}

export interface UserChallengeRecord {
  challengeId: string;
  completedAt: Date;
  pointsEarned: number;
}

/**
 * Filter scans that occurred within the given challenge window.
 */
export function getScansInWindow(
  scans: IScan[],
  startDate: Date,
  endDate: Date
): IScan[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return (scans || []).filter((scan) => {
    const scanTime = new Date(scan.date).getTime();
    return scanTime >= start && scanTime <= end;
  });
}

/**
 * Get current week boundaries (Monday 00:00:00 to Sunday 23:59:59 UTC).
 */
export function getCurrentWeekWindow(now: Date = new Date()): {
  startDate: Date;
  endDate: Date;
} {
  const currentDate = new Date(now);
  const day = currentDate.getUTCDay();
  // Compute distance to previous Monday (Sunday is day 0 in JS, so convert to 7)
  const diffToMonday = (day === 0 ? 7 : day) - 1;

  const startDate = new Date(currentDate);
  startDate.setUTCDate(currentDate.getUTCDate() - diffToMonday);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);
  endDate.setUTCHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * Generate active weekly sustainability challenges.
 */
export function getActiveChallenges(now: Date = new Date()): Challenge[] {
  const { startDate, endDate } = getCurrentWeekWindow(now);

  return [
    {
      id: `weekly_scan_5_${startDate.toISOString().slice(0, 10)}`,
      name: 'Weekly Scan Hero',
      description:
        'Scan 5 products this week to keep your carbon tracking active.',
      startDate,
      endDate,
      maxProgress: 5,
      rewardPoints: 100,
      icon: '📱',
      category: 'Scanning',
      condition: (scans) => scans.length >= 5,
      progress: (scans) => Math.min(scans.length, 5),
    },
    {
      id: `weekly_recyclable_3_${startDate.toISOString().slice(0, 10)}`,
      name: 'Eco Choice Champion',
      description:
        'Scan 3 low carbon products (carbon estimate < 1.0kg CO2) this week.',
      startDate,
      endDate,
      maxProgress: 3,
      rewardPoints: 150,
      icon: '♻️',
      category: 'Eco-Friendly',
      condition: (scans) =>
        scans.filter((s) => s.carbonEstimate < 1.0).length >= 3,
      progress: (scans) =>
        Math.min(scans.filter((s) => s.carbonEstimate < 1.0).length, 3),
    },
    {
      id: `weekly_low_carbon_target_${startDate.toISOString().slice(0, 10)}`,
      name: 'Carbon Saver',
      description:
        'Scan at least 3 products with total carbon emissions under 3.0kg CO2 this week.',
      startDate,
      endDate,
      maxProgress: 3,
      rewardPoints: 200,
      icon: '🌱',
      category: 'Carbon',
      condition: (scans) => {
        if (scans.length < 3) return false;
        const totalCarbon = scans.reduce(
          (acc, curr) => acc + (curr.carbonEstimate || 0),
          0
        );
        return totalCarbon <= 3.0;
      },
      progress: (scans) => {
        const totalCarbon = scans.reduce(
          (acc, curr) => acc + (curr.carbonEstimate || 0),
          0
        );
        if (totalCarbon > 3.0) {
          // If carbon limit exceeded, cap progress below max (at most 2) so UI doesn't show 100% complete
          return Math.min(scans.length, 2);
        }
        return Math.min(scans.length, 3);
      },
    },
  ];
}

/**
 * Compute progress and status for a specific challenge against user scans and completion history.
 */
export function getChallengeStatus(
  challenge: Challenge,
  userScans: IScan[],
  completedRecords: UserChallengeRecord[] = [],
  now: Date = new Date()
) {
  const scansInWindow = getScansInWindow(
    userScans,
    challenge.startDate,
    challenge.endDate
  );
  const currentProgress = challenge.progress(scansInWindow);
  const isCompleted = challenge.condition(scansInWindow);
  const isClaimed = completedRecords.some(
    (rec) => rec.challengeId === challenge.id
  );
  const isExpired =
    new Date(now).getTime() > new Date(challenge.endDate).getTime();

  const progressPercentage = Math.min(
    100,
    Math.round((currentProgress / challenge.maxProgress) * 100)
  );

  return {
    scansInWindowCount: scansInWindow.length,
    currentProgress,
    maxProgress: challenge.maxProgress,
    progressPercentage,
    isCompleted,
    isClaimed,
    isExpired,
  };
}
