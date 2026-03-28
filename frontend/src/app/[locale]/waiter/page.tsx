import { Suspense } from 'react';
import { PageClient } from './PageClient';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PageClient />
        </Suspense>
    );
}