import { getRequestConfig } from 'next-intl/server';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'] as const;

export default getRequestConfig(async ({ locale }) => {
    const targetLocale = locales.includes(locale as any) ? locale : 'tr';

    console.log(`[i18n.ts] RESOLVING: "${locale}" -> "${targetLocale}"`);

    return {
        locale: targetLocale,
        messages: (await import(`../messages/${targetLocale}.json`)).default
    };
});
