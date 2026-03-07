'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [stocks] = useState([
        { id: 1, name: 'Espresso Kahve Çekirdeği (1KG)', sku: 'CF-ESP-01', qty: 24, location: 'Ana Depo', status: 'Yeterli' },
        { id: 2, name: 'Süt (1L x 12)', sku: 'MILK-01', qty: 5, location: 'Dolap 1', status: 'Kritik' },
        { id: 3, name: 'Cheesecake Dilimi', sku: 'DK-CHE-01', qty: 12, location: 'Dolap 2', status: 'Yeterli' },
        { id: 4, name: 'Limonata Konsantresi', sku: 'BV-LIM-01', qty: 0, location: 'Ana Depo', status: 'Tükendi' },
    ]);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading || !user) return null;

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/20 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 dark:bg-teal-600/20 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute top-[30%] right-[30%] w-[20%] h-[20%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[80px] z-0 pointer-events-none transition-colors duration-500"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-boxes-stacked me-3 text-emerald-600 dark:text-emerald-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-emerald-600 dark:text-emerald-400 leading-none uppercase tracking-[0.25em]">Envanter & Stok</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Depo durumunu takip edin ve yönetin.</h5>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-5 py-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-white/80 dark:hover:bg-slate-700/80 transition-colors shadow-sm">
                            Dışa Aktar
                        </button>
                        <button className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Ürün Girişi
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-arrow-left"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* Dashboard Stats (Glassmorphism) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-none flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toplam Ürün</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">1,248</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/5 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl shadow-amber-500/10 flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Kritik Stok</p>
                            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">24</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl shadow-red-500/10 flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tükenenler</p>
                            <h3 className="text-2xl font-black text-red-600 dark:text-red-400">5</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/5 text-red-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Table Section (Glassmorphism) */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl overflow-hidden transition-colors">
                    <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Stok Hareketleri</h2>
                        {/* Search Bar */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Ürün veya SKU Ara..."
                                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all w-64 shadow-inner"
                            />
                            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-sm transition-colors backdrop-blur-sm">
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Ürün Adı</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">SKU (Barkod)</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider text-center">Miktar</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Depo Modülü</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                {stocks.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{s.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{s.sku}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="block font-mono text-slate-700 dark:text-slate-200 font-bold bg-slate-100/50 dark:bg-slate-700 rounded-lg py-1 px-2 border border-slate-200/50 dark:border-slate-700">{s.qty}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{s.location}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${s.status === 'Yeterli' ? 'bg-emerald-100/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                s.status === 'Kritik' ? 'bg-amber-100/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-700 dark:text-red-400'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
