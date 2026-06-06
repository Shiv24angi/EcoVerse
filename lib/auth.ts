import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const key = new TextEncoder().encode(secretKey);

export async function signToken(payload: { email: string, userId?: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as { email: string, userId?: string };
  } catch (error) {
    return null; // Invalid or expired token
  }
}
