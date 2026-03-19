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
            {view === 'pos' && (
                <PosView onSwitchToQuickSale={() => changeView('quicksale')} onSwitchToTakeOrder={() => changeView('takeorder')} />
            )}
            {view === 'quicksale' && (
                <QuickSaleView onSwitchToPos={() => changeView('pos')} />
            )}
            {view === 'takeorder' && (
                <TakeOrderView onSwitchToPos={() => changeView('pos')} />
            )}
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
