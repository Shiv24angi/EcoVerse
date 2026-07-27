/**
 * @jest-environment node
 */

import { POST } from '../route';
import User from '@/models/User';
import { getCarbonFootprint } from '@/lib/climatiq';
import { findLowerCarbonAlternatives } from '@/lib/alternative-products';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
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

jest.mock('@/lib/alternative-products', () => ({
  __esModule: true,
  findLowerCarbonAlternatives: jest.fn(),
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

describe('Scan API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

  it('returns alternatives when reliable lower-carbon products exist', async () => {
    (findLowerCarbonAlternatives as jest.Mock).mockResolvedValue([
      {
        productName: 'Oat Snack',
        avgCarbonEstimate: 0.85,
        sampleCount: 3,
        percentLower: 32,
      },
    ]);

    const request = new Request('http://localhost/api/scan', {
      method: 'POST',
      headers: {
        'x-user-email': 'test@example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: '12345678' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.alternatives).toEqual([
      {
        productName: 'Oat Snack',
        avgCarbonEstimate: 0.85,
        sampleCount: 3,
        percentLower: 32,
      },
    ]);
    expect(findLowerCarbonAlternatives).toHaveBeenCalledWith(
      'snacks',
      1.25,
      'Test Product'
    );
  });

  it('returns null when no reliable alternatives exist', async () => {
    (findLowerCarbonAlternatives as jest.Mock).mockResolvedValue([]);

    const request = new Request('http://localhost/api/scan', {
      method: 'POST',
      headers: {
        'x-user-email': 'test@example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: '12345678' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.alternatives).toBeNull();
  });
});
