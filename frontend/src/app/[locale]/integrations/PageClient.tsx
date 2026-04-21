'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-20 z-10 w-full min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Animated Background Pulse */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute top-10 right-10 w-[200px] h-[200px] bg-blue-500/10 dark:bg-blue-400/5 rounded-full blur-[80px] animate-pulse delay-700"></div>
            </div>

            <div className="relative group z-10">
                <div className="w-28 h-28 rounded-[36px] bg-white dark:bg-slate-800 shadow-2xl shadow-indigo-500/10 flex items-center justify-center mb-8 border border-white/50 dark:border-slate-700 transform transition-transform group-hover:scale-110 duration-500">
                    <i className="fat fa-cubes text-5xl text-indigo-500 drop-shadow-sm"></i>
                </div>
                {/* Small floating bits */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center animate-bounce">
                    <i className="fat fa-plug text-blue-500 text-sm"></i>
                </div>
            </div>

            <h3 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4 text-center z-10">
                ÇOK YAKINDA
            </h3>
            
            <div className="max-w-md text-center space-y-8 z-10">
                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg leading-relaxed">
                    <span className="text-indigo-600 dark:text-indigo-400">Entegrasyonlar</span> modülü yapım aşamasında. Çok yakında API ve web servis bağlantıları burada olacak!
                </p>

                <div className="flex justify-center pt-6">
                    <button 
                        onClick={() => router.push(`/${locale}/dashboard`)}
                        className="px-10 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-1 transition-all flex items-center gap-3 group"
                    >
                        <i className="fat fa-arrow-left text-lg group-hover:-translate-x-1 transition-transform"></i>
                        ANA PANELE DÖN
                    </button>
                </div>
            </div>
        </div>
    );
}
