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
    monthlyCarbon: 40,
    monthlyCarbonGoal: 40,
    totalScanned: 12,
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
      bonusAwarded: true,
      bonusPoints: POINT_REWARDS.ECO_CHAMPION_GOAL,
    });

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
});
