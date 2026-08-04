/**
 * @jest-environment node
 */

import { DELETE } from '../route';
import User from '@/models/User';

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

  it('deletes the MongoDB user record and returns success', async () => {
    const mockUser = {
      email: 'test@example.com',
      firebaseUid: 'firebase-uid',
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (User.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

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
    expect(User.deleteOne).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});
