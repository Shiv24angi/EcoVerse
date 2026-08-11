import mongoose from 'mongoose';
import User from '@/models/User';
import { calculateMonthlyBonus } from '@/lib/rewards-system';

export function monthKey(month: number, year: number): string {
  return `${year}-${month}`;
}
function isInMonth(d: Date, month: number, year: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}

function lastMomentOfMonth(month: number, year: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function scansInMonth(
  scans: Array<{ date: Date | string }>,
  month: number,
  year: number
): number {
  return scans.filter((s) => isInMonth(new Date(s.date), month, year)).length;
}

function pointsInMonth(
  transactions: Array<{
    type: string;
    points: number;
    date: Date | string;
  }>,
  month: number,
  year: number
): number {
  return transactions.reduce((acc, t) => {
    if (t.type !== 'earned') return acc;
    const d = new Date(t.date);
    return isInMonth(d, month, year) ? acc + (t.points ?? 0) : acc;
  }, 0);
}

export async function checkAndRunMonthlyRollover(
  userEmail: string
): Promise<boolean> {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) return false;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  if (!user.lastMonthlyReset) {
    await User.updateOne(
      { email: userEmail, lastMonthlyReset: null },
      { $set: { lastMonthlyReset: now } }
    );
    return false;
  }

  const lastReset = new Date(user.lastMonthlyReset);
  if (
    lastReset.getMonth() === currentMonth &&
    lastReset.getFullYear() === currentYear
  ) {
    return false;
  }
  const archiveMonth = lastReset.getMonth();
  const archiveYear = lastReset.getFullYear();
  const archiveKey = monthKey(archiveMonth, archiveYear);
  const currentKey = monthKey(currentMonth, currentYear);
  const archivedStats = user.monthlyStats?.[archiveKey] ?? {};
  const carbonSpent = archivedStats.carbon ?? user.monthlyCarbon ?? 0;
  const totalScans =
    archivedStats.scans ??
    scansInMonth(user.scans ?? [], archiveMonth, archiveYear);
  const pointsEarned =
    archivedStats.points ??
    pointsInMonth(user.rewardTransactions ?? [], archiveMonth, archiveYear);
  const bonusResult = calculateMonthlyBonus({
    monthlyCarbon: carbonSpent,
    totalScanned: user.totalScanned ?? 0,
  });

  const bonusPoints = bonusResult ? bonusResult.points : 0;
  const bonusEligible = bonusResult !== null;
  const alreadyCredited =
    user.lastMonthlyBonusCheck != null &&
    isInMonth(new Date(user.lastMonthlyBonusCheck), archiveMonth, archiveYear);
  const shouldCredit = bonusEligible && !alreadyCredited;
  const archiveRecord = {
    month: archiveMonth,
    year: archiveYear,
    carbonSpent,
    carbonGoal: user.monthlyCarbonGoal ?? 40,
    totalScans,
    pointsEarned,
    bonusAwarded: bonusEligible,
    bonusPoints,
    archivedAt: now,
  };
  const incPayload: Record<string, number> = {
    monthlyCarbon: -(user.monthlyCarbon ?? 0),
  };

  const pushPayload: Record<string, unknown> = {
    monthlyCarbonHistory: archiveRecord,
  };

  if (shouldCredit && bonusPoints > 0) {
    incPayload.confirmedPoints = bonusPoints;
    incPayload.totalPointsEarned = bonusPoints;
    incPayload.monthlyBonusesEarned = 1;
    incPayload[`monthlyStats.${currentKey}.points`] = bonusPoints;
    pushPayload.rewardTransactions = {
      _id: new mongoose.Types.ObjectId(),
      type: 'earned',
      points: bonusPoints,
      pointsType: 'confirmed',
      reason: 'monthly_bonus',
      description: bonusResult!.reason,
      date: now,
      confirmedAt: now,
    };
  }
  const result = await User.findOneAndUpdate(
    {
      email: userEmail,
      lastMonthlyReset: user.lastMonthlyReset,
      lastMonthlyBonusCheck: user.lastMonthlyBonusCheck ?? null,
    },
    {
      $inc: incPayload,
      $push: pushPayload,
      $set: {
        lastMonthlyReset: now,
        lastMonthlyBonusCheck: shouldCredit
          ? lastMomentOfMonth(archiveMonth, archiveYear)
          : user.lastMonthlyBonusCheck,
      },
      $unset: { [`monthlyStats.${archiveKey}`]: '' },
    },
    { new: false }
  );

  if (!result) {
    return false;
  }
  // Atomic update to sync rewardPoints with confirmedPoints + unconfirmedPoints
  // Only update if lastMonthlyReset was successfully updated in the previous step
  await User.updateOne(
    {
      email: userEmail,
      lastMonthlyReset: now, // Only update if rollover was successful
    },
    [
      {
        $set: {
          rewardPoints: { $add: ['$confirmedPoints', '$unconfirmedPoints'] },
        },
      },
    ]
  );

  return true;
}
