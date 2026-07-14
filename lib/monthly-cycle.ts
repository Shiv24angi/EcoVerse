/**
 * lib/monthly-cycle.ts
 *
 * Monthly carbon lifecycle management (Issue #122).
 *
 * Provides `checkAndRunMonthlyRollover` which is called at request time from
 * the scan and user-score routes. It detects month boundaries, archives the
 * previous month's carbon data atomically, resets `monthlyCarbon` to 0, and
 * optionally awards the monthly eco-bonus — all without a cron job.
 *
 * Race-condition safety: the MongoDB update filter matches on `lastMonthlyReset`
 * (compare-and-set) so only the first concurrent caller wins; subsequent calls
 * within the same request burst are silent no-ops.
 */

import mongoose from 'mongoose';
import User from '@/models/User';
import { calculateMonthlyBonus } from '@/lib/rewards-system';

// ─── helpers ────────────────────────────────────────────────────────────────

/** True when `d` falls within the given calendar month/year. */
function isInMonth(d: Date, month: number, year: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}

/**
 * Sum the carbon of every scan belonging to a specific month.
 */
function carbonInMonth(
  scans: Array<{ carbonEstimate: number; date: Date | string }>,
  month: number,
  year: number
): number {
  return scans.reduce((acc, s) => {
    const d = new Date(s.date);
    return isInMonth(d, month, year) ? acc + (s.carbonEstimate ?? 0) : acc;
  }, 0);
}

/**
 * Count scans that belong to a specific month.
 */
function scansInMonth(
  scans: Array<{ date: Date | string }>,
  month: number,
  year: number
): number {
  return scans.filter((s) => isInMonth(new Date(s.date), month, year)).length;
}

/**
 * Sum the points from rewardTransactions that belong to a specific month
 * and were of type 'earned'.
 */
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

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Checks whether a monthly carbon reset is due for the given user and, if so,
 * archives the current month's data and resets `monthlyCarbon` to 0 atomically.
 *
 * Safe to call on every request — it is a no-op when the month has not changed.
 *
 * @param userEmail  Email address used to locate the user document.
 * @returns          `true` if a rollover was performed, `false` otherwise.
 */
export async function checkAndRunMonthlyRollover(
  userEmail: string
): Promise<boolean> {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) return false;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ── Lazy initialisation ──────────────────────────────────────────────────
  // First-ever call: stamp lastMonthlyReset so subsequent calls have a
  // baseline. We treat the current month as the active cycle.
  if (!user.lastMonthlyReset) {
    await User.updateOne(
      { email: userEmail, lastMonthlyReset: null },
      { $set: { lastMonthlyReset: now } }
    );
    return false;
  }

  const lastReset = new Date(user.lastMonthlyReset);

  // ── Guard: already rolled over this month ───────────────────────────────
  if (
    lastReset.getMonth() === currentMonth &&
    lastReset.getFullYear() === currentYear
  ) {
    return false;
  }

  // ── Rollover is due ──────────────────────────────────────────────────────
  const archiveMonth = lastReset.getMonth();
  const archiveYear = lastReset.getFullYear();

  // Compute per-month stats from the sub-document arrays (which survive
  // across months; we only reset the running `monthlyCarbon` counter).
  const carbonSpent = carbonInMonth(
    user.scans ?? [],
    archiveMonth,
    archiveYear
  );
  const totalScans = scansInMonth(user.scans ?? [], archiveMonth, archiveYear);
  const pointsEarned = pointsInMonth(
    user.rewardTransactions ?? [],
    archiveMonth,
    archiveYear
  );

  // Determine whether the eco-bonus was/should be awarded for this month.
  const bonusResult = calculateMonthlyBonus({
    monthlyCarbon: user.monthlyCarbon ?? 0,
    totalScanned: user.totalScanned ?? 0,
  });

  const bonusPoints = bonusResult ? bonusResult.points : 0;
  const bonusAwarded = bonusResult !== null;

  // Build the archive record.
  const archiveRecord = {
    month: archiveMonth,
    year: archiveYear,
    carbonSpent,
    carbonGoal: user.monthlyCarbonGoal ?? 40,
    totalScans,
    pointsEarned,
    bonusAwarded,
    bonusPoints,
    archivedAt: now,
  };

  // Build the $inc payload — only add bonus if eligible.
  const incPayload: Record<string, number> = {
    monthlyCarbon: -(user.monthlyCarbon ?? 0), // effectively sets to 0
  };

  const pushPayload: Record<string, unknown> = {
    monthlyCarbonHistory: archiveRecord,
  };

  if (bonusAwarded && bonusPoints > 0) {
    incPayload.confirmedPoints = bonusPoints;
    incPayload.totalPointsEarned = bonusPoints;
    incPayload.monthlyBonusesEarned = 1;
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

  // Atomic compare-and-set: only runs if no other request already rolled over.
  const result = await User.findOneAndUpdate(
    {
      email: userEmail,
      // CAS guard — matches the exact lastMonthlyReset value we read above.
      lastMonthlyReset: user.lastMonthlyReset,
    },
    {
      $inc: incPayload,
      $push: pushPayload,
      $set: {
        lastMonthlyReset: now,
        lastMonthlyBonusCheck: bonusAwarded ? now : user.lastMonthlyBonusCheck,
      },
    },
    { new: false }
  );

  if (!result) {
    // Another concurrent request already performed the rollover — safe to ignore.
    return false;
  }

  // Keep rewardPoints in sync (confirmed + unconfirmed).
  await User.updateOne({ email: userEmail }, [
    {
      $set: {
        rewardPoints: { $add: ['$confirmedPoints', '$unconfirmedPoints'] },
      },
    },
  ]);

  return true;
}
