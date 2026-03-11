'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PosView from './PosView';
import QuickSaleView from './QuickSaleView';
import TakeOrderView from './TakeOrderView';

function PosContainerContent() {
    const searchParams = useSearchParams();
    const initialView = searchParams.get('view') as 'pos' | 'quicksale' | 'takeorder' || 'pos';
    const [view, setView] = useState<'pos' | 'quicksale' | 'takeorder'>(initialView);

    useEffect(() => {
        const v = searchParams.get('view');
        if (v === 'quicksale' || v === 'pos' || v === 'takeorder') {
            setView(v);
        }
    }, [searchParams]);

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div style={{ display: view === 'pos' ? 'block' : 'none', height: '100%' }}>
                <PosView onSwitchToQuickSale={() => setView('quicksale')} onSwitchToTakeOrder={() => setView('takeorder')} />
            </div>
            <div style={{ display: view === 'quicksale' ? 'block' : 'none', height: '100%' }}>
                <QuickSaleView onSwitchToPos={() => setView('pos')} />
            </div>
            <div style={{ display: view === 'takeorder' ? 'block' : 'none', height: '100%' }}>
                <TakeOrderView onSwitchToPos={() => setView('pos')} />
            </div>
        </div>
    );
}

export default function PosPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-slate-500">Yükleniyor...</div>}>
            <PosContainerContent />
        </Suspense>
    );
}
