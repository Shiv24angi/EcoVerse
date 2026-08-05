/**
 * @jest-environment node
 */

import { POST } from '../route';
import User from '@/models/User';
import { checkAndRunMonthlyRollover } from '@/lib/monthly-cycle';

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
    checkAndRunMonthlyRollover: jest.fn(),
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

function authRequest() {
  return new Request('http://localhost/api/rewards/monthly-check', {
    method: 'POST',
    headers: {
      'x-user-email': 'test@example.com',
    },
  });
}
function mockFindOne(doc: unknown, leanDoc?: unknown) {
  return (User.findOne as jest.Mock).mockReturnValue({
    lean: jest.fn().mockReturnValue(leanDoc ?? doc),
  });
}

describe('POST /api/rewards/monthly-check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkAndRunMonthlyRollover as jest.Mock).mockResolvedValue(false);
  });

  it('returns 401 when x-user-email header is missing', async () => {
    const req = new Request('http://localhost/api/rewards/monthly-check', {
      method: 'POST',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 404 when the user does not exist', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const res = await POST(authRequest());

    expect(res.status).toBe(404);
    expect(checkAndRunMonthlyRollover).not.toHaveBeenCalled();
  });

  it('delegates to the monthly rollover instead of awarding directly', async () => {
    mockFindOne({ email: 'test@example.com' });
    (checkAndRunMonthlyRollover as jest.Mock).mockResolvedValue(true);

    const res = await POST(authRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.bonusAwarded).toBe(false);
    expect(checkAndRunMonthlyRollover).toHaveBeenCalledWith('test@example.com');
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reports the bonus when the rollover credited the archived month', async () => {
    (User.findOne as jest.Mock)
      .mockReturnValueOnce({
        lean: jest.fn().mockReturnValue({ email: 'test@example.com' }),
      })
      .mockReturnValueOnce({
        lean: jest.fn().mockReturnValue({
          email: 'test@example.com',
          confirmedPoints: 1100,
          unconfirmedPoints: 100,
          monthlyCarbonHistory: [
            {
              month: 0,
              year: 2026,
              carbonSpent: 15,
              bonusAwarded: true,
              bonusPoints: 1000,
            },
          ],
        }),
      });
    (checkAndRunMonthlyRollover as jest.Mock).mockResolvedValue(true);

    const res = await POST(authRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      bonusAwarded: true,
      bonus: { points: 1000 },
      newTotalPoints: 1200,
      confirmedPoints: 1100,
      unconfirmedPoints: 100,
    });
    expect(checkAndRunMonthlyRollover).toHaveBeenCalledWith('test@example.com');
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns bonusAwarded false when no rollover is due', async () => {
    mockFindOne({ email: 'test@example.com' });
    (checkAndRunMonthlyRollover as jest.Mock).mockResolvedValue(false);

    const res = await POST(authRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.bonusAwarded).toBe(false);
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
