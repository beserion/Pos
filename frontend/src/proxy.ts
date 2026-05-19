import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
    // A list of all locales that are supported
    locales: ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'],

    // Used when no locale matches
    defaultLocale: 'tr'
});

export default function middleware(req: NextRequest) {
    const response = intlMiddleware(req);

    // Sadece istek yapılan host içinde :3000 portu yoksa (Cloudflare/Proxy durumu)
    // yönlendirme başlığındaki portu temizliyoruz. Yerel kullanımda (localhost:3000) portu koruyoruz.
    const host = req.headers.get('host') || '';
    const location = response.headers.get('location');
    
    if (location && location.includes(':3000') && !host.includes(':3000')) {
        response.headers.set('location', location.replace(':3000', ''));
    }

    return response;
}

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(tr|en|de|fr|it|ar|ru|el)/:path*']
};
