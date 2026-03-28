import { PageClient } from './PageClient';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.flatMap((locale) => [
        { locale, id: '1' }
    ]);
}

export default function Page() {
    return <PageClient />;
}