'use client';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import axios from 'axios';
import Cookies from 'js-cookie';

type Screen = 'login' | 'create-pin';

export function PageClient() {
    const tCommon = useTranslations('Common');
    const tLogin = useTranslations('Login');
    const locale = useLocale();
    const [screen, setScreen] = useState<Screen>('login');

    // Login
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // PIN oluşturma
    const [pendingUser, setPendingUser] = useState<any>(null);
    const [pendingToken, setPendingToken] = useState('');
    const [pin, setPin] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSaving, setPinSaving] = useState(false);

    const { setUser } = useAuth();
    const router = useRouter();
    const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) : (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')));

    // ─── Giriş ───────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                identifier: identifier.trim(),
                password,
            });
            const { access_token, user } = res.data;
            const roleName: string = user?.role?.name?.toUpperCase() || '';

            // Token'ı kaydet
            Cookies.set('token', access_token, { expires: 1 });
            localStorage.setItem('token', access_token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

            // Global state'i güncelle (Login loop'u önler)
            setUser({ ...user, token: access_token });

            if (roleName === 'GARSON' || roleName === 'WAITER') {
                router.push(`/${locale}/waiter/login`);
            } else {
                router.push(`/${locale}/dashboard`);
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            setIsLoading(false);
        }
    };

    // ─── PIN Kaydet ───────────────────────────────────────────────────
    const handleSavePin = async () => {
        setPinError('');
        if (pin.length < 4) { setPinError('PIN en az 4 haneli olmalıdır.'); return; }
        if (pin !== pinConfirm) { setPinError('PIN kodları eşleşmiyor.'); return; }
        if (!/^\d+$/.test(pin)) { setPinError('PIN sadece rakamlardan oluşmalıdır.'); return; }

        setPinSaving(true);
        try {
            // — Benzersizlik kontrolü
            const checkRes = await axios.get(`${API_URL}/users/check-pin`, {
                params: { pin, excludeId: pendingUser?.id },
                headers: { Authorization: `Bearer ${pendingToken}` },
            });
            if (!checkRes.data.unique) {
                setPinError('⚠️ Bu PIN kodu başka bir kullanıcı tarafından kullanılıyor. Lütfen farklı bir PIN seçin.');
                setPinSaving(false);
                return;
            }

            await axios.put(`${API_URL}/users/${pendingUser.id}`,
                { pinCode: pin },
                { headers: { Authorization: `Bearer ${pendingToken}` } }
            );
            // Token'ı kaydet ve devam et
            Cookies.set('token', pendingToken, { expires: 1 });
            localStorage.setItem('token', pendingToken);
            router.push(`/${locale}/dashboard`);
        } catch {
            setPinError('PIN kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setPinSaving(false);
        }
    };

    // Numpad
    const handleNumpad = (val: string, field: 'pin' | 'confirm') => {
        const setter = field === 'pin' ? setPin : setPinConfirm;
        const current = field === 'pin' ? pin : pinConfirm;
        if (val === '⌫') { setter(current.slice(0, -1)); return; }
        if (current.length >= 6) return;
        setter(current + val);
    };

    const PinDots = ({ value, max = 6 }: { value: string; max?: number }) => (
        <div className="flex gap-3 justify-center my-4">
            {Array.from({ length: max }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200
                    ${i < value.length
                        ? 'bg-indigo-400 scale-110 shadow-lg shadow-indigo-500/40'
                        : 'bg-white/20 border border-white/30'}`}
                />
            ))}
        </div>
    );

    const Numpad = ({ field }: { field: 'pin' | 'confirm' }) => (
        <div className="grid grid-cols-3 gap-2 mt-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
                k === '' ? <div key={i} /> :
                    <button key={i} type="button"
                        onClick={() => handleNumpad(k, field)}
                        className="h-12 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-lg transition-all border border-white/10"
                    >{k}</button>
            ))}
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
            style={{ backgroundImage: "url('/bg.jpg')" }}>
            <div className="absolute inset-0 bg-slate-950/60 z-0 pointer-events-none" />

            {/* ── Giriş Ekranı ── */}
            {screen === 'login' && (
                <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                    <div className="text-center mb-8">
                        <img src="/PosNetX3.png" alt="PosNetX Logo" className="w-96 h-auto mx-auto mb-2 drop-shadow-lg" />
                        <p className="text-slate-300 mt-2 text-sm">{tLogin('subtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">E-posta veya Telefon</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    autoComplete="username"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="admin@admin.com veya 5xx..."
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                />
                                <i className={`fat absolute left-3 top-3.5 text-slate-400 ${identifier.includes('@') ? 'fa-envelope' : identifier.length > 0 ? 'fa-phone' : 'fa-user'}`}></i>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">{tLogin('password')}</label>
                            <input type="password" required
                                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="admin123"
                                value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">{error}</div>
                        )}
                        <button type="submit" disabled={isLoading}
                            className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? `${tLogin('login')}...` : tLogin('login')}
                        </button>
                        <div className="text-center mt-4 text-xs text-slate-400">
                            E-posta: admin@admin.com / admin123
                        </div>
                    </form>
                </div>
            )}

            {/* ── PIN Oluşturma Ekranı ── */}
            {screen === 'create-pin' && (
                <div className="relative z-10 w-full max-w-sm p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 mb-3 shadow-lg">
                            <i className="fat fa-key text-white text-2xl" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">PIN Oluştur</h2>
                        <p className="text-slate-300 mt-1 text-sm">
                            Hoş geldin, <span className="font-bold text-emerald-300">{pendingUser?.firstName}</span>!<br />
                            Sipariş ekranı için bir PIN belirle.
                        </p>
                    </div>

                    {/* PIN */}
                    <div className="mb-4">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 text-center">PIN Kodun</p>
                        <PinDots value={pin} />
                        <Numpad field="pin" />
                    </div>

                    {/* PIN Tekrar */}
                    <div className="mb-4">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 text-center">PIN Tekrar</p>
                        <PinDots value={pinConfirm} />
                        <Numpad field="confirm" />
                    </div>

                    {pinError && (
                        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs text-center mb-3">{pinError}</div>
                    )}

                    <button onClick={handleSavePin} disabled={pinSaving || pin.length < 4}
                        className="w-full py-3.5 rounded-xl text-white font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {pinSaving
                            ? <><i className="fat fa-spinner-third animate-spin" /> Kaydediliyor...</>
                            : <><i className="fat fa-check" /> PIN'i Kaydet ve Giriş Yap</>
                        }
                    </button>
                </div>
            )}
        </div>
    );
}
