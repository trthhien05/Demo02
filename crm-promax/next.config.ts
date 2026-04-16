import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://demo02-backend.onrender.com/api/:path*',
      },
      {
        source: '/notificationHub',
        destination: 'https://demo02-backend.onrender.com/notificationHub',
      },
      {
        source: '/notificationHub/:path*',
        destination: 'https://demo02-backend.onrender.com/notificationHub/:path*',
      },
    ];
  },
};

export default nextConfig;
