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

jest.mock('@/models/User', () => {
  return {
    __esModule: true,
    default: {
      aggregate: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
    },
  };
});

function matchesFilter(
  filter: Record<string, unknown>,
  doc: Record<string, unknown>
): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') {
      const clauses = condition as Record<string, unknown>[];
      return clauses.some((clause) => matchesFilter(clause, doc));
    }

    if (
      condition &&
      typeof condition === 'object' &&
      !(condition instanceof Date)
    ) {
      const ops = condition as Record<string, unknown>;
      return Object.entries(ops).every(([op, val]) => {
        const docVal = doc[key] as number | string;
        switch (op) {
          case '$gt':
            return docVal > (val as number | string);
          case '$lt':
            return docVal < (val as number | string);
          default:
            throw new Error(`Unsupported operator ${op} in test matcher`);
        }
      });
    }

    return doc[key] === condition;
  });
}

const syntheticUsers = [
  { _id: '5', totalPointsEarned: 300, level: 5, totalScanned: 50 },
  { _id: '1', totalPointsEarned: 200, level: 3, totalScanned: 20 },
  { _id: '2', totalPointsEarned: 200, level: 3, totalScanned: 20 },
  { _id: '3', totalPointsEarned: 200, level: 3, totalScanned: 20 },
  { _id: '4', totalPointsEarned: 100, level: 1, totalScanned: 5 },
];

function setupUserMocks() {
  (User.aggregate as jest.Mock).mockReturnValue({
    allowDiskUse: jest.fn().mockResolvedValue([
      { totalUsers: syntheticUsers.length, totalPoints: 1000, avgLevel: 2.4 },
    ]),
  });

  (User.findById as jest.Mock).mockImplementation((id: string) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest
      .fn()
      .mockResolvedValue(
        syntheticUsers.find((u) => u._id === id) ?? null
      ),
  }));

  (User.countDocuments as jest.Mock).mockImplementation(
    (filter: Record<string, unknown>) =>
      Promise.resolve(
        syntheticUsers.filter((u) => matchesFilter(filter, u)).length
      )
  );

  const sorted = [...syntheticUsers].sort((a, b) => {
    if (a.totalPointsEarned !== b.totalPointsEarned)
      return b.totalPointsEarned - a.totalPointsEarned;
    if (a.level !== b.level) return b.level - a.level;
    if (a.totalScanned !== b.totalScanned)
      return b.totalScanned - a.totalScanned;
    return b._id.localeCompare(a._id);
  });

  (User.find as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    allowDiskUse: jest.fn().mockResolvedValue(sorted),
  });
}

describe('GET /api/leaderboard - currentUserRank tie-break (issue #275)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUserMocks();
  });

  it('matches the user actual position in the leaderboard when fully tied', async () => {
    
    const request = new Request(
      'http://localhost/api/leaderboard?userId=3'
    );

    const response = await GET(request as unknown as never);
    const data = await response.json();

    expect(data.currentUserRank).toBe(2);
  });

  it('ranks each tied user consistently with their position in the sorted list', async () => {
    const expectedRanks: Record<string, number> = {
      '5': 1,
      '3': 2,
      '2': 3,
      '1': 4,
      '4': 5,
    };

    for (const [userId, expectedRank] of Object.entries(expectedRanks)) {
      const request = new Request(
        `http://localhost/api/leaderboard?userId=${userId}`
      );
      const response = await GET(request as unknown as never);
      const data = await response.json();
      expect(data.currentUserRank).toBe(expectedRank);
    }
  });
});