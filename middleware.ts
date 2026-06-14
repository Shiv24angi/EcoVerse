import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Get the token from cookies
  const token = request.cookies.get('auth_token')?.value;

  // Clone headers to modify them
  const requestHeaders = new Headers(request.headers);

  // ALWAYS remove any client-supplied identity header to prevent spoofing
  requestHeaders.delete('x-user-email');

  // If a token exists, verify it and attach the email to the headers
  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.email) {
      requestHeaders.set('x-user-email', payload.email);
    }
  }

  // Continue the request, passing along the (potentially) modified headers.
  // The x-user-email header is now only present if successfully verified from a token.
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
    '/api/user/score/:path*',
    '/api/user/avatar/:path*',
    '/api/user-packaging/:path*',
  ],
};
