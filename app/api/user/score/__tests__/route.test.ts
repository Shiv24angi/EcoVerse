/**
 * @jest-environment node
 */

import { POST } from '../route';
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
    checkAndRunMonthlyRollover: jest.fn().mockResolvedValue(false),
  };
});

jest.mock('@/models/User', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    },
  };
});

/**
 * Test suite for POST /api/user/score (manual eco-activity entry).
 * Verifies that resubmitting the same activity in quick succession is
 * rejected before it reaches the database write.
 */
describe('POST /api/user/score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject a duplicate manual entry submitted within the dedup window', async () => {
    const mockUser = {
      email: 'test@example.com',
      totalScanned: 3,
      scans: [
        {
          productName: 'Reusable Water Bottle',
          carbonEstimate: 2.5,
          category: 'Manual Entry',
          confidence: 'medium',
          barcode: 'MANUAL-1700000000000',
          date: new Date(),
          source: 'Manual Entry',
        },
      ],
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request('http://localhost/api/user/score', {
      method: 'POST',
      headers: {
        'x-user-email': 'test@example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName: 'Reusable Water Bottle',
        carbonEstimate: 2.5,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe('This activity was already submitted a moment ago');
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should check for duplicates scoped to the same product, amount and manual source', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/user/score', {
      method: 'POST',
      headers: {
        'x-user-email': 'test@example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName: 'Reusable Water Bottle',
        carbonEstimate: 2.5,
      }),
    });

    await POST(request);

    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        scans: {
          $elemMatch: expect.objectContaining({
            productName: 'Reusable Water Bottle',
            carbonEstimate: 2.5,
            source: 'Manual Entry',
            date: expect.objectContaining({ $gte: expect.any(Date) }),
          }),
        },
      })
    );
  });
});
