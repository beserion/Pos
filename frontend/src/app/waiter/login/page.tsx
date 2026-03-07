'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

interface Waiter {
    id: number;
    firstName: string;
    lastName: string;
}

export default function WaiterLoginPage() {
    const router = useRouter();
    const [waiters, setWaiters] = useState<Waiter[]>([]);
    const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWaiters();
    }, []);

    const fetchWaiters = async () => {
        try {
            const res = await axios.get('http://localhost:3050/auth/waiters');
            setWaiters(res.data);
        } catch (error) {
            console.error('Waiters fetch error:', error);
            Swal.fire({ title: 'Hata', text: 'Garson listesi alınamadı.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handlePinInput = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                submitLogin(newPin);
            }
        }
    };

    const handleDeletePin = () => {
        setPin(pin.slice(0, -1));
    };

    const submitLogin = async (currentPin: string) => {
        if (!selectedWaiter) return;
        try {
            const res = await axios.post('http://localhost:3050/auth/login-pin', {
                userId: selectedWaiter.id,
                pinCode: currentPin
            });
            if (res.data.access_token) {
                Cookies.set('token', res.data.access_token, { expires: 1 });
                // Animasyon için kısa bir gecikme
                setTimeout(() => router.push('/waiter'), 300);
            }
        } catch (error: any) {
            Swal.fire({
                title: 'Hatalı Şifre',
                text: 'Lütfen pin kodunuzu tekrar deneyin.',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                timer: 2000
            });
            setPin('');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 min-h-screen bg-slate-900 font-sans overflow-hidden flex flex-col relative">
            {/* Background Animations */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[150px] animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600/20 blur-[150px] animate-pulse pointer-events-none delay-1000"></div>

            <div className="relative z-10 p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <i className="fat fa-bolt text-white text-2xl"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Garson<span className="text-indigo-400">POS</span></h1>
                        <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-1">Personel Giriş Sistemi</p>
                    </div>
                </div>
                {selectedWaiter && (
                    <button
                        onClick={() => { setSelectedWaiter(null); setPin(''); }}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10 flex items-center gap-2"
                    >
                        <i className="fat fa-arrow-left"></i> Vazgeç
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                {!selectedWaiter ? (
                    <div className="w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black text-white tracking-tight">KİM GİRİŞ YAPIYOR?</h2>
                            <p className="text-slate-400 font-medium mt-2">Lütfen listeden isminizi seçin</p>
                        </div>

                        <div className="flex-1 overflow-y-auto pb-10 scrollbar-none px-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {waiters.map(waiter => (
                                    <button
                                        key={waiter.id}
                                        onClick={() => setSelectedWaiter(waiter)}
                                        className="h-32 bg-slate-800/60 hover:bg-indigo-600/20 border border-slate-700 hover:border-indigo-500/50 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all group backdrop-blur-xl shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-slate-700 group-hover:bg-indigo-500 flex items-center justify-center text-xl shadow-inner transition-colors">
                                            🧑‍🍳
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-white text-lg leading-none">{waiter.firstName}</div>
                                            <div className="text-slate-400 text-xs font-semibold mt-1">{waiter.lastName}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {waiters.length === 0 && (
                                <div className="text-center p-12 bg-slate-800/30 rounded-3xl border border-slate-700/50">
                                    <i className="fat fa-users-slash text-5xl text-slate-500 mb-4 block"></i>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest">Kayıtlı Garson Bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in duration-300">
                        {/* Selected Waiter Profile */}
                        <div className="mb-8 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-indigo-500 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/40 mb-4 border-2 border-indigo-400 outline outline-4 outline-indigo-500/20">
                                🧑‍🍳
                            </div>
                            <h2 className="text-3xl font-black text-white">{selectedWaiter.firstName} {selectedWaiter.lastName}</h2>
                            <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mt-1">Pin kodunuzu girin</p>
                        </div>

                        {/* PIN Dots */}
                        <div className="flex gap-4 mb-8">
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`w-5 h-5 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-slate-700 border-2 border-slate-600 outline outline-4 outline-slate-800'}`}
                                ></div>
                            ))}
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-4 w-full">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handlePinInput(num.toString())}
                                    className="h-20 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-[2rem] text-3xl font-black text-white shadow-sm hover:shadow-md transition-all active:scale-95"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => setPin('')}
                                className="h-20 bg-slate-800/40 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 rounded-[2rem] text-xl font-black text-rose-400 shadow-sm transition-all active:scale-95 flex items-center justify-center uppercase tracking-widest text-xs"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={() => handlePinInput('0')}
                                className="h-20 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-[2rem] text-3xl font-black text-white shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                0
                            </button>
                            <button
                                onClick={handleDeletePin}
                                className="h-20 bg-slate-800/40 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-[2rem] text-2xl text-slate-300 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
