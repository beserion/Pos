import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: (process.env.NEXT_OUTPUT as 'standalone' | 'export') || 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Güvenli geliştirme için bu domainlere izin veriyoruz
  allowedDevOrigins: ['test.posnetx.com', 'apitest.posnetx.com', 'localhost:3000']
} as any;

export default withNextIntl(nextConfig);
