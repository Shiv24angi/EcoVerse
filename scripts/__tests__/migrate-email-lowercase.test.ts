import {
  consolidateUserData,
  mergeAchievements,
  mergeChallenges,
  mergeMonthlyStats,
  runMigration,
} from '../migrate-email-lowercase';
import User from '../../models/User';
import dbConnect from '../../lib/mongodb';

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  abortTransaction: jest.fn().mockResolvedValue(undefined),
  endSession: jest.fn().mockResolvedValue(undefined),
};

const createQueryMock = (data: any) => {
  const promise = Promise.resolve(data);
  return Object.assign(promise, {
    session: jest.fn().mockImplementation(() => promise),
  });
};

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
    db: {
      startSession: jest.fn(),
    },
  },
}));

describe('Email Lowercase Migration Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (User.syncIndexes as jest.Mock).mockResolvedValue(true);
    ((User as any).db.startSession as jest.Mock).mockResolvedValue(mockSession);
    (User.find as jest.Mock).mockImplementation(() => createQueryMock([]));
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

  describe('mergeMonthlyStats & consolidateUserData', () => {
    it('merges monthlyStats across overlapping and distinct month keys', () => {
      const primaryStats = {
        '2026-01': { carbon: 10, scans: 2, points: 20 },
        '2026-02': { carbon: 5, scans: 1, points: 10 },
      };
      const dupStats = {
        '2026-01': { carbon: 15, scans: 3, points: 30 },
        '2026-03': { carbon: 8, scans: 2, points: 15 },
      };

      const merged = mergeMonthlyStats(primaryStats, [dupStats]);

      expect(merged).toEqual({
        '2026-01': { carbon: 25, scans: 5, points: 50 },
        '2026-02': { carbon: 5, scans: 1, points: 10 },
        '2026-03': { carbon: 8, scans: 2, points: 15 },
      });
    });

    it('sums reward points and preserves complete reward transaction history and monthlyStats', () => {
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
        monthlyStats: {
          '2026-01': { carbon: 10, scans: 2, points: 20 },
        },
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
        monthlyStats: {
          '2026-01': { carbon: 15, scans: 3, points: 30 },
          '2026-02': { carbon: 5, scans: 1, points: 10 },
        },
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
      expect(consolidated.activeBadges).toEqual(['badge-1', 'badge-2']);
      expect(consolidated.monthlyStats).toEqual({
        '2026-01': { carbon: 25, scans: 5, points: 50 },
        '2026-02': { carbon: 5, scans: 1, points: 10 },
      });
    });

    it('preserves hasAdvancedAnalytics with logical OR when true only on a duplicate', () => {
      const primary = {
        _id: 'user-1',
        email: 'user@example.com',
        hasAdvancedAnalytics: false,
      };
      const dup = {
        _id: 'user-2',
        email: 'User@Example.com',
        hasAdvancedAnalytics: true,
      };

      const consolidated = consolidateUserData(primary, [dup]);

      expect(consolidated.hasAdvancedAnalytics).toBe(true);
    });

    it('merges password, firebaseUid, and authProvider when primary lacks them', () => {
      const primary = {
        _id: 'user-1',
        email: 'user@example.com',
        password: null,
        firebaseUid: undefined,
        authProvider: 'email',
      };
      const dup = {
        _id: 'user-2',
        email: 'User@Example.com',
        password: 'hashed_password_123',
        firebaseUid: 'fb_uid_456',
        authProvider: 'google',
      };

      const consolidated = consolidateUserData(primary, [dup]);

      expect(consolidated.password).toBe('hashed_password_123');
      expect(consolidated.firebaseUid).toBe('fb_uid_456');
      expect(consolidated.authProvider).toBe('google');
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
        {
          _id: 'user-id-3',
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
      ];

      (User.find as jest.Mock).mockImplementation((filter?: any) => {
        if (filter && filter._id && filter._id.$in) {
          const ids: string[] = filter._id.$in;
          const matching = mockUsers.filter((u) => ids.includes(u._id));
          return createQueryMock(matching);
        }
        return createQueryMock(mockUsers);
      });

      await runMigration();

      expect(dbConnect).toHaveBeenCalled();

      // Single user update call
      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: 'user-id-1' },
        { $set: { email: 'singleuser@domain.com' } }
      );

      // Collision consolidation update call - prefers existing canonical email user-id-2
      const updateCall = (User.updateOne as jest.Mock).mock.calls.find(
        (call) => call[0]._id === 'user-id-2'
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1].$set._id).toBeUndefined();
      expect(updateCall[1].$set.email).toBe('dupuser@domain.com');
      expect(updateCall[1].$set.rewardPoints).toBe(150);
      expect(updateCall[2]).toEqual({ session: mockSession });

      // Duplicate user delete call
      expect(User.deleteMany).toHaveBeenCalledWith(
        {
          _id: { $in: ['user-id-3'] },
        },
        { session: mockSession }
      );

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(User.syncIndexes).toHaveBeenCalled();
    });

    it('skips collision consolidation when conflicting credentials exist', async () => {
      const mockUsers = [
        {
          _id: 'user-id-2',
          email: 'dupuser@domain.com',
          password: 'password_hash_1',
          createdAt: new Date('2026-01-02'),
          toObject: function () {
            return {
              _id: this._id,
              email: this.email,
              password: this.password,
            };
          },
        },
        {
          _id: 'user-id-3',
          email: 'DupUser@Domain.Com',
          password: 'password_hash_2',
          createdAt: new Date('2026-01-01'),
          toObject: function () {
            return {
              _id: this._id,
              email: this.email,
              password: this.password,
            };
          },
        },
      ];

      (User.find as jest.Mock).mockImplementation((filter?: any) => {
        if (filter && filter._id && filter._id.$in) {
          const ids: string[] = filter._id.$in;
          const matching = mockUsers.filter((u) => ids.includes(u._id));
          return createQueryMock(matching);
        }
        return createQueryMock(mockUsers);
      });

      await runMigration();

      expect(User.updateOne).not.toHaveBeenCalled();
      expect(User.deleteMany).not.toHaveBeenCalled();
    });

    it('fails collision resolution and performs no collision writes when session initialization fails', async () => {
      const mockUsers = [
        {
          _id: 'user-id-2',
          email: 'dupuser@domain.com',
          createdAt: new Date('2026-01-02'),
          toObject: function () {
            return { _id: this._id, email: this.email };
          },
        },
        {
          _id: 'user-id-3',
          email: 'DupUser@Domain.Com',
          createdAt: new Date('2026-01-01'),
          toObject: function () {
            return { _id: this._id, email: this.email };
          },
        },
      ];

      (User.find as jest.Mock).mockImplementation(() =>
        createQueryMock(mockUsers)
      );
      ((User as any).db.startSession as jest.Mock).mockRejectedValue(
        new Error('Session error')
      );

      await expect(runMigration()).rejects.toThrow('Session error');

      expect(User.updateOne).not.toHaveBeenCalled();
      expect(User.deleteMany).not.toHaveBeenCalled();
    });

    it('skips invalid/whitespace-only emails and logs warning', async () => {
      const mockUsers = [
        {
          _id: 'user-invalid-1',
          email: '   ',
          toObject: function () {
            return { _id: this._id, email: this.email };
          },
        },
      ];

      (User.find as jest.Mock).mockImplementation(() =>
        createQueryMock(mockUsers)
      );

      await runMigration();

      expect(User.updateOne).not.toHaveBeenCalled();
      expect(User.deleteMany).not.toHaveBeenCalled();
      expect(User.syncIndexes).toHaveBeenCalled();
    });

    it('rethrows index synchronization errors', async () => {
      (User.find as jest.Mock).mockImplementation(() => createQueryMock([]));
      (User.syncIndexes as jest.Mock).mockRejectedValue(
        new Error('Index specs conflict')
      );

      await expect(runMigration()).rejects.toThrow('Index specs conflict');
    });
  });
});
