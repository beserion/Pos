import { PageClient } from './PageClient';

export function generateMetadata() {
    return {
        title: `Sayım İşlemleri | POSAPP`,
        description: 'Envanter sayım modülü',
    };
}

export default function InventoryCountPage() {
    return <PageClient />;
}
