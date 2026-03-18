import { PosContainer } from './PosContainer';

const locales = ['tr', 'en', 'de', 'fr', 'it', 'ar', 'ru', 'el'];

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default function PosPage() {
    return <PosContainer />;
}
