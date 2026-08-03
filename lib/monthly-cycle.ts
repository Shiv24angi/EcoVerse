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
 * The monthly eco-bonus is awarded only here (single guarded path): the
 * compare-and-set filter matches on both `lastMonthlyReset` and
 * `lastMonthlyBonusCheck`, so only the first concurrent caller wins and both
 * guards are updated atomically. The separate `POST /api/rewards/monthly-check`
 * route is a thin trigger into this function and no longer awards on its own.
 */

import mongoose from 'mongoose';
import User from '@/models/User';
import { calculateMonthlyBonus } from '@/lib/rewards-system';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Key used for `monthlyStats` on the user document: "YYYY-M" with a 0-based
 * month (matching `getMonth()`). Exported so every route that records a scan
 * increments the same bucket.
 */
export function monthKey(month: number, year: number): string {
  return `${year}-${month}`;
}

/** True when `d` falls within the given calendar month/year. */
function isInMonth(d: Date, month: number, year: number): boolean {
  return d.getFullYear() === year && d.getMonth() === month;
}

/**
 * Last instant of the given calendar month — used to stamp `lastMonthlyBonusCheck`
 * with the month whose bonus was credited (not `now`, which already belongs to
 * the next month).
 */
function lastMomentOfMonth(month: number, year: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

/**
 * Count scans that belong to a specific month.
 *
 * Used only as a fallback for legacy documents that predate `monthlyStats`
 * (Issue #420); the rollover archive is normally built from the running
 * counters instead.
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
 *
 * Used only as a fallback for legacy documents that predate `monthlyStats`
 * (Issue #420); the rollover archive is normally built from the running
 * counters instead.
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
  const archiveKey = monthKey(archiveMonth, archiveYear);
  const currentKey = monthKey(currentMonth, currentYear);

  // Build the archive from the per-month running counters (`monthlyStats`)
  // recorded by the scan routes. Those counters are exact even when the
  // `scans`/`rewardTransactions` arrays have been capped to bound document
  // size (Issue #420). For legacy documents created before the counters
  // existed, fall back to the previous array-scanning helpers.
  const archivedStats = user.monthlyStats?.[archiveKey] ?? {};
  const carbonSpent = archivedStats.carbon ?? user.monthlyCarbon ?? 0;
  const totalScans =
    archivedStats.scans ??
    scansInMonth(user.scans ?? [], archiveMonth, archiveYear);
  const pointsEarned =
    archivedStats.points ??
    pointsInMonth(user.rewardTransactions ?? [], archiveMonth, archiveYear);

  // Determine whether the eco-bonus was/should be awarded for this month.
  // `bonusEligible` reflects whether the archived month qualifies, while
  // `shouldCredit` additionally requires that the bonus has not already been
  // given for that month (tracked via `lastMonthlyBonusCheck`). The latter
  // guards against a pre-consolidation double-award where the old
  // `POST /api/rewards/monthly-check` path credited the same month first.
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

  // Build the archive record.
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

  // Build the $inc payload — only add bonus if eligible.
  const incPayload: Record<string, number> = {
    monthlyCarbon: -(user.monthlyCarbon ?? 0), // effectively sets to 0
  };

  const pushPayload: Record<string, unknown> = {
    monthlyCarbonHistory: archiveRecord,
  };

  if (shouldCredit && bonusPoints > 0) {
    incPayload.confirmedPoints = bonusPoints;
    incPayload.totalPointsEarned = bonusPoints;
    incPayload.monthlyBonusesEarned = 1;
    // The bonus transaction is dated `now` (the new month), so it counts
    // toward the new month's earned points — matching the pre-counter
    // `pointsInMonth` semantics, which grouped by transaction date.
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

  // Atomic compare-and-set: only runs if no other request already rolled over.
  // Matches the exact pre-read values of BOTH guards so they are mutated
  // together and a concurrent award can never slip in between.
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
        // Record the credited month (not `now`, which already belongs to the
        // new month) so `alreadyCredited` stays accurate at the next rollover.
        lastMonthlyBonusCheck: shouldCredit
          ? lastMomentOfMonth(archiveMonth, archiveYear)
          : user.lastMonthlyBonusCheck,
      },
      // The archived bucket is no longer needed (its numbers now live in
      // `monthlyCarbonHistory`); drop it so the map never grows unbounded.
      $unset: { [`monthlyStats.${archiveKey}`]: '' },
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
