import { PageClient } from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return {
        title: `Sayım Fişi #${id} | POSAPP`,
        description: 'Sayım fişi detayı',
    };
}

export default async function InventoryCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PageClient sessionId={parseInt(id)} />;
}
