'use client';
import { useTranslations } from 'next-intl';

interface PremiumModuleLockedProps {
    moduleName: string;
    featureKey: string;
}

export default function PremiumModuleLocked({ moduleName, featureKey }: PremiumModuleLockedProps) {
    const tc = useTranslations('Common');

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-20 z-10 w-full min-h-[400px]">
            {/* Animated Background Pulse */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <div className="relative group">
                <div className="w-24 h-24 rounded-[32px] bg-white dark:bg-slate-800 shadow-2xl shadow-indigo-500/10 flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-700 transform transition-transform group-hover:scale-110 duration-500">
                    <i className="fat fa-lock-keyhole text-4xl text-indigo-500 drop-shadow-sm"></i>
                </div>
                {/* Small floating bits */}
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center animate-bounce">
                    <i className="fat fa-crown text-rose-500 text-xs"></i>
                </div>
            </div>

            <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4 text-center">
                PREMIUM MODÜL PASİF
            </h3>
            
            <div className="max-w-md text-center space-y-6">
                <p className="text-slate-500 dark:text-slate-400 font-bold text-base leading-relaxed">
                    İncelemeye çalıştığınız <span className="text-indigo-600 dark:text-indigo-400">"{moduleName}"</span> modülü aktif bir lisans gerektirmektedir.
                </p>

                <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">NASIL AKTİFLEŞTİRİLİR?</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium italic">
                        "Bu modülü sisteminize dahil etmek ve avantajlarından yararlanmak için lütfen satış temsilciniz ile iletişime geçin."
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button 
                        onClick={() => window.history.back()}
                        className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                    >
                        <i className="fat fa-arrow-left text-sm"></i>
                        GERİ DÖN
                    </button>
                    
                    <button 
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <i className="fat fa-paper-plane text-sm"></i>
                        TEKLİF AL
                    </button>
                </div>
            </div>
        </div>
    );
}
