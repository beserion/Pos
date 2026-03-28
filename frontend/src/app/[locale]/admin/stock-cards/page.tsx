import { PageClient } from './PageClient';

export function generateMetadata() {
    return {
        title: `Stok Kartları | POSAPP`,
        description: 'Stok kartları yönetimi',
    };
}

export default function StockCardsPage() {
    return <PageClient />;
}
