/**
 * @jest-environment node
 */

import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';
import User from '@/models/User';
import { POINT_REWARDS } from '@/lib/rewards-system';

jest.mock('@/models/User', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    },
  };
});

function mockFindOneLean(doc: unknown) {
  (User.findOne as jest.Mock).mockReturnValue({
    lean: jest.fn().mockReturnValue(doc),
  });
}

function makeEligibleUser(lastMonthlyBonusCheck: Date | null) {
  return {
    email: 'test@example.com',
    // Active cycle started in January 2026.
    lastMonthlyReset: new Date(2026, 0, 5),
    lastMonthlyBonusCheck,
    monthlyCarbon: 15,
    monthlyCarbonGoal: 40,
    totalScanned: 12,
    // Per-month running counters (Issue #420) — the archive is built from
    // these, not from the (possibly capped) `scans` array.
    monthlyStats: {
      '2026-0': { carbon: 15, scans: 12, points: 120 },
    },
    scans: [{ carbonEstimate: 15, date: new Date(2026, 0, 10) }],
    rewardTransactions: [],
  };
}

describe('checkAndRunMonthlyRollover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Now is the first instant of February 2026 -> the January cycle rolls over.
    jest.setSystemTime(new Date(2026, 1, 1, 0, 0, 0));
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({});
    (User.updateOne as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when the month has not changed', async () => {
    mockFindOneLean({
      ...makeEligibleUser(null),
      lastMonthlyReset: new Date(2026, 1, 1),
    });

    const rolledOver = await checkAndRunMonthlyRollover('test@example.com');

    expect(rolledOver).toBe(false);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('awards the bonus exactly once from the archived month data', async () => {
    // Bonus was last checked in December 2025, so January 2026 is not credited yet.
    mockFindOneLean(makeEligibleUser(new Date(2025, 11, 10)));

    const rolledOver = await checkAndRunMonthlyRollover('test@example.com');

    expect(rolledOver).toBe(true);

    const filter = (User.findOneAndUpdate as jest.Mock).mock.calls[0][0];
    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];

    // CAS matches both guards.
    expect(filter.lastMonthlyReset).toEqual(new Date(2026, 0, 5));
    expect(filter.lastMonthlyBonusCheck).toEqual(new Date(2025, 11, 10));

    // Bonus credited from archived (January) carbon, not the live counter.
    expect(update.$inc.confirmedPoints).toBe(POINT_REWARDS.ECO_CHAMPION_GOAL);
    expect(update.$inc.totalPointsEarned).toBe(POINT_REWARDS.ECO_CHAMPION_GOAL);
    expect(update.$inc.monthlyBonusesEarned).toBe(1);
    // The bonus transaction is dated in the new month, so its points land in
    // the new month's running bucket.
    expect(update.$inc['monthlyStats.2026-1.points']).toBe(
      POINT_REWARDS.ECO_CHAMPION_GOAL
    );
    expect(update.$push.rewardTransactions).toMatchObject({
      type: 'earned',
      points: POINT_REWARDS.ECO_CHAMPION_GOAL,
      pointsType: 'confirmed',
      reason: 'monthly_bonus',
    });
    expect(update.$push.monthlyCarbonHistory).toMatchObject({
      month: 0,
      year: 2026,
      carbonSpent: 15,
      totalScans: 12,
      pointsEarned: 120,
      bonusAwarded: true,
      bonusPoints: POINT_REWARDS.ECO_CHAMPION_GOAL,
    });

    // The archived bucket is dropped once its numbers live in history.
    expect(update.$unset).toEqual({ 'monthlyStats.2026-0': '' });

    // lastMonthlyBonusCheck records the credited (archive) month, not `now`.
    const stamped = update.$set.lastMonthlyBonusCheck as Date;
    expect(stamped.getMonth()).toBe(0);
    expect(stamped.getFullYear()).toBe(2026);
    expect(update.$set.lastMonthlyReset).toEqual(new Date(2026, 1, 1, 0, 0, 0));
  });

  it('does not award a second bonus when the archive month was already credited', async () => {
    // Simulate the pre-consolidation flow: POST /api/rewards/monthly-check
    // already credited January 2026, so lastMonthlyBonusCheck sits inside the
    // archive month. The rollover must not credit it again.
    mockFindOneLean(makeEligibleUser(new Date(2026, 0, 15)));

    const rolledOver = await checkAndRunMonthlyRollover('test@example.com');

    expect(rolledOver).toBe(true);

    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];
    expect(update.$inc.confirmedPoints).toBeUndefined();
    expect(update.$inc.monthlyBonusesEarned).toBeUndefined();
    expect(update.$push.rewardTransactions).toBeUndefined();

    // Archive still reflects that the month qualified.
    expect(update.$push.monthlyCarbonHistory).toMatchObject({
      month: 0,
      year: 2026,
      bonusAwarded: true,
      bonusPoints: POINT_REWARDS.ECO_CHAMPION_GOAL,
    });

    // The credited-month stamp is preserved so next month awards normally.
    expect(update.$set.lastMonthlyBonusCheck).toEqual(new Date(2026, 0, 15));
  });

  it('does not credit when the archived month is not eligible', async () => {
    const user = {
      ...makeEligibleUser(new Date(2025, 11, 10)),
      totalScanned: 2,
      monthlyCarbon: 35,
      monthlyStats: { '2026-0': { carbon: 35, scans: 2, points: 0 } },
      scans: [{ carbonEstimate: 35, date: new Date(2026, 0, 10) }],
    };
    mockFindOneLean(user);

    const rolledOver = await checkAndRunMonthlyRollover('test@example.com');

    expect(rolledOver).toBe(true);

    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];
    expect(update.$inc.confirmedPoints).toBeUndefined();
    expect(update.$push.rewardTransactions).toBeUndefined();
    expect(update.$push.monthlyCarbonHistory).toMatchObject({
      month: 0,
      year: 2026,
      bonusAwarded: false,
      bonusPoints: 0,
    });
  });

  it('builds the archive from running counters even when arrays were trimmed', async () => {
    // Simulate the Issue #420 scenario: >500 scans this month caused the
    // `scans` array to be capped, and the earliest January scans are gone.
    // The `monthlyStats` counters still hold the exact monthly totals, so the
    // archive must be built from them, never from the truncated array.
    const user = {
      ...makeEligibleUser(new Date(2025, 11, 10)),
      scans: [], // array fully truncated — no January scans survive
      rewardTransactions: [], // transactions also trimmed away
      monthlyStats: {
        '2026-0': { carbon: 42.5, scans: 610, points: 5400 },
      },
    };
    mockFindOneLean(user);

    const rolledOver = await checkAndRunMonthlyRollover('test@example.com');

    expect(rolledOver).toBe(true);

    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];
    expect(update.$push.monthlyCarbonHistory).toMatchObject({
      month: 0,
      year: 2026,
      carbonSpent: 42.5,
      totalScans: 610,
      pointsEarned: 5400,
    });
    // 42.5kg is not bonus-eligible — but the counter, not the (empty) array,
    // decided that.
    expect(update.$inc.confirmedPoints).toBeUndefined();
    expect(update.$push.rewardTransactions).toBeUndefined();
  });

  it('falls back to the legacy array scan for documents without counters', async () => {
    // A user created before the counters existed: no `monthlyStats` bucket.
    // The rollover should keep the old array-based behaviour for them.
    const user = {
      email: 'legacy@example.com',
      lastMonthlyReset: new Date(2026, 0, 5),
      lastMonthlyBonusCheck: null,
      monthlyCarbon: 15,
      monthlyCarbonGoal: 40,
      totalScanned: 12,
      scans: [{ carbonEstimate: 15, date: new Date(2026, 0, 10) }],
      rewardTransactions: [
        {
          type: 'earned',
          points: 60,
          pointsType: 'confirmed',
          date: new Date(2026, 0, 10),
        },
      ],
    };
    mockFindOneLean(user);

    const rolledOver = await checkAndRunMonthlyRollover('legacy@example.com');

    expect(rolledOver).toBe(true);

    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];
    expect(update.$push.monthlyCarbonHistory).toMatchObject({
      month: 0,
      year: 2026,
      carbonSpent: 15,
      totalScans: 1,
      pointsEarned: 60,
    });
  });
});
