/**
 * @jest-environment node
 */

import { GET } from '../route';
import { verifyCookieAuth } from '@/lib/auth';
import User from '@/models/User';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/auth', () => ({
  __esModule: true,
  verifyCookieAuth: jest.fn(),
}));

jest.mock('@/lib/rewards-system', () => ({
  getUserPointsSummary: jest.fn(() => ({
    total: 0,
    confirmed: 0,
    unconfirmed: 0,
  })),
  confirmPendingPoints: jest.fn(() => ({
    confirmedPoints: 0,
    confirmedTransactions: [],
  })),
  POINT_CONFIRMATION: { CONFIRMATION_DELAY_HOURS: 24 },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

const OriginalEnv = process.env.NODE_ENV;

function makeReq(email: string, cookie?: string) {
  const url = `http://localhost/api/debug/points?email=${encodeURIComponent(email)}`;
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new Request(url, { headers });
}

describe('GET /api/debug/points (#436 — auth required to query user data)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    if (OriginalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = OriginalEnv;
    }
  });

  it('is disabled in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await GET(makeReq('a@b.com'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when no email is provided', async () => {
    process.env.NODE_ENV = 'development';
    const res = await GET(new Request('http://localhost/api/debug/points'));
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests with 401 (no enumeration)', async () => {
    process.env.NODE_ENV = 'development';
    (verifyCookieAuth as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const res = await GET(makeReq('victim@example.com'));

    expect(res.status).toBe(401);
    expect(verifyCookieAuth).toHaveBeenCalledWith(
      expect.any(Request),
      'victim@example.com'
    );
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('rejects a caller whose auth token is for a different email (401)', async () => {
    process.env.NODE_ENV = 'development';
    (verifyCookieAuth as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const res = await GET(
      makeReq('victim@example.com', 'auth_token=attacker-token')
    );

    expect(res.status).toBe(401);
    expect(verifyCookieAuth).toHaveBeenCalledWith(
      expect.any(Request),
      'victim@example.com'
    );
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('returns the debug payload for the authenticated, matching user', async () => {
    process.env.NODE_ENV = 'development';
    (verifyCookieAuth as jest.Mock).mockResolvedValue(null);
    (User.findOne as jest.Mock).mockResolvedValue({
      confirmedPoints: 10,
      unconfirmedPoints: 5,
      rewardPoints: 15,
      totalPointsEarned: 20,
      rewardTransactions: [],
    });

    const res = await GET(makeReq('me@example.com', 'auth_token=my-token'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userEmail).toBe('me@example.com');
    expect(body.rawData.confirmedPoints).toBe(10);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'me@example.com' });
  });
});
