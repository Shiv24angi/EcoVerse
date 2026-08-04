/**
 * @jest-environment node
 */

import { DELETE } from '@/app/api/user/route';
import User from '@/models/User';
import { deleteFirebaseUser } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/auth', () => ({
  __esModule: true,
  verifyCookieAuth: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/firebase-admin', () => ({
  __esModule: true,
  deleteFirebaseUser: jest.fn().mockResolvedValue(true),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    delete: jest.fn(),
  }),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

describe('DELETE /api/user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when the request is not authenticated', async () => {
    const { verifyCookieAuth } = jest.requireMock('@/lib/auth') as {
      verifyCookieAuth: jest.Mock;
    };
    verifyCookieAuth.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const req = new Request('http://localhost/api/user', {
      method: 'DELETE',
      headers: { 'x-user-email': 'test@example.com' },
    });

    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: 'Unauthorized' });
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it('deletes the MongoDB user record, Firebase auth, cookies, and returns success', async () => {
    const mockUser = {
      email: 'test@example.com',
      firebaseUid: 'firebase-uid',
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (User.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

    // Explicitly setup cookie mock for this test as requested by CodeRabbit
    const cookieStore = { delete: jest.fn() };
    (cookies as jest.Mock).mockResolvedValueOnce(cookieStore);

    const req = new Request('http://localhost/api/user', {
      method: 'DELETE',
      headers: {
        'x-user-email': 'test@example.com',
      },
    });

    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      deleted: true,
      firebaseDeleted: true,
    });

    // Assert all required cleanup effects
    expect(User.deleteOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(deleteFirebaseUser).toHaveBeenCalledWith('firebase-uid');
    expect(cookieStore.delete).toHaveBeenCalledWith('auth_token');
  });

  it('handles Firebase deletion failures gracefully (retryable-failure outcome)', async () => {
    const mockUser = {
      email: 'test@example.com',
      firebaseUid: 'firebase-uid',
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (User.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

    // Mock Firebase throwing an error
    (deleteFirebaseUser as jest.Mock).mockRejectedValueOnce(
      new Error('Firebase service unavailable')
    );

    const req = new Request('http://localhost/api/user', {
      method: 'DELETE',
      headers: {
        'x-user-email': 'test@example.com',
      },
    });

    const res = await DELETE(req);
    const json = await res.json();

    // Assert that the side-effects were still attempted
    expect(User.deleteOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(deleteFirebaseUser).toHaveBeenCalledWith('firebase-uid');

    // NOTE: This assumes your route returns a 500 status code on Firebase failure.
    // If your route is designed to return something else (e.g., 200 with firebaseDeleted: false, or a 400),
    // simply change the expectation below to match your actual route.ts behavior.
    expect(res.status).toBe(500);
    expect(json).toHaveProperty('error');
  });
});
