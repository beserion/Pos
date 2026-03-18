const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

import { redirect } from 'next/navigation';

export default async function QuickSaleProxy({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/pos?view=quicksale`);
}
