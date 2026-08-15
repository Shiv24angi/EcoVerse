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

    it('should reject duplicate purchase for one-time items in atomic filter failure', async () => {
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

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
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
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          'purchasedItems.itemId': { $ne: 'eco_hero_badge' },
        }),
        expect.any(Object),
        { new: true }
      );
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

  /**
   * Double-spending / race-condition regression tests (Issue #460).
   *
   * The redemption endpoint is safe against concurrent requests because the
   * actual mutation is a *guarded* atomic `findOneAndUpdate`:
   *   - `confirmedPoints: { $gte: cost }` prevents the balance from being spent
   *     twice, and
   *   - `purchasedItems.itemId: { $ne }` (for one-time items) prevents the same
   *     item from being granted twice.
   * The read-before-write is used only for friendly validation messages; the
   * atomic update is the source of truth. When it returns `null`, a concurrent
   * request already won the race and the endpoint must fail closed (409).
   */
  describe('POST /api/rewards (concurrency / double-spend protection)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fail closed with 409 when a concurrent request wins the atomic race', async () => {
      // Pre-read succeeds: enough points, item not yet purchased.
      const mockUser = {
        email: 'test@example.com',
        confirmedPoints: 500,
        unconfirmedPoints: 0,
        rewardPoints: 500,
        purchasedItems: [],
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // But the guarded atomic update returns null because a concurrent request
      // already redeemed this one-time item (loser of the race).
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost/api/rewards', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: 'eco_hero_badge' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Transaction failed');
    });

    it('should not let concurrent redemptions spend the same points twice (tight balance)', async () => {
      // Balance is exactly enough for a single purchase. Two concurrent
      // redemptions for different items must not both succeed.
      const initialUser = {
        email: 'test@example.com',
        confirmedPoints: 500,
        unconfirmedPoints: 0,
        rewardPoints: 500,
        purchasedItems: [],
      };

      // First redemption wins and drains the balance. The second redemption
      // reads a *stale* pre-read document that still shows a full balance
      // (simulating the read-before-write window), so validation passes — but
      // the guarded atomic update fails because the real balance was already
      // spent, and the endpoint must fail closed with 409.
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(initialUser)
        .mockResolvedValueOnce({
          ...initialUser,
          confirmedPoints: 1000,
          unconfirmedPoints: 0,
          rewardPoints: 1000,
        });

      (User.findOneAndUpdate as jest.Mock)
        .mockResolvedValueOnce({
          ...initialUser,
          confirmedPoints: 0,
          rewardPoints: 0,
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
        })
        .mockResolvedValueOnce(null);

      const first = await POST(
        new Request('http://localhost/api/rewards', {
          method: 'POST',
          headers: {
            'x-user-email': 'test@example.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId: 'eco_hero_badge' }),
        })
      );
      expect(first.status).toBe(200);

      // The atomic `confirmedPoints: { $gte: 1000 }` guard rejects the
      // concurrent redemption even though the stale pre-read passed.
      const second = await POST(
        new Request('http://localhost/api/rewards', {
          method: 'POST',
          headers: {
            'x-user-email': 'test@example.com',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemId: 'carbon_warrior_badge' }),
        })
      );
      expect(second.status).toBe(409);
      expect((await second.json()).error).toBe('Transaction failed');
    });

    it('should reject an insufficient balance before any mutation', async () => {
      const mockUser = {
        email: 'test@example.com',
        confirmedPoints: 100,
        unconfirmedPoints: 0,
        rewardPoints: 100,
        purchasedItems: [],
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
      expect(data.error).toBe('Insufficient confirmed points');
      // No mutation attempted when the balance is too low.
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });
});
