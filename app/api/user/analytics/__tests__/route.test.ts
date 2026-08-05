/**
 * @jest-environment node
 */

import { GET } from '../route';
import User from '@/models/User';

jest.mock('@/lib/mongodb', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@/lib/auth', () => {
  return {
    __esModule: true,
    verifyCookieAuth: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@/lib/monthly-cycle', () => {
  return {
    __esModule: true,
    checkAndRunMonthlyRollover: jest.fn().mockResolvedValue(false),
    monthKey: jest.requireActual('@/lib/monthly-cycle').monthKey,
  };
});

jest.mock('@/models/User', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(),
    },
  };
});

function authRequest() {
  return new Request('http://localhost/api/user/analytics', {
    method: 'GET',
    headers: {
      'x-user-email': 'test@example.com',
    },
  });
}

function mockFindOneLean(doc: unknown) {
  (User.findOne as jest.Mock).mockReturnValue({
    lean: jest.fn().mockReturnValue(doc),
  });
}

function baseUser() {
  return {
    email: 'test@example.com',
    monthlyCarbonGoal: 40,
    monthlyCarbonHistory: [
      {
        month: 11,
        year: 2025,
        carbonSpent: 20,
        totalScans: 8,
        carbonGoal: 40,
        bonusAwarded: false,
      },
      {
        month: 0,
        year: 2026,
        carbonSpent: 25,
        totalScans: 10,
        carbonGoal: 40,
        bonusAwarded: true,
      },
    ],
    monthlyStats: { '2026-1': { carbon: 40, scans: 610, points: 5400 } },
    scans: [
      { carbonEstimate: 3, category: 'Beverages', date: new Date(2026, 1, 3) },
      { carbonEstimate: 2, category: 'Snacks', date: new Date(2026, 1, 5) },
    ],
  };
}

describe('GET /api/user/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 401 when x-user-email header is missing', async () => {
    const req = new Request('http://localhost/api/user/analytics', {
      method: 'GET',
    });

    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('uses the monthlyStats counters for current-month totals, not the capped array', async () => {
    mockFindOneLean(baseUser());

    const res = await GET(authRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.currentMonth.carbon).toBe(40);
    expect(json.currentMonth.scanned).toBe(610);

    const current = json.monthlyData.find(
      (m: { isCurrentMonth: boolean }) => m.isCurrentMonth
    );
    expect(current.carbon).toBe(40);
    expect(current.scanned).toBe(610);
    expect(json.categoryBreakdown).toEqual([
      { category: 'Beverages', carbon: 3, percentage: 60 },
      { category: 'Snacks', carbon: 2, percentage: 40 },
    ]);
    expect(
      json.weeklyProgress.find((w: { week: string }) => w.week === 'Week 1')
        .carbon
    ).toBe(5);
    expect(json.totalCarbonSaved).toBe(35);
  });

  it('falls back to the scans array for legacy documents without monthlyStats', async () => {
    const user = {
      ...baseUser(),
      monthlyStats: {},
    };
    mockFindOneLean(user);

    const res = await GET(authRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.currentMonth.carbon).toBe(5);
    expect(json.currentMonth.scanned).toBe(2);
  });
});
