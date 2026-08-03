/**
 * @jest-environment node
 */

import { POST } from '../route';
import User from '@/models/User';
import { confirmAgedPoints } from '@/lib/rewards-system';

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
    },
  };
});

jest.mock('@/lib/rewards-system', () => {
  const actual = jest.requireActual('@/lib/rewards-system');
  return {
    __esModule: true,
    confirmAgedPoints: jest.fn(),
    getUserPointsSummary: actual.getUserPointsSummary,
  };
});

function authRequest() {
  return new Request('http://localhost/api/rewards/confirm', {
    method: 'POST',
    headers: {
      'x-user-email': 'test@example.com',
    },
  });
}

describe('POST /api/rewards/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (confirmAgedPoints as jest.Mock).mockResolvedValue(0);
  });

  it('returns 401 when x-user-email header is missing', async () => {
    const req = new Request('http://localhost/api/rewards/confirm', {
      method: 'POST',
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(confirmAgedPoints).not.toHaveBeenCalled();
  });

  it('returns 404 when the user no longer exists', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue(null),
    });

    const res = await POST(authRequest());

    expect(res.status).toBe(404);
    expect(confirmAgedPoints).toHaveBeenCalledWith('test@example.com');
  });

  it('confirms aged points and returns the updated summary', async () => {
    (confirmAgedPoints as jest.Mock).mockResolvedValue(150);
    (User.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockReturnValue({
        email: 'test@example.com',
        confirmedPoints: 950,
        unconfirmedPoints: 50,
        rewardPoints: 1000,
        rewardTransactions: [],
      }),
    });

    const res = await POST(authRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pointsConfirmed).toBe(150);
    expect(json.pointsSummary).toEqual({
      confirmed: 950,
      unconfirmed: 50,
      total: 1000,
      pendingConfirmation: 0,
    });
    expect(json.confirmedPoints).toBe(950);
    expect(confirmAgedPoints).toHaveBeenCalledWith('test@example.com');
  });
});
