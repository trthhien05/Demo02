import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    const backendUrl = isProd ? 'https://demo02-backend.onrender.com' : 'http://localhost:5013';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/notificationHub',
        destination: `${backendUrl}/notificationHub`,
      },
      {
        source: '/notificationHub/:path*',
        destination: `${backendUrl}/notificationHub/:path*`,
      },
    ];
  },
};

export default nextConfig;
