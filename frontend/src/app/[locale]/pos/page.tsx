'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PosView from './PosView';
import QuickSaleView from './QuickSaleView';

function PosContainerContent() {
    const searchParams = useSearchParams();
    const initialView = searchParams.get('view') === 'quicksale' ? 'quicksale' : 'pos';
    const [view, setView] = useState<'pos' | 'quicksale'>(initialView);

    useEffect(() => {
        if (searchParams.get('view') === 'quicksale') {
            setView('quicksale');
        } else if (searchParams.get('view') === 'pos') {
            setView('pos');
        }
    }, [searchParams]);

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div style={{ display: view === 'pos' ? 'block' : 'none', height: '100%' }}>
                <PosView onSwitchToQuickSale={() => setView('quicksale')} />
            </div>
            <div style={{ display: view === 'quicksale' ? 'block' : 'none', height: '100%' }}>
                <QuickSaleView onSwitchToPos={() => setView('pos')} />
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
