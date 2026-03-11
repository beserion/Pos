import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'],

    // Used when no locale matches
    defaultLocale: 'tr'
});

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(tr|en|de|fr|it|ar|ru|el)/:path*']
};
