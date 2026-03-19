'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showSwal } from '@/app/[locale]/utils/swal';
import { useAuth } from '@/app/[locale]/AuthContext';
import { useLocale } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const { loginPinOnly } = useAuth();
    const [pin, setPin] = useState('');
    const [checking, setChecking] = useState(false);

    const handlePinInput = (num: string) => {
        if (checking || pin.length >= 4) return;
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) submitPin(newPin);
    };

    const handleDelete = () => {
        if (!checking) setPin(p => p.slice(0, -1));
    };

    const submitPin = async (currentPin: string) => {
        setChecking(true);
        try {
            const user = await loginPinOnly(currentPin);
            if (user) {
                setTimeout(() => router.push(`/${locale}/waiter?bypass=1`), 300);
            } else {
                throw new Error('Hatalı PIN');
            }
        } catch {
            showSwal({
                title: 'Hatalı PIN',
                text: 'PIN kodu tanınamadı. Tekrar deneyin.',
                icon: 'error',
                timer: 2000,
                showConfirmButton: false,
            });
            setPin('');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 font-sans overflow-hidden flex flex-col">
            {/* Background blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[150px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600/20 blur-[150px] animate-pulse pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 p-6 flex items-center border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mr-3">
                    <i className="fat fa-bolt text-white text-2xl" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
                        Garson<span className="text-indigo-400">POS</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-0.5">Personel Giriş Sistemi</p>
                </div>
            </div>

            {/* PIN Ekranı */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-sm flex flex-col items-center">

                    {/* İkon + Başlık */}
                    <div className="mb-10 flex flex-col items-center">
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl shadow-lg mb-5 border-2 outline outline-4 transition-all duration-300
                            ${checking
                                ? 'bg-amber-500 border-amber-400 outline-amber-500/20 animate-pulse'
                                : 'bg-indigo-500 border-indigo-400 outline-indigo-500/20'}`}>
                            {checking ? '⏳' : '🔐'}
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">PIN Kodunuzu Girin</h2>
                        <p className="text-slate-400 text-sm font-medium mt-2">
                            {checking ? 'Doğrulanıyor...' : '4 haneli PIN kodunuzu girin'}
                        </p>
                    </div>

                    {/* PIN Dots */}
                    <div className="flex gap-4 mb-10">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i}
                                className={`w-6 h-6 rounded-full transition-all duration-200
                                    ${pin.length > i
                                        ? 'bg-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.8)]'
                                        : 'bg-slate-700 border-2 border-slate-600 outline outline-4 outline-slate-800'}`}
                            />
                        ))}
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-4 w-full">
                        {[1,2,3,4,5,6,7,8,9].map(num => (
                            <button key={num} onClick={() => handlePinInput(num.toString())} disabled={checking}
                                className="h-20 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-[2rem] text-3xl font-black text-white shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                                {num}
                            </button>
                        ))}
                        {/* Boş sol */}
                        <div />
                        <button onClick={() => handlePinInput('0')} disabled={checking}
                            className="h-20 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-[2rem] text-3xl font-black text-white shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                            0
                        </button>
                        <button onClick={handleDelete} disabled={checking}
                            className="h-20 bg-slate-800/40 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-[2rem] text-slate-300 shadow-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
