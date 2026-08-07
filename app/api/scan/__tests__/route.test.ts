/**
 * @jest-environment node
 */

import { POST } from '../route';
import User from '@/models/User';
import { getCarbonFootprint } from '@/lib/climatiq';
import { resetRateLimit } from '@/lib/rate-limit';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  __esModule: true,
  verifyToken: jest.fn(),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        product: {
          product_name: 'Test Product',
          brands: 'Test Brand',
          categories_tags: ['en:snacks'],
          ingredients_text: 'Ingredients',
          image_front_url: 'https://example.com/front.jpg',
        },
      },
    }),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('@/lib/climatiq', () => ({
  __esModule: true,
  getCarbonFootprint: jest.fn(),
}));

jest.mock('@/lib/monthly-cycle', () => ({
  __esModule: true,
  checkAndRunMonthlyRollover: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/packaging-inference', () => ({
  __esModule: true,
  inferPackaging: jest.fn().mockReturnValue({
    material: 'Cardboard',
    recyclable: true,
    biodegradable: true,
    inferred: false,
  }),
}));

jest.mock('@/lib/rewards-system', () => ({
  __esModule: true,
  calculateScanPoints: jest.fn().mockReturnValue({
    points: 10,
    reasons: ['mocked'],
    isConfirmed: true,
  }),
  calculateLevel: jest.fn().mockReturnValue({ level: 1 }),
  checkAchievements: jest.fn().mockReturnValue([]),
  calculateMonthlyBonus: jest.fn().mockReturnValue(0),
  confirmPendingPoints: jest.fn().mockReturnValue({
    confirmedPoints: 0,
    confirmedTransactions: [],
  }),
  confirmAgedPoints: jest.fn().mockResolvedValue(0),
  getUserPointsSummary: jest.fn().mockReturnValue({
    confirmedPoints: 0,
    unconfirmedPoints: 0,
    rewardPoints: 0,
  }),
  calculateStreakUpdate: jest.fn().mockReturnValue({
    streakCount: 1,
    bestStreakCount: 1,
    streakProtectorsUsed: 0,
    streakBroken: false,
  }),
  shouldConfirmImmediately: jest.fn().mockReturnValue(true),
}));

const mockUser = {
  email: 'test@example.com',
  totalScanned: 0,
  lastScanDate: null,
  level: 1,
  streakCount: 0,
  bestStreakCount: 0,
  streakProtectors: 0,
  monthlyCarbon: 0,
  totalPointsEarned: 0,
  confirmedPoints: 0,
  unconfirmedPoints: 0,
  rewardPoints: 0,
};

const mockCookies = cookies as jest.Mock;
const mockVerifyToken = verifyToken as jest.Mock;

function createScanRequest(barcode = '12345678') {
  return new Request('http://localhost/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ barcode }),
  });
}

describe('Scan API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimit();

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'mock-auth-token' }),
    });
    mockVerifyToken.mockResolvedValue({
      email: 'test@example.com',
      userId: 'user-123',
    });

    (getCarbonFootprint as jest.Mock).mockResolvedValue({
      carbonFootprint: 1.25,
      category: 'snacks',
      confidence: 'high',
      calculation: 'mock calculation',
      source: 'mock source',
    });

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUser,
      level: 1,
      streakCount: 1,
      bestStreakCount: 1,
      monthlyCarbon: 1.25,
      totalScanned: 1,
    });
    (User.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
  });

  afterEach(() => {
    resetRateLimit();
  });

  it('returns 200 for a valid scan within the limit', async () => {
    const response = await POST(createScanRequest());
    expect(response.status).toBe(200);
  });

  it('returns 429 after ten scans and skips persistence work for the rejected request', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await POST(createScanRequest());
      expect(response.status).toBe(200);
    }

    const findOneCallCount = (User.findOne as jest.Mock).mock.calls.length;
    const updateCallCount = (User.findOneAndUpdate as jest.Mock).mock.calls.length;
    const dbConnectCallCount = jest.requireMock('@/lib/mongodb').default.mock.calls.length;

    const response = await POST(createScanRequest());
    expect(response.status).toBe(429);
    const retryAfterHeader = response.headers.get('Retry-After');
    expect(retryAfterHeader).not.toBeNull();
    expect(Number(retryAfterHeader)).toBeGreaterThan(0);
    expect((User.findOne as jest.Mock).mock.calls.length).toBe(findOneCallCount);
    expect((User.findOneAndUpdate as jest.Mock).mock.calls.length).toBe(updateCallCount);
    expect(jest.requireMock('@/lib/mongodb').default.mock.calls.length).toBe(dbConnectCallCount);
  });
});
