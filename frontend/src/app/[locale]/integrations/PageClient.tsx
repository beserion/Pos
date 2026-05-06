'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/apiConfig';

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const [inposStatus, setInposStatus] = useState<any>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
                if (!token) return;
                const res = await fetch(`${API_URL}/inpos/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) setInposStatus(await res.json());
            } catch { /* ignore */ }
        };
        fetchStatus();
    }, []);

    const integrations = [
        {
            id: 'inpos',
            name: 'inPOS YAZARKASA',
            description: 'm530 yazarkasa cihaz entegrasyonu. Mali fiş kesimi, X/Z raporu ve ödeme yönetimi.',
            icon: 'fat fa-cash-register',
            iconColor: 'text-emerald-500',
            bgGlow: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20',
            connected: inposStatus?.connected || false,
            route: `/${locale}/integrations/inpos`,
        },
    ];

    return (
        <div className="flex-1 flex flex-col p-6 md:p-10 z-10 w-full min-h-screen bg-slate-50 dark:bg-slate-900 overflow-auto relative">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-[150px] animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 mb-10">
                <div className="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => router.push(`/${locale}/dashboard`)}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-500 hover:border-indigo-300 transition-all hover:-translate-x-0.5 shadow-sm"
                    >
                        <i className="fat fa-arrow-left text-sm"></i>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            Entegrasyonlar
                        </h1>
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">
                            Dış sistem ve cihaz bağlantılarını yönetin
                        </p>
                    </div>
                </div>
            </div>

            {/* Integration Cards Grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {integrations.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => router.push(item.route)}
                        className="group relative bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 hover:border-emerald-400/40"
                    >
                        {/* Glow Effect */}
                        <div className={`absolute inset-0 rounded-2xl ${item.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`}></div>

                        {/* Status Indicator */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${item.connected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${item.connected ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {item.connected ? 'Bağlı' : 'Bağlı Değil'}
                            </span>
                        </div>

                        {/* Icon */}
                        <div className={`w-14 h-14 rounded-xl ${item.bgGlow} border ${item.borderColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <i className={`${item.icon} text-2xl ${item.iconColor}`}></i>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
                            {item.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {item.description}
                        </p>

                        {/* Arrow */}
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
                            Ayarlara Git
                            <i className="fat fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
