'use client';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

export default function LoginPage() {
    const tCommon = useTranslations('Common');
    const tLogin = useTranslations('Login');
    const locale = useLocale();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await login(email, password);
            router.push(`/${locale}/dashboard`);
        } catch (err) {
            setError(tCommon('error') === 'Hata' ? 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.' : 'Login failed. Please check your credentials.');
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
            style={{ backgroundImage: "url('/cafe-bg.png')" }}
        >
            {/* Dark Overlay for better contrast */}
            <div className="absolute top-0 left-0 w-full h-full bg-slate-950/60 z-0 pointer-events-none"></div>


            {/* Login Kartı (Glassmorphism) */}
            <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Antigravity<span className="text-indigo-400">POS</span></h1>
                    <p className="text-slate-300 mt-2 text-sm">{tLogin('subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{tLogin('email')}</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="admin@antigravity.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{tLogin('password')}</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? `${tLogin('login')}...` : tLogin('login')}
                    </button>

                    <div className="text-center mt-4 text-xs text-slate-400">
                        Test için: admin@antigravity.com / 123456
                    </div>
                </form>
            </div>
        </div>
    );
}
