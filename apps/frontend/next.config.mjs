import path from 'node:path';
import nextEnv from '@next/env';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

// Dev: đọc chung file .env ở thư mục gốc monorepo.
nextEnv.loadEnvConfig(path.join(process.cwd(), '../../'));

export default (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  // Dev chạy backend trên máy (cổng BACKEND_PORT), nên bỏ qua INTERNAL_API_URL=http://backend:4000
  // vốn chỉ đúng trong mạng Docker. Production dùng INTERNAL_API_URL.
  const internalApi = isDev
    ? `http://127.0.0.1:${process.env.BACKEND_PORT || 4000}`
    : process.env.INTERNAL_API_URL || 'http://backend:4000';

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: 'standalone',
    experimental: {
      // Monorepo: gom file chạy từ thư mục gốc để build standalone đầy đủ.
      outputFileTracingRoot: path.join(process.cwd(), '../../'),
    },
    reactStrictMode: true,
    poweredByHeader: false,
    async rewrites() {
      // Ở production Nginx proxy /api trực tiếp tới backend; rewrite này phục vụ dev.
      return [{ source: '/api/:path*', destination: `${internalApi}/api/:path*` }];
    },
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ],
        },
      ];
    },
  };
  return nextConfig;
};
