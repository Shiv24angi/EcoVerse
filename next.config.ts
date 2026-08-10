import type { NextConfig } from 'next';
import { getContentSecurityPolicy, getReportingEndpoints } from './lib/csp';

const nextConfig: NextConfig = {
  typedRoutes: true,
  async headers() {
    const securityHeaders: { key: string; value: string }[] = [
      {
        key: 'Content-Security-Policy',
        value: getContentSecurityPolicy(),
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(self), geolocation=(self)',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
    ];

    const reportingEndpoints = getReportingEndpoints();
    if (reportingEndpoints) {
      securityHeaders.push({
        key: 'Reporting-Endpoints',
        value: reportingEndpoints,
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
