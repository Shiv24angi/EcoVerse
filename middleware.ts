import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Get the token from cookies
  const token = request.cookies.get('auth_token')?.value;

  // Clone headers to modify them
  const requestHeaders = new Headers(request.headers);

  // If a token exists, verify it and attach the email to the headers
  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.email) {
      requestHeaders.set('x-user-email', payload.email);
    }
  }

  // Continue the request, passing along the (potentially) modified headers.
  // Note: If the token is invalid or missing, we simply pass the request along
  // WITHOUT the header, allowing the API routes to use their backwards-compatible fallback.
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Only run middleware on the routes that require authentication
  matcher: [
    '/api/scan/:path*',
    '/api/rewards/:path*',
    '/api/user/score/:path*'
  ],
};
