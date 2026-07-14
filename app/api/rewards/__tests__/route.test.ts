/**
 * @jest-environment node
 */

import { GET, POST } from '../route';
import User from '@/models/User';

jest.mock('@/lib/mongodb', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@/models/User', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  };
});

/**
 * Test suite for the Rewards API endpoints (GET and POST /api/rewards).
 * Verifies that repeatable reward items are purchaseable multiple times
 * while one-time unlocks remain protected against duplicates.
 */
describe('Rewards API Route', () => {
  /**
   * Tests for retrieving available shop rewards (GET /api/rewards).
   */
  describe('GET /api/rewards', () => {
    it('should return available shop items including repeatable ones even if already purchased', async () => {
      const mockUser = {
        email: 'test@example.com',
        totalPointsEarned: 1000,
        confirmedPoints: 800,
        unconfirmedPoints: 200,
        rewardPoints: 800,
        purchasedItems: [
          {
            itemId: 'streak_protector',
            name: 'Streak Protector',
            cost: 200,
            category: 'feature',
            purchasedAt: new Date(),
            active: true,
          },
          {
            itemId: 'eco_hero_badge',
            name: 'Eco Hero Badge',
            cost: 500,
            category: 'badge',
            purchasedAt: new Date(),
            active: true,
          },
        ],
        rewardTransactions: [],
        achievements: [],
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const request = new Request('http://localhost/api/rewards', {
        headers: {
          'x-user-email': 'test@example.com',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();

      // Eco Hero Badge is a one-time purchase, so it should NOT be in availableShopItems
      const availableIds = data.availableShopItems.map(
        (item: { id: string }) => item.id
      );
      expect(availableIds).not.toContain('eco_hero_badge');

      // Streak Protector is repeatable, so it SHOULD be in availableShopItems
      expect(availableIds).toContain('streak_protector');
      expect(availableIds).toContain('double_points');
    });
  });

  /**
   * Tests for redeeming points for shop items (POST /api/rewards/redeem).
   */
  describe('POST /api/rewards (redeem)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should allow purchasing a repeatable item multiple times', async () => {
      const mockUser = {
        email: 'test@example.com',
        confirmedPoints: 1000,
        unconfirmedPoints: 0,
        rewardPoints: 1000,
        purchasedItems: [
          {
            itemId: 'streak_protector',
            name: 'Streak Protector',
            cost: 200,
            category: 'feature',
            purchasedAt: new Date(),
            active: true,
          },
        ],
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockUser,
        confirmedPoints: 800,
        rewardPoints: 800,
        streakProtectors: 2,
        purchasedItems: [
          ...mockUser.purchasedItems,
          {
            itemId: 'streak_protector',
            name: 'Streak Protector',
            cost: 200,
            category: 'feature',
            purchasedAt: new Date(),
            active: true,
          },
        ],
      });

      const request = new Request('http://localhost/api/rewards', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: 'streak_protector' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Check atomic update query call
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          confirmedPoints: { $gte: 200 },
        }),
        expect.any(Object),
        { new: true }
      );

      // The findOneAndUpdate call should NOT include 'purchasedItems.itemId': { $ne: 'streak_protector' }
      const calls = (User.findOneAndUpdate as jest.Mock).mock.calls;
      const filterArg = calls[0][0];
      expect(filterArg['purchasedItems.itemId']).toBeUndefined();

      // Verify actual update payload operations
      const updateArg = calls[0][1];

      // 1. Points Deduction
      expect(updateArg.$inc.confirmedPoints).toBe(-200);
      expect(updateArg.$inc.rewardPoints).toBe(-200);

      // 2. Consumable Counter Increment
      expect(updateArg.$inc.streakProtectors).toBe(1);

      // 3. Purchase History Entry and Transaction History Entry
      expect(updateArg.$push.purchasedItems).toMatchObject({
        itemId: 'streak_protector',
        name: 'Streak Protector',
        cost: 200,
        category: 'feature',
        active: true,
      });
      expect(updateArg.$push.rewardTransactions).toMatchObject({
        type: 'redeemed',
        points: 200,
        pointsType: 'confirmed',
        reason: 'item_purchase',
        description: 'Purchased Streak Protector',
      });
    });

    it('should reject duplicate purchase for one-time items in initial validation', async () => {
      const mockUser = {
        email: 'test@example.com',
        confirmedPoints: 1000,
        unconfirmedPoints: 0,
        rewardPoints: 1000,
        purchasedItems: [
          {
            itemId: 'eco_hero_badge',
            name: 'Eco Hero Badge',
            cost: 500,
            category: 'badge',
            purchasedAt: new Date(),
            active: true,
          },
        ],
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const request = new Request('http://localhost/api/rewards', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: 'eco_hero_badge' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Item already purchased');
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should query with $ne itemId filter when purchasing a one-time item', async () => {
      const mockUser = {
        email: 'test@example.com',
        confirmedPoints: 1000,
        unconfirmedPoints: 0,
        rewardPoints: 1000,
        purchasedItems: [],
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockUser,
        confirmedPoints: 500,
        rewardPoints: 500,
        purchasedItems: [
          {
            itemId: 'eco_hero_badge',
            name: 'Eco Hero Badge',
            cost: 500,
            category: 'badge',
            purchasedAt: new Date(),
            active: true,
          },
        ],
      });

      const request = new Request('http://localhost/api/rewards', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: 'eco_hero_badge' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // The findOneAndUpdate call should include 'purchasedItems.itemId': { $ne: 'eco_hero_badge' }
      const calls = (User.findOneAndUpdate as jest.Mock).mock.calls;
      const filterArg = calls[0][0];
      expect(filterArg['purchasedItems.itemId']).toEqual({
        $ne: 'eco_hero_badge',
      });
    });
  });
});
