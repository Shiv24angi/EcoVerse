/**
 * @jest-environment node
 *
 * Session route must bind the session to the stable database id, not the
 * mutable email (issue #387). verifyToken yields { email, userId }; the route
 * should load by userId and reject when the document's email no longer matches
 * the token email.
 */

import { GET } from '../route';
import User from '@/models/User';

const cookieStore: { get: jest.Mock; set: jest.Mock; delete: jest.Mock } = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => cookieStore),
}));

const verifyToken = jest.fn();
const signToken = jest.fn();
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  verifyToken: (...a: unknown[]) => verifyToken(...a),
  signToken: (...a: unknown[]) => signToken(...a),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

// mongoose is only used for isValidObjectId; stub the one helper we need.
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { isValidObjectId: (id: unknown) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) },
  isValidObjectId: (id: unknown) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id),
}));

function userDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: '64b7f1c2a3e4f5a6b7c8d9e0',
    email: 'user@example.com',
    name: 'Test User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    monthlyCarbon: 0,
    totalScanned: 0,
    avatarId: 'avatar-1',
    avatarCustomization: {},
    ...overrides,
  };
}

function setToken(token: string | undefined) {
  cookieStore.get.mockReturnValue(token ? { value: token } : undefined);
}

describe('GET /api/auth/session — bind session to userId (#387)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyToken.mockReset();
    signToken.mockReset();
    User.findById.mockReset();
    User.findOne.mockReset();
    signToken.mockResolvedValue('new-token');
  });

  it('returns 401 when no auth_token cookie is present', async () => {
    setToken(undefined);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('looks up the user by token userId and returns the session when emails match', async () => {
    setToken('valid.jwt');
    verifyToken.mockResolvedValue({
      email: 'user@example.com',
      userId: '64b7f1c2a3e4f5a6b7c8d9e0',
    });
    User.findById.mockResolvedValue(userDoc());

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(User.findById).toHaveBeenCalledWith('64b7f1c2a3e4f5a6b7c8d9e0');
    expect(User.findOne).not.toHaveBeenCalled();
    expect(body.user.email).toBe('user@example.com');
  });

  it('rejects the session when the userId document email no longer matches the token email', async () => {
    setToken('valid.jwt');
    verifyToken.mockResolvedValue({
      email: 'old@example.com',
      userId: '64b7f1c2a3e4f5a6b7c8d9e0',
    });
    // Same userId now points to a different account/email mapping.
    User.findById.mockResolvedValue(userDoc({ email: 'new@example.com' }));

    const res = await GET();

    expect(res.status).toBe(401);
    expect(cookieStore.delete).toHaveBeenCalledWith('auth_token');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('does not findById for an invalid userId and only falls back to email lookup', async () => {
    setToken('valid.jwt');
    verifyToken.mockResolvedValue({
      email: 'user@example.com',
      userId: 'not-an-objectid',
    });
    User.findOne.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    expect(User.findById).not.toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('falls back to email lookup for legacy tokens without userId', async () => {
    setToken('valid.jwt');
    verifyToken.mockResolvedValue({ email: 'user@example.com' });
    User.findOne.mockResolvedValue(userDoc());

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(body.user.email).toBe('user@example.com');
  });

  it('deletes the cookie and returns 401 when no user matches', async () => {
    setToken('valid.jwt');
    verifyToken.mockResolvedValue({
      email: 'ghost@example.com',
      userId: '64b7f1c2a3e4f5a6b7c8d9e0',
    });
    User.findById.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    expect(cookieStore.delete).toHaveBeenCalledWith('auth_token');
  });

  it('refreshes the sliding cookie with the user document email (not the token email)', async () => {
    setToken('valid.jwt');
    // Token close to expiry: exp within 3 days.
    const now = Math.floor(Date.now() / 1000);
    verifyToken.mockResolvedValue({
      email: 'user@example.com',
      userId: '64b7f1c2a3e4f5a6b7c8d9e0',
      exp: now + 60_000, // < 3 days
    });
    User.findById.mockResolvedValue(userDoc({ email: 'User@Example.com' }));

    await GET();

    expect(signToken).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'User@Example.com',
        userId: '64b7f1c2a3e4f5a6b7c8d9e0',
      })
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      'auth_token',
      'new-token',
      expect.objectContaining({ httpOnly: true, path: '/' })
    );
  });
});
