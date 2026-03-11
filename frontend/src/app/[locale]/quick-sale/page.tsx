import { redirect } from 'next/navigation';

export default async function QuickSaleProxy({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/pos?view=quicksale`);
}
