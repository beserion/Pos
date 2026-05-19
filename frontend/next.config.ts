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
  trailingSlash: false,
  // Güvenli geliştirme için bu domainlere izin veriyoruz
  allowedDevOrigins: ['inans.posnetx.com', 'test.posnetx.com', 'apitest.posnetx.com', 'localhost:3000', 'tester.posnetx.com'],
  async headers() {
    return [
      {
        // Uygulamanın API ve genel endpoint'leri için CORS izinleri
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // origin: '*' olarak da bırakılabilir ancak kimlik doğrulama(credentials) isteniyorsa dinamik veya spesifik olmak daha iyidir.
          // Frontend yerel ağda (192.168.x.x vb) çalıştığı için şimdilik her yerden kabul etmesini sağlıyoruz:
          { key: "Access-Control-Allow-Origin", value: "*" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        // Boss PWA API proxy
        source: '/boss-api/:path*',
        destination: 'http://localhost:3100/:path*',
      },
      {
        // Garson PWA ana dizini
        source: '/garson',
        destination: '/garson/index.html',
      },
      {
        // Garson PWA alt rotaları (SPA desteği)
        source: '/garson/:path*',
        destination: '/garson/index.html',
      },
      {
        // Boss PWA ana dizini
        source: '/boss',
        destination: '/boss/index.html',
      },
      {
        // Boss PWA alt rotaları (SPA desteği)
        source: '/boss/:path*',
        destination: '/boss/index.html',
      }
    ];
  },
} as any;

export default withNextIntl(nextConfig);
