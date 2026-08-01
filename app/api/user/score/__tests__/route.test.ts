/**
 * @jest-environment node
 */

import { POST, PATCH } from '../route';
import User from '@/models/User';

jest.mock('@/lib/mongodb', () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@/lib/monthly-cycle', () => {
  return {
    __esModule: true,
    checkAndRunMonthlyRollover: jest.fn().mockResolvedValue(undefined),
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

describe('User Score API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/user/score', () => {
    it('should return 401 if x-user-email header is missing', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 for malformed JSON request body', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        // Passing malformed JSON body
        body: '{',
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ error: 'Invalid JSON payload' });
    });

    it('should return 400 for invalid monthlyCarbonGoal values', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ monthlyCarbonGoal: -10 }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        error:
          'monthlyCarbonGoal must be a positive number (kg CO2), or null to clear it',
      });
    });

    it('should update monthlyCarbonGoal successfully with valid number', async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
        monthlyCarbonGoal: 50,
      });

      const req = new Request('http://localhost/api/user/score', {
        method: 'PATCH',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ monthlyCarbonGoal: 50 }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ monthlyCarbonGoal: 50 });
    });
  });

  describe('POST /api/user/score', () => {
    it('should return 400 for malformed JSON request body', async () => {
      const req = new Request('http://localhost/api/user/score', {
        method: 'POST',
        headers: {
          'x-user-email': 'test@example.com',
          'content-type': 'application/json',
        },
        body: '{',
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ error: 'Invalid JSON payload' });
    });
  });
});
