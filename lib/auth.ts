import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const FALLBACK_SECRET = 'fallback_secret_for_development_only';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
        'Generate one with: openssl rand -base64 32'
    );
  }
  if (secret === FALLBACK_SECRET) {
    throw new Error(
      'JWT_SECRET must not use the known insecure fallback value. ' +
        'Generate one with: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

let key: Uint8Array | null = null;

function generateJTI(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export async function signToken(payload: { email: string; userId?: string }) {
  if (!key) key = getSecretKey();
  return await new SignJWT({ ...payload, jti: generateJTI() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string) {
  if (!key) key = getSecretKey();

  try {
    try {
      const fallbackKey = new TextEncoder().encode(FALLBACK_SECRET);
      await jwtVerify(token, fallbackKey, { algorithms: ['HS256'] });
      console.warn(
        '[SECURITY] Rejected token signed with known weak fallback secret'
      );
      return null;
    } catch {
      // Not signed with the old fallback secret
    }

    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as { email: string; userId?: string; jti?: string };
  } catch {
    return null;
  }
}

// Signs a JWT for the given identity and sets it as the HttpOnly auth_token
// cookie. Centralizes the cookie options (httpOnly, secure, sameSite, maxAge,
// path) so all auth entry points (Google, email/password signin and signup)
// stay consistent.
export async function setAuthCookie(email: string, userId: string) {
  const token = await signToken({ email, userId });

  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Extracts the auth_token cookie from a Request, verifies it, and checks that
 * the decoded email matches the x-user-email header.
 *
 * Returns a 401 NextResponse on failure, or null if the check passes.
 */
export async function verifyCookieAuth(
  req: Request,
  email: string
): Promise<NextResponse | null> {
  const cookies = req.headers.get('cookie') || '';
  const authToken = cookies
    .split(';')
    .find((c) => c.trim().startsWith('auth_token='))
    ?.split('=')[1];

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyToken(authToken);
  if (!payload || payload.email !== email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
