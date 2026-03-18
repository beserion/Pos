'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import PosView from './PosView';
import QuickSaleView from './QuickSaleView';
import TakeOrderView from './TakeOrderView';

function PosContainerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = useLocale();
    const initialView = searchParams.get('view') as 'pos' | 'quicksale' | 'takeorder' || 'pos';
    const [view, setView] = useState<'pos' | 'quicksale' | 'takeorder'>(initialView);

    useEffect(() => {
        const v = searchParams.get('view');
        if (v === 'quicksale' || v === 'pos' || v === 'takeorder') {
            setView(v);
        } else if (!v) {
            setView('pos');
        }
    }, [searchParams]);

    const changeView = (newView: 'pos' | 'quicksale' | 'takeorder') => {
        if (newView === 'pos') {
            router.push(`/${locale}/pos`);
        } else {
            router.push(`/${locale}/pos?view=${newView}`);
        }
    };

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div style={{ display: view === 'pos' ? 'block' : 'none', height: '100%' }}>
                <PosView onSwitchToQuickSale={() => changeView('quicksale')} onSwitchToTakeOrder={() => changeView('takeorder')} />
            </div>
            <div style={{ display: view === 'quicksale' ? 'block' : 'none', height: '100%' }}>
                <QuickSaleView onSwitchToPos={() => changeView('pos')} />
            </div>
            <div style={{ display: view === 'takeorder' ? 'block' : 'none', height: '100%' }}>
                <TakeOrderView onSwitchToPos={() => changeView('pos')} />
            </div>
        </div>
    );
}

export function PosContainer() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-slate-50">Yükleniyor...</div>}>
            <PosContainerContent />
        </Suspense>
    );
}
