const fs = require('fs');
const content = import { redirect } from 'next/navigation';

export default async function QuickSaleProxy({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect( + '' + '//pos?view=quicksale' + '' + );
}
;
fs.writeFileSync('src/app/[locale]/quick-sale/page.tsx', content);

