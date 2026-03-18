import { LocaleRedirect } from './LocaleRedirect';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function LocaleIndexPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return <LocaleRedirect locale={locale} />;
}
