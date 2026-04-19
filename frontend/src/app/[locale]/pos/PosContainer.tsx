'use client';
import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import { startPrefetch } from '../utils/posPrefetch';

const PosView = lazy(() => import(/* webpackPrefetch: true */ './PosView'));
const QuickSaleView = lazy(() => import(/* webpackPrefetch: true */ './QuickSaleView'));
const TakeOrderView = lazy(() => import(/* webpackPrefetch: true */ './TakeOrderView'));
import BusinessDayGuard from '@/components/shifts/BusinessDayGuard';

function ViewLoadingSpinner() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Yükleniyor...</p>
        </div>
    );
}

function PosContainerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = useLocale();
    const initialView = searchParams.get('view') as 'pos' | 'quicksale' | 'takeorder' || 'pos';
    const [view, setView] = useState<'pos' | 'quicksale' | 'takeorder'>(initialView);
    const [businessDayReady, setBusinessDayReady] = useState(false);

    const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3050'
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');

    useEffect(() => {
        const v = searchParams.get('view');
        if (v === 'quicksale' || v === 'pos' || v === 'takeorder') {
            setView(v);
        } else if (!v) {
            setView('pos');
        }

        // Auth beklenmeden, cookie varsa anında prefetch başlat (en erken aşama)
        const token = Cookies.get('token');
        if (token) {
            startPrefetch(API_URL, token);
        }
    }, [searchParams, API_URL]);

    const changeView = (newView: 'pos' | 'quicksale' | 'takeorder') => {
        if (newView === 'pos') {
            router.push(`/${locale}/pos`);
        } else {
            router.push(`/${locale}/pos?view=${newView}`);
        }
    };

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* İş Günü Kontrol Guard'ı — Arka planda kontrol eder, hata varsa sayfa üzerine bindirilir */}
            <BusinessDayGuard
                apiUrl={API_URL}
                onReady={() => setBusinessDayReady(true)}
            />

            {/* POS içeriği anında render edilmeye başlar (businessDayReady bağımsız) */}
            <Suspense fallback={<ViewLoadingSpinner />}>
                {view === 'pos' && (
                    <PosView onSwitchToQuickSale={() => changeView('quicksale')} onSwitchToTakeOrder={() => changeView('takeorder')} />
                )}
                {view === 'quicksale' && (
                    <QuickSaleView onSwitchToPos={() => changeView('pos')} />
                )}
                {view === 'takeorder' && (
                    <TakeOrderView onSwitchToPos={() => changeView('pos')} />
                )}
            </Suspense>
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
