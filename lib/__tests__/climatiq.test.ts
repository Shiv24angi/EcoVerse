import axios from 'axios';
import { getCarbonFootprint } from '../climatiq';
import carbonCacheMock from '@/models/CarbonCache';
import { calculateCarbonFootprint } from '../carbon-calculator';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock CarbonCache
jest.mock('@/models/CarbonCache', () => {
  const mockCache: Record<string, any> = {};
  return {
    findOne: jest.fn().mockImplementation((filter) => {
      const val = mockCache[filter.queryKey];
      return {
        lean: () => Promise.resolve(val || null),
      };
    }),
    create: jest.fn().mockImplementation((doc) => {
      mockCache[doc.queryKey] = doc;
      return Promise.resolve(doc);
    }),
    _clear: () => {
      for (const prop of Object.keys(mockCache)) {
        delete mockCache[prop];
      }
    },
  };
});

// Mock dbConnect
jest.mock('@/lib/mongodb', () => jest.fn().mockResolvedValue(true));

describe('Climatiq Integration with Caching & Fallback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear mock cache
    (carbonCacheMock as any)._clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should fall back to local calculator when CLIMATIQ_API_KEY is not set', async () => {
    process.env.CLIMATIQ_API_KEY = '';

    const result = await getCarbonFootprint('beef', 'testbrand');

    const expectedLocal = calculateCarbonFootprint('beef', 'testbrand');

    expect(result.carbonFootprint).toBe(expectedLocal.carbonFootprint);
    expect(result.source).toBe('Local Calculator (Fallback)');
    expect(result.category).toBe(expectedLocal.category);
    expect(result.confidence).toBe(expectedLocal.confidence);
  });

  it('should use Climatiq API when key is configured and calls succeed', async () => {
    process.env.CLIMATIQ_API_KEY = 'test_key';

    // Mock search API response
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 'food-beef-factor-id',
            name: 'Beef product',
            source: 'Ecoinvent',
            category: 'Food',
          },
        ],
      },
    });

    // Mock estimate API response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        co2e: 14.56,
      },
    });

    const result = await getCarbonFootprint('beef', 'testbrand');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.climatiq.io/data/v1/search',
      expect.objectContaining({
        params: { query: 'beef', data_version: '^3' },
      })
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.climatiq.io/data/v1/estimate',
      expect.objectContaining({
        emission_factor: { id: 'food-beef-factor-id' },
        parameters: { weight: 0.5, weight_unit: 'kg' }, // 0.5kg is the defaultWeight for beef
      }),
      expect.any(Object)
    );

    expect(result.carbonFootprint).toBe(14.56);
    expect(result.source).toBe('Climatiq API');
    expect(result.confidence).toBe('high');
    expect(result.calculation).toContain('based on Climatiq');

    // Verify it got cached
    expect(carbonCacheMock.create).toHaveBeenCalled();
  });

  it('should serve from cache on subsequent requests', async () => {
    process.env.CLIMATIQ_API_KEY = 'test_key';

    // Setup first mock flow
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [{ id: 'food-beef-id', name: 'Beef', source: 'Ecoinvent' }],
      },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { co2e: 12.34 } });

    // Call 1: Fetches from API & caches
    const res1 = await getCarbonFootprint('beef', 'testbrand');
    expect(res1.carbonFootprint).toBe(12.34);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);

    // Reset axios mocks to ensure no further API calls are made
    jest.clearAllMocks();

    // Call 2: Should hit cache
    const res2 = await getCarbonFootprint('beef', 'testbrand');
    expect(res2.carbonFootprint).toBe(12.34);
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(res2.source).toBe('Climatiq API');
  });

  it('should fall back to local calculator if Climatiq API search yields no results', async () => {
    process.env.CLIMATIQ_API_KEY = 'test_key';

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [],
      },
    });

    const result = await getCarbonFootprint('unknownproduct', 'somebrand');
    const expectedLocal = calculateCarbonFootprint(
      'unknownproduct',
      'somebrand'
    );

    expect(result.carbonFootprint).toBe(expectedLocal.carbonFootprint);
    expect(result.source).toBe('Local Calculator (Fallback)');
  });

  it('should fall back to local calculator if Climatiq API search throws an error', async () => {
    process.env.CLIMATIQ_API_KEY = 'test_key';

    mockedAxios.get.mockRejectedValueOnce(
      new Error('Rate limit or connection error')
    );

    const result = await getCarbonFootprint('beef', 'testbrand');
    const expectedLocal = calculateCarbonFootprint('beef', 'testbrand');

    expect(result.carbonFootprint).toBe(expectedLocal.carbonFootprint);
    expect(result.source).toBe('Local Calculator (Fallback)');
  });
});
