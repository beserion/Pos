import { getRequestConfig } from 'next-intl/server';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'] as const;

export default getRequestConfig(async (config) => {
    // In next-intl 4.x, the locale can be passed in the config object
    let locale = (config as any).locale;

    if (!locale || !locales.includes(locale as any)) {
        locale = 'tr';
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
        getMessageFallback({ namespace, key }) { return namespace ? `${namespace}.${key}` : key; },
        onError(error: any) { if (error.code !== 'MISSING_MESSAGE') console.error(error); }
    };

});
