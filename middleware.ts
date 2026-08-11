import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

const protectedRoutes = [
  '/dashboard',
  '/scan',
  '/rewards',
  '/carbon-tracking',
  '/analytics',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the token from cookies
  const token = request.cookies.get('auth_token')?.value;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If missing token on protected route, redirect to signin
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Clone headers to modify them
  const requestHeaders = new Headers(request.headers);

  // ALWAYS remove any client-supplied identity header to prevent spoofing
  requestHeaders.delete('x-user-email');

  // If a token exists, verify it and attach the email to the headers
  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.email) {
      requestHeaders.set('x-user-email', payload.email.toLowerCase());
    } else if (isProtectedRoute) {
      // Invalid token on a protected route
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // Continue the request, passing along the (potentially) modified headers.
  // The x-user-email header is now only present if successfully verified from a token.
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add security headers to prevent XSS and restrict permissions (Issue #408)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri /api/csp-violation"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self)'
  );
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  // Only run middleware on the routes that require authentication
  matcher: [
    '/dashboard/:path*',
    '/scan/:path*',
    '/rewards/:path*',
    '/carbon-tracking/:path*',
    '/analytics/:path*',
    '/api/:path*',
  ],
};
