/**
 * @jest-environment node
 */

import { POST as signupHandler } from '../signup/route';
import { POST as signinHandler } from '../signin/route';
import { POST as googleHandler } from '../google/route';
import { GET as sessionHandler } from '../session/route';
import User from '@/models/User';
import { setAuthCookie, verifyToken } from '@/lib/auth';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  setAuthCookie: jest.fn().mockResolvedValue(undefined),
  verifyToken: jest.fn(),
  signToken: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

jest.mock('@/lib/firebase-admin', () => ({
  verifyFirebaseIdToken: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

describe('Auth Routes Email Casing Normalization (#378)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('normalizes verified email casing before lookup, creation, and cookie setting', async () => {
      (verifyFirebaseIdToken as jest.Mock).mockResolvedValue({
        uid: 'firebase-uid-123',
        email: '  NewUser@EXAMPLE.Com  ',
        name: 'New User',
      });

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({
        _id: 'mongo-id-123',
        name: 'New User',
        email: 'newuser@example.com',
        toObject: () => ({
          _id: 'mongo-id-123',
          name: 'New User',
          email: 'newuser@example.com',
        }),
      });

      const req = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New User',
          password: 'password123',
          idToken: 'valid-id-token',
        }),
      });

      const res = await signupHandler(req);
      expect(res.status).toBe(201);

      // Verify User.findOne looked up canonical lowercased email
      expect(User.findOne).toHaveBeenCalledWith({
        email: 'newuser@example.com',
      });

      // Verify User.create stored canonical email
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
        })
      );

      // Verify setAuthCookie set auth cookie with canonical email
      expect(setAuthCookie).toHaveBeenCalledWith(
        'newuser@example.com',
        'mongo-id-123'
      );
    });
  });

  describe('POST /api/auth/signin', () => {
    it('normalizes submitted email before query lookup and session cookie setting', async () => {
      const mockUser = {
        _id: 'mongo-id-456',
        name: 'Test User',
        email: 'testuser@example.com',
        password: '$2a$10$hashedpassword',
        monthlyCarbon: 0,
        totalScanned: 0,
        createdAt: new Date('2026-01-01'),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const req = new Request('http://localhost/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '  TestUser@EXAMPLE.com  ',
          password: 'password123',
        }),
      });

      // bcrypt compare mock
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      const res = await signinHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user.email).toBe('testuser@example.com');
      expect(User.findOne).toHaveBeenCalledWith({
        email: 'testuser@example.com',
      });
      expect(setAuthCookie).toHaveBeenCalledWith(
        'testuser@example.com',
        'mongo-id-456'
      );
    });
  });

  describe('POST /api/auth/google', () => {
    it('normalizes email for findOneAndUpdate query and upsert data', async () => {
      (verifyFirebaseIdToken as jest.Mock).mockResolvedValue({
        uid: 'google-uid-789',
        email: 'GoogleUser@Domain.Org',
        name: 'Google User',
      });

      const mockUserDoc = {
        _id: 'mongo-id-789',
        name: 'Google User',
        email: 'googleuser@domain.org',
        createdAt: new Date(),
      };

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUserDoc);

      const req = new Request('http://localhost/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'google-token-xyz' }),
      });

      const res = await googleHandler(req);
      expect(res.status).toBe(200);

      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { email: 'googleuser@domain.org' },
        expect.objectContaining({
          $setOnInsert: expect.objectContaining({
            email: 'googleuser@domain.org',
          }),
        }),
        expect.anything()
      );
      expect(setAuthCookie).toHaveBeenCalledWith(
        'googleuser@domain.org',
        'mongo-id-789'
      );
    });
  });

  describe('GET /api/auth/session', () => {
    it('normalizes token payload email before user lookup', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: 'valid-session-token' }),
        set: jest.fn(),
        delete: jest.fn(),
      });

      (verifyToken as jest.Mock).mockResolvedValue({
        email: '  SessionUser@Domain.Com ',
        userId: 'mongo-id-999',
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });

      const mockUser = {
        _id: 'mongo-id-999',
        name: 'Session User',
        email: 'sessionuser@domain.com',
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const res = await sessionHandler();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.user.email).toBe('sessionuser@domain.com');
      expect(User.findOne).toHaveBeenCalledWith({
        email: 'sessionuser@domain.com',
      });
    });
  });
});
