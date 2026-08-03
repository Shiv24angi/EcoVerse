/**
 * @jest-environment node
 */

import { POST } from '../route';
import axios from 'axios';
import User from '@/models/User';
import { getCarbonFootprint } from '@/lib/climatiq';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';
import { sanitizeProductImage } from '@/lib/product-image';

jest.mock('@/lib/mongodb', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('axios', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
    },
  };
});

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

jest.mock('@/lib/climatiq', () => {
  return {
    __esModule: true,
    getCarbonFootprint: jest.fn(),
  };
});

jest.mock('@/lib/monthly-cycle', () => {
  const actual = jest.requireActual('@/lib/monthly-cycle');
  return {
    __esModule: true,
    checkAndRunMonthlyRollover: jest.fn(),
    monthKey: actual.monthKey,
  };
});

jest.mock('@/lib/rewards-system', () => {
  const actual = jest.requireActual('@/lib/rewards-system');
  return {
    __esModule: true,
    calculateScanPoints: jest.fn(),
    calculateLevel: jest.fn(),
    checkAchievements: jest.fn(),
    calculateMonthlyBonus: jest.fn(),
    confirmPendingPoints: jest.fn(),
    confirmAgedPoints: jest.fn(),
    getUserPointsSummary: actual.getUserPointsSummary,
    calculateStreakUpdate: jest.fn(),
    shouldConfirmImmediately: jest.fn(),
  };
});

function scanRequest() {
  return new Request('http://localhost/api/scan', {
    method: 'POST',
    headers: {
      'x-user-email': 'test@example.com',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ barcode: '3017620422003' }),
  });
}

function mockOpenFoodFacts(product: Record<string, unknown>) {
  (axios.get as jest.Mock).mockResolvedValue({
    data: { product, status: 1, code: '3017620422003' },
  });
}

const baseUser = {
  email: 'test@example.com',
  totalScanned: 0,
  lastScanDate: null,
  streakCount: 0,
  bestStreakCount: 0,
  streakProtectors: 0,
  level: 1,
  monthlyCarbon: 0,
  totalPointsEarned: 0,
};

const updatedUser = {
  email: 'test@example.com',
  level: 1,
  streakCount: 1,
  bestStreakCount: 1,
  monthlyCarbon: 1.5,
  totalScanned: 1,
  totalPointsEarned: 10,
  rewardPoints: 10,
  confirmedPoints: 0,
  unconfirmedPoints: 10,
  rewardTransactions: [],
  achievements: [],
};

describe('POST /api/scan image URL validation (Issue #422)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (User.findOne as jest.Mock).mockResolvedValue(baseUser);
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedUser);
    (User.updateOne as jest.Mock).mockResolvedValue({});
    (getCarbonFootprint as jest.Mock).mockResolvedValue({
      carbonFootprint: 1.5,
      category: 'Food',
      confidence: 'high',
      calculation: 'source + factor',
      source: 'climatiq',
    });
    (checkAndRunMonthlyRollover as jest.Mock).mockResolvedValue(false);

    const rewards = jest.requireMock('@/lib/rewards-system') as Record<
      string,
      jest.Mock
    >;
    rewards.calculateScanPoints.mockReturnValue({
      points: 10,
      reasons: ['scan'],
      isConfirmed: false,
    });
    rewards.calculateLevel.mockReturnValue({ level: 1 });
    rewards.checkAchievements.mockReturnValue([]);
    rewards.calculateMonthlyBonus.mockReturnValue(0);
    rewards.confirmPendingPoints.mockReturnValue({
      confirmedPoints: 0,
      confirmedTransactions: [],
    });
    rewards.confirmAgedPoints.mockResolvedValue(0);
    rewards.calculateStreakUpdate.mockReturnValue({
      streakCount: 1,
      bestStreakCount: 1,
      streakBroken: false,
      streakProtectorsUsed: 0,
    });
    rewards.shouldConfirmImmediately.mockReturnValue(true);
  });

  it('returns null image when OFF record is tampered with a tracking URL', async () => {
    mockOpenFoodFacts({
      product_name: 'Test Product',
      brands: 'TestBrand',
      ingredients_text: 'Ingredients',
      image_front_url: 'http://evil.example/track.gif',
      image_url: 'http://evil.example/track.gif',
      image_front_small_url: 'http://evil.example/track.gif',
    });

    const res = await POST(scanRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.image).toBeNull();
    expect(json.image).toBe(
      sanitizeProductImage(
        'http://evil.example/track.gif',
        'http://evil.example/track.gif',
        'http://evil.example/track.gif'
      )
    );
  });

  it('returns the URL only when it passes the openfoodfacts.org allowlist', async () => {
    const safeUrl = 'https://images.openfoodfacts.org/images/products/ok.jpg';
    mockOpenFoodFacts({
      product_name: 'Test Product',
      brands: 'TestBrand',
      ingredients_text: 'Ingredients',
      image_front_url: safeUrl,
    });

    const res = await POST(scanRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.image).toBe(safeUrl);
  });

  it('falls back to a later allowed image field when the first is rejected', async () => {
    const safeUrl = 'https://images.openfoodfacts.org/images/products/ok.jpg';
    mockOpenFoodFacts({
      product_name: 'Test Product',
      brands: 'TestBrand',
      ingredients_text: 'Ingredients',
      image_front_url: 'http://evil.example/track.gif',
      image_url: safeUrl,
    });

    const res = await POST(scanRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.image).toBe(safeUrl);
  });
});
