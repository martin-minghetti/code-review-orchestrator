import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['octokit'],
  devIndicators: false,
};

export default nextConfig;
