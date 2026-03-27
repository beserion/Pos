import { PageClient } from './PageClient';

export function generateMetadata() {
    return {
        title: `Stok Hareketleri | POSAPP`,
        description: 'Geçmiş stok hareketleri, manuel giriş/çıkış ve transfer işlemleri',
    };
}

export default function StockMovementsPage() {
    return <PageClient />;
}
