import { PageClient } from './PageClient';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export const dynamicParams = true;
export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
    await params;
    return <PageClient />;
}
