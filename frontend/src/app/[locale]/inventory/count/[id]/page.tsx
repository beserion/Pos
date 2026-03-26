import { PageClient } from './PageClient';

export function generateMetadata({ params: { id } }: { params: { id: string } }) {
    return {
        title: `Sayım Fişi #${id} | POSAPP`,
        description: 'Sayım fişi detayı',
    };
}

export default function InventoryCountDetailPage({ params }: { params: { id: string } }) {
    return <PageClient sessionId={parseInt(params.id)} />;
}
