import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // The quiz uses one document and in-memory screen state. Prefix its exported
  // assets for Pages without changing the route used by the static renderer.
  assetPrefix: (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, ''),
  trailingSlash: true,
};

export default nextConfig;
