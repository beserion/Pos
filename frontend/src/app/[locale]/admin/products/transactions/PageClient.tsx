'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import SearchableSelect from '@/components/SearchableSelect';

interface ProductTransaction {
    id: number;
    productId: number;
    productName: string;
    businessDate: string;
    orderId: number;
    qty: number;
    price: number;
    type: 'sale' | 'void' | 'return';
    status: 'completed' | 'pending' | 'cancelled';
    userId?: number;
    createdAt: string;
}

export function PageClient() {
    const t = useTranslations('Products');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<ProductTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<ProductTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    useEffect(() => {
        if (user?.token) {
            fetchTransactions();
        }
    }, [user]);

    const fetchTransactions = async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const res = await axios.get(`${API_URL}/products/transactions`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setTransactions(res.data);
            setFilteredTransactions(res.data);
        } catch (error) {
            console.error('Error fetching transactions', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let filtered = transactions;
        
        if (searchQuery) {
            const low = searchQuery.toLowerCase();
            filtered = filtered.filter(tr => 
                tr.productName.toLowerCase().includes(low) || 
                tr.orderId.toString().includes(low)
            );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(tr => tr.type === typeFilter);
        }

        setFilteredTransactions(filtered);
    }, [searchQuery, typeFilter, transactions]);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'sale': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'void': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'return': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-history me-3 text-teal-600 dark:text-teal-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-teal-600 dark:text-teal-400 leading-none uppercase tracking-[0.25em]">İŞLEM GEÇMİŞİ</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Ürün Satış ve Hareket Kayıtları</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ürün veya Sipariş No..."
                                className="w-64 pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow"
                            />
                        </div>
                        <div className="w-40">
                            <SearchableSelect
                                value={typeFilter}
                                onChange={(val) => setTypeFilter(val)}
                                options={[
                                    { value: 'all', label: 'Tüm Tipler' },
                                    { value: 'sale', label: 'Satış' },
                                    { value: 'void', label: 'İptal' },
                                    { value: 'return', label: 'İade' }
                                ]}
                            />
                        </div>
                        <button onClick={() => router.push(`/${locale}/admin/products`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-2xl">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TARİH</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÜRÜN</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ NO</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">TİP</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ADET</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">TUTAR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredTransactions.map(tr => (
                                        <tr key={tr.id} className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-all group">
                                            <td className="px-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                                        {new Date(tr.businessDate).toLocaleDateString('tr-TR')}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {new Date(tr.createdAt).toLocaleTimeString('tr-TR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 font-black group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-bowl-food"></i>
                                                    </div>
                                                    <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                        {tr.productName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-500/20">
                                                    #{tr.orderId}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${getTypeColor(tr.type)}`}>
                                                    {tr.type === 'sale' ? 'SATIŞ' : tr.type === 'void' ? 'İPTAL' : 'İADE'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{tr.qty}</span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <span className={`text-md font-black ${tr.type === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                    {tr.type === 'sale' ? '+' : '-'}₺{tr.price.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">İşlem kaydı bulunamadı</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
