import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5013/api/:path*',
      },
      {
        source: '/notificationHub',
        destination: 'http://localhost:5013/notificationHub',
      },
      {
        source: '/notificationHub/:path*',
        destination: 'http://localhost:5013/notificationHub/:path*',
      },
    ];
  },
};

export default nextConfig;
