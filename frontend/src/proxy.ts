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

    // Cloudflare Tunnel üzerinde portun URL'ye eklenmesini engellemek için
    // yönlendirme başlığındaki :3000 portunu temizliyoruz.
    const location = response.headers.get('location');
    if (location && location.includes(':3000')) {
        response.headers.set('location', location.replace(':3000', ''));
    }

    return response;
}

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(tr|en|de|fr|it|ar|ru|el)/:path*']
};
