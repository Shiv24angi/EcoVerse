/**
 * @jest-environment node
 */

import { GET } from '../route';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import dbConnect from '@/lib/mongodb';

const OriginalEnv = process.env.NODE_ENV;
const OriginalMongoUri = process.env.MONGODB_URI;

function json(res: Response) {
  return res.json();
}

describe('GET /api/test-db (#437 — no DB connection detail leakage)', () => {
  beforeEach(() => {
    // The route short-circuits when MONGODB_URI is unset; provide a placeholder
    // so the connection path (and the mocked dbConnect) is actually exercised.
    process.env.MONGODB_URI = 'mongodb://placeholder:27017/ecoverse';
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (OriginalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = OriginalEnv;
    }
    if (OriginalMongoUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = OriginalMongoUri;
    }
  });

  it('is disabled in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error).toMatch(/disabled in production/i);
  });

  it('returns success with only safe fields (no connection string)', async () => {
    process.env.NODE_ENV = 'development';
    (dbConnect as jest.Mock).mockResolvedValue({
      connection: { readyState: 1, db: { databaseName: 'ecoverse-test' } },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe('success');
    expect(body.database).toBe('ecoverse-test');
    expect(body.readyState).toBe(1);
    expect(body.error).toBeUndefined();
    expect(body.hostname).toBeUndefined();
  });

  it('returns a generic error and does NOT leak hostname/errno/syscall/raw message', async () => {
    process.env.NODE_ENV = 'development';
    const leaked = Object.assign(
      new Error(
        'connect ECONNREFUSED 10.13.42.7:27017 -- cluster0.prod.internal'
      ),
      {
        code: 'ECONNREFUSED',
        errno: -111,
        syscall: 'connect',
        hostname: 'cluster0.prod.internal',
      }
    );
    (dbConnect as jest.Mock).mockRejectedValue(leaked);

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await json(res);

    expect(body.status).toBe('failed');
    expect(body.error).toBe('MongoDB connection test failed');
    expect(body.category).toBe('network_refused');
    expect(body.hint).toMatch(/refused/i);

    expect(body.message).toBeUndefined();
    expect(body.hostname).toBeUndefined();
    expect(body.errno).toBeUndefined();
    expect(body.syscall).toBeUndefined();
    expect(body.code).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('cluster0.prod.internal');
    expect(JSON.stringify(body)).not.toContain('10.13.42.7');
  });

  it('maps ENOTFOUND to a dns category without leaking the hostname', async () => {
    process.env.NODE_ENV = 'development';
    const leaked = Object.assign(
      new Error('getaddrinfo ENOTFOUND db.internal'),
      {
        code: 'ENOTFOUND',
        errno: -3008,
        syscall: 'getaddrinfo',
        hostname: 'db.internal',
      }
    );
    (dbConnect as jest.Mock).mockRejectedValue(leaked);

    const res = await GET();
    const body = await json(res);
    expect(body.category).toBe('dns_resolution_failed');
    expect(JSON.stringify(body)).not.toContain('db.internal');
    expect(body.hostname).toBeUndefined();
  });

  it('maps an authentication error without leaking the raw message', async () => {
    process.env.NODE_ENV = 'development';
    (dbConnect as jest.Mock).mockRejectedValue(
      new Error('bad auth: authentication failed for user "admin" on cluster0')
    );

    const res = await GET();
    const body = await json(res);
    expect(body.category).toBe('authentication_failed');
    expect(JSON.stringify(body)).not.toContain('admin');
    expect(body.message).toBeUndefined();
  });

  it('uses a generic connection_error category for unknown failures', async () => {
    process.env.NODE_ENV = 'development';
    (dbConnect as jest.Mock).mockRejectedValue(new Error('something odd'));

    const res = await GET();
    const body = await json(res);
    expect(body.category).toBe('connection_error');
    expect(body.error).toBe('MongoDB connection test failed');
    expect(JSON.stringify(body)).not.toContain('something odd');
  });
});
