import {
  consolidateUserData,
  mergeAchievements,
  mergeChallenges,
  runMigration,
} from '../migrate-email-lowercase';
import User from '../../models/User';
import dbConnect from '../../lib/mongodb';

jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../models/User', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn(),
    syncIndexes: jest.fn().mockResolvedValue(true),
  },
}));

describe('Email Lowercase Migration Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeAchievements', () => {
    it('combines achievements deduplicating by id', () => {
      const set1 = [{ id: 'ach-1', name: 'First Scan', points: 10 }];
      const set2 = [
        { id: 'ach-1', name: 'First Scan', points: 10 },
        { id: 'ach-2', name: 'Eco Warrior', points: 50 },
      ];
      const merged = mergeAchievements(set1, set2);
      expect(merged).toHaveLength(2);
      expect(merged.map((a) => a.id)).toEqual(['ach-1', 'ach-2']);
    });
  });

  describe('mergeChallenges', () => {
    it('combines challenge records deduplicating by challengeId', () => {
      const set1 = [{ challengeId: 'c-100', pointsEarned: 20 }];
      const set2 = [
        { challengeId: 'c-100', pointsEarned: 20 },
        { challengeId: 'c-200', pointsEarned: 40 },
      ];
      const merged = mergeChallenges(set1, set2);
      expect(merged).toHaveLength(2);
      expect(merged.map((c) => c.challengeId)).toEqual(['c-100', 'c-200']);
    });
  });

  describe('consolidateUserData', () => {
    it('sums reward points and preserves complete reward transaction history', () => {
      const primary = {
        _id: 'user-1',
        email: 'user@example.com',
        monthlyCarbon: 10,
        totalScanned: 5,
        rewardPoints: 100,
        confirmedPoints: 80,
        unconfirmedPoints: 20,
        totalPointsEarned: 100,
        streakCount: 3,
        bestStreakCount: 5,
        level: 2,
        scans: [{ productName: 'Apple', carbonEstimate: 0.5 }],
        rewardTransactions: [
          {
            type: 'earned',
            points: 80,
            reason: 'scan',
            description: 'Scan item',
          },
        ],
        activeBadges: ['badge-1'],
      };

      const dup = {
        _id: 'user-2',
        email: 'User@Example.com',
        monthlyCarbon: 15,
        totalScanned: 3,
        rewardPoints: 50,
        confirmedPoints: 50,
        unconfirmedPoints: 0,
        totalPointsEarned: 50,
        streakCount: 6,
        bestStreakCount: 6,
        level: 3,
        scans: [{ productName: 'Banana', carbonEstimate: 0.3 }],
        rewardTransactions: [
          {
            type: 'earned',
            points: 50,
            reason: 'bonus',
            description: 'Monthly bonus',
          },
        ],
        activeBadges: ['badge-2'],
      };

      const consolidated = consolidateUserData(primary, [dup]);

      expect(consolidated.monthlyCarbon).toBe(25);
      expect(consolidated.totalScanned).toBe(8);
      expect(consolidated.rewardPoints).toBe(150);
      expect(consolidated.confirmedPoints).toBe(130);
      expect(consolidated.unconfirmedPoints).toBe(20);
      expect(consolidated.totalPointsEarned).toBe(150);
      expect(consolidated.streakCount).toBe(6);
      expect(consolidated.bestStreakCount).toBe(6);
      expect(consolidated.level).toBe(3);

      expect(consolidated.scans).toHaveLength(2);
      expect(consolidated.rewardTransactions).toHaveLength(2);
      expect(consolidated.rewardTransactions).toEqual([
        {
          type: 'earned',
          points: 80,
          reason: 'scan',
          description: 'Scan item',
        },
        {
          type: 'earned',
          points: 50,
          reason: 'bonus',
          description: 'Monthly bonus',
        },
      ]);
      expect(consolidated.activeBadges).toEqual(['badge-1', 'badge-2']);
    });
  });

  describe('runMigration', () => {
    it('normalizes single non-colliding emails and resolves collisions by consolidating records and deleting duplicates', async () => {
      const mockUsers = [
        {
          _id: 'user-id-1',
          email: 'SingleUser@Domain.Com',
          createdAt: new Date('2026-01-01'),
          toObject: function () {
            return { _id: this._id, email: this.email };
          },
        },
        {
          _id: 'user-id-2',
          email: 'DupUser@Domain.Com',
          createdAt: new Date('2026-01-01'),
          rewardPoints: 100,
          rewardTransactions: [{ type: 'earned', points: 100 }],
          toObject: function () {
            return {
              _id: this._id,
              email: this.email,
              rewardPoints: this.rewardPoints,
              rewardTransactions: this.rewardTransactions,
            };
          },
        },
        {
          _id: 'user-id-3',
          email: 'dupuser@domain.com',
          createdAt: new Date('2026-01-02'),
          rewardPoints: 50,
          rewardTransactions: [{ type: 'earned', points: 50 }],
          toObject: function () {
            return {
              _id: this._id,
              email: this.email,
              rewardPoints: this.rewardPoints,
              rewardTransactions: this.rewardTransactions,
            };
          },
        },
      ];

      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      await runMigration();

      expect(dbConnect).toHaveBeenCalled();

      // Single user update call
      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: 'user-id-1' },
        { $set: { email: 'singleuser@domain.com' } }
      );

      // Collision consolidation update call
      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: 'user-id-2' },
        {
          $set: expect.objectContaining({
            email: 'dupuser@domain.com',
            rewardPoints: 150,
            rewardTransactions: [
              { type: 'earned', points: 100 },
              { type: 'earned', points: 50 },
            ],
          }),
        }
      );

      // Duplicate user delete call
      expect(User.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ['user-id-3'] },
      });

      expect(User.syncIndexes).toHaveBeenCalled();
    });
  });
});
