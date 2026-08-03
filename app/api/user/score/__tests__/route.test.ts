/**
 * @jest-environment node
 */

import { POST, PATCH, GET } from '../route';
import User from '@/models/User';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';

jest.mock('@/lib/mongodb', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@/lib/monthly-cycle', () => {
  return {
    __esModule: true,
    checkAndRunMonthlyRollover: jest.fn().mockResolvedValue(undefined),
  };
});

interface MockQuery<T> extends Promise<T> {
  lean: jest.Mock<Promise<T>, []>;
}

function createMockQuery<T>(val: T): MockQuery<T> {
  const p = Promise.resolve(val) as MockQuery<T>;
  p.lean = jest.fn().mockResolvedValue(val);
  return p;
}

jest.mock('@/models/User', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn().mockImplementation(() => createMockQuery(null)),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    },
  };
});

function authRequest() {
  return new Request('http://localhost/api/user/score', {
    headers: {
      'x-user-email': 'test@example.com',
    },
  });
}

const mockUser = {
  email: 'test@example.com',
  totalPointsEarned: 1200,
  monthlyCarbon: 25,
  monthlyCarbonGoal: 40,
  totalScanned: 12,
  streakCount: 3,
  bestStreakCount: 5,
  scans: [],
  rewardPoints: 800,
  level: 2,
  rewardTransactions: [],
  achievements: [],
  purchasedItems: [],
  activeBadges: [],
  monthlyBonusesEarned: 0,
};

describe('User Score API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/score', () => {
    it('should return 401 if x-user-email header is missing', async () => {
      const req = new Request('http://localhost/api/user/score');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it('is side-effect free: never runs the monthly rollover (Issue #421)', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockReturnValue(mockUser),
      });

      const res = await GET(authRequest());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.rewards).toHaveProperty('totalPointsEarned', 1200);
      expect(checkAndRunMonthlyRollover).not.toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/user/score', () => {
    it('should return 401 if x-user-email header is missing', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 for malformed JSON request body', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: '{',
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ error: 'Invalid JSON payload' });
    });

    it('should return 400 for invalid monthlyCarbonGoal values', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ monthlyCarbonGoal: -10 }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error:
          'monthlyCarbonGoal must be a positive number (kg CO2), or null to clear it',
      });
    });

    it('should update monthlyCarbonGoal successfully with valid number', async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
        monthlyCarbonGoal: 50,
      });

      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ monthlyCarbonGoal: 50 }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ monthlyCarbonGoal: 50 });
    });
  });

  describe('POST /api/user/score', () => {
    it('should return 400 for malformed JSON request body', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: '{',
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ error: 'Invalid JSON payload' });
    });

    it('should reject a duplicate manual entry submitted within the dedup window', async () => {
      const mockUser = {
        email: 'test@example.com',
        totalScanned: 3,
        scans: [
          {
            productName: 'Reusable Water Bottle',
            carbonEstimate: 2.5,
            category: 'Manual Entry',
            confidence: 'medium',
            barcode: 'MANUAL-1700000000000',
            date: new Date(),
            source: 'Manual Entry',
          },
        ],
      };

      (User.findOne as jest.Mock).mockImplementation(() =>
        createMockQuery(mockUser)
      );

      const request = new Request('http://localhost/api/user/score', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: 'Reusable Water Bottle',
          carbonEstimate: 2.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe(
        'This activity was already submitted a moment ago'
      );
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should reject a duplicate entry detected during the CAS retry loop', async () => {
      const initialMockUser = {
        email: 'test@example.com',
        totalScanned: 0,
        lastScanDate: null,
        streakCount: 0,
        bestStreakCount: 0,
        streakProtectors: 0,
        level: 1,
        scans: [],
      };

      const mockUserWithScan = {
        ...initialMockUser,
        scans: [
          {
            productName: 'Reusable Water Bottle',
            carbonEstimate: 2.5,
            category: 'Manual Entry',
            confidence: 'medium',
            barcode: 'MANUAL-1700000000000',
            date: new Date(),
            source: 'Manual Entry',
          },
        ],
      };

      let findOneAttemptCount = 0;
      (User.findOne as jest.Mock).mockImplementation(
        (filter: { email: string; unconfirmedPoints?: unknown }) => {
          if (filter.unconfirmedPoints !== undefined) {
            return createMockQuery(null);
          }
          findOneAttemptCount++;
          if (findOneAttemptCount === 1) {
            return createMockQuery(initialMockUser);
          }
          return createMockQuery(mockUserWithScan);
        }
      );

      let casUpdateCalls = 0;
      (User.findOneAndUpdate as jest.Mock).mockImplementation(
        (filter: { lastScanDate?: unknown }) => {
          if (filter.lastScanDate !== undefined) {
            casUpdateCalls++;
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }
      );

      const request = new Request('http://localhost/api/user/score', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: 'Reusable Water Bottle',
          carbonEstimate: 2.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe(
        'This activity was already submitted a moment ago'
      );
      expect(casUpdateCalls).toBe(1);
    });

    it('should allow the entry when no matching scan exists yet', async () => {
      const mockUser = {
        email: 'test@example.com',
        totalScanned: 0,
        totalPointsEarned: 0,
        lastScanDate: null,
        streakCount: 0,
        bestStreakCount: 0,
        streakProtectors: 0,
        level: 1,
        scans: [],
      };

      (User.findOne as jest.Mock).mockImplementation(() =>
        createMockQuery(mockUser)
      );
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockUser,
        monthlyCarbon: 2.5,
        totalScanned: 1,
        streakCount: 1,
        bestStreakCount: 1,
        toObject: () => mockUser,
      });

      const request = new Request('http://localhost/api/user/score', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: 'Reusable Water Bottle',
          carbonEstimate: 2.5,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(User.findOneAndUpdate).toHaveBeenCalled();
    });
  });
});
