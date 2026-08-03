/**
 * @jest-environment node
 */

import { POST } from '../route';
import User from '@/models/User';
import { setAuthCookie } from '@/lib/auth';

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

jest.mock('@/lib/auth', () => {
  return {
    __esModule: true,
    setAuthCookie: jest.fn().mockResolvedValue(undefined),
  };
});

const mockUserDoc = {
  _id: '64b000000000000000000001',
  name: 'Jane Doe',
  email: 'jane@example.com',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  joinedAt: '2026-01-01T00:00:00.000Z',
  monthlyCarbon: 12.5,
  totalScanned: 7,
  avatarId: 'avatar-1',
  avatarCustomization: {},
};

function googleRequest(body: unknown) {
  return new Request('http://localhost/api/auth/google', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for malformed JSON', async () => {
    const req = new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid JSON payload' });
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(
      googleRequest({ name: 'Jane', email: 'jane@example.com' })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: 'Missing fields' });
  });

  it('links firebaseUid/authProvider/name via $set so EXISTING accounts are updated', async () => {
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUserDoc,
      name: 'Jane Doe',
    });

    const res = await POST(
      googleRequest({
        name: 'Jane Doe',
        email: 'jane@example.com',
        firebaseUid: 'firebase-uid-123',
      })
    );

    expect(res.status).toBe(200);

    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];

    // Linking fields always apply (existing accounts included).
    expect(update.$set).toMatchObject({
      firebaseUid: 'firebase-uid-123',
      authProvider: 'google',
      name: 'Jane Doe',
    });

    // Immutable/insert-only fields stay in $setOnInsert and do not overwrite
    // existing progress on linked accounts.
    expect(update.$setOnInsert).toMatchObject({
      email: 'jane@example.com',
      avatarId: 'avatar-1',
      monthlyCarbon: 0,
      totalScanned: 0,
    });
    expect(update.$setOnInsert.name).toBeUndefined();
    expect(update.$setOnInsert.firebaseUid).toBeUndefined();

    // Provider history tracked explicitly.
    expect(update.$addToSet).toEqual({ authProviders: 'google' });

    expect(setAuthCookie).toHaveBeenCalledWith(
      'jane@example.com',
      '64b000000000000000000001'
    );
  });

  it('returns the linked user with the firebaseUid persisted on the account', async () => {
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
      ...mockUserDoc,
      firebaseUid: 'firebase-uid-123',
    });

    const res = await POST(
      googleRequest({
        name: 'Jane Doe',
        email: 'jane@example.com',
        firebaseUid: 'firebase-uid-123',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user).toMatchObject({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    // The route persists firebaseUid onto the existing account, so a
    // `findOne({ firebaseUid })` lookup (the firebaseUid index) resolves to
    // this same linked document.
    const update = (User.findOneAndUpdate as jest.Mock).mock.calls[0][1];
    expect(update.$set).toMatchObject({ firebaseUid: 'firebase-uid-123' });
    expect(setAuthCookie).toHaveBeenCalledWith(
      'jane@example.com',
      '64b000000000000000000001'
    );
  });
});
