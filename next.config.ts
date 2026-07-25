import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
