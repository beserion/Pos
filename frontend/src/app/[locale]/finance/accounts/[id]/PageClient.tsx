'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../AuthContext';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useTranslations, useLocale } from 'next-intl';
import { showSwal } from '../../../utils/swal';

interface CompanyAccount {
    id: number;
    name: string;
    type: string;
    accountNumber?: string;
    iban?: string;
    balance: number;
    currency: string;
    isActive: boolean;
}

interface Transaction {
    id: number;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
    paymentMethod: string;
    documentNumber?: string;
    sourceType?: string;
    partner?: {
        id: number;
        name: string;
    };
}

export function PageClient() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const locale = useLocale();
    const tCommon = useTranslations('Common');
    const tFinance = useTranslations('Finance');
    const API_URL = 'http://localhost:3050';

    const [account, setAccount] = useState<CompanyAccount | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const calculateLimit = () => {
        if (tableContainerRef.current) {
            const containerHeight = tableContainerRef.current.offsetHeight;
            const rowHeight = 72; // py-4 rows
            const calculatedLimit = Math.max(5, Math.floor((containerHeight - 45) / rowHeight));
            setLimit(calculatedLimit);
        }
    };

    useEffect(() => {
        calculateLimit();
        window.addEventListener('resize', calculateLimit);
        return () => window.removeEventListener('resize', calculateLimit);
    }, [account]);

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [accRes, txRes] = await Promise.all([
                axios.get(`${API_URL}/finance/accounts/${params.id}`, { headers }),
                axios.get(`${API_URL}/finance/accounts/${params.id}/transactions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, { headers })
            ]);
            setAccount(accRes.data);
            setTransactions(txRes.data.data);
            setTotal(txRes.data.total);
            setLastPage(txRes.data.lastPage);
        } catch (error) {
            console.error('Error fetching account details:', error);
            showSwal({ icon: 'error', title: 'Hata', text: 'Hesap bilgileri yüklenemedi.' });
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user && params.id) fetchData();
    }, [user, loading, params.id, page, limit, search]);

    if (loading || dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!account) return null;

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 relative overflow-hidden flex flex-col">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full px-[50px] pt-6 pb-0 flex-none">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center">
                        <i className={`fat ${
                            account.type === 'CASH' ? 'fa-money-bill-wave' :
                            account.type === 'BANK' ? 'fa-building-columns' :
                            'fa-credit-card'
                        } me-3 ${
                            account.type === 'CASH' ? 'text-emerald-600 dark:text-emerald-400' :
                            account.type === 'BANK' ? 'text-blue-600 dark:text-blue-400' :
                            'text-indigo-600 dark:text-indigo-400'
                        }`} style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className={`mb-0 text-3xl font-extralight leading-none uppercase tracking-[0.25em] ${
                                account.type === 'CASH' ? 'text-emerald-600 dark:text-emerald-400' :
                                account.type === 'BANK' ? 'text-blue-600 dark:text-blue-400' :
                                'text-indigo-600 dark:text-indigo-400'
                            }`}>{account.name}</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">HESAP HAREKETLERİ</h5>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/${locale}/finance/accounts`)}
                            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* KPI Cards Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-5">
                    {/* Account Name Card */}
                    <div className={`bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-[32px] border border-white dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] shadow-2xl ${
                        account.type === 'CASH' ? 'shadow-emerald-500/20 dark:shadow-emerald-500/10 hover:shadow-emerald-500/30' :
                        account.type === 'BANK' ? 'shadow-blue-500/20 dark:shadow-blue-500/10 hover:shadow-blue-500/30' :
                        'shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:shadow-indigo-500/30'
                    }`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hesap Adı</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{account.name}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            account.type === 'CASH' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' :
                            account.type === 'BANK' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' :
                            'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10'
                        }`}>
                            <i className={`fat ${
                                account.type === 'CASH' ? 'fa-shop' :
                                account.type === 'BANK' ? 'fa-building-columns' :
                                'fa-credit-card'
                            } text-xl`}></i>
                        </div>
                    </div>

                    {/* Account Type Card */}
                    <div className={`bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-[32px] border border-white dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] shadow-2xl ${
                        account.type === 'CASH' ? 'shadow-emerald-500/20 dark:shadow-emerald-500/10 hover:shadow-emerald-500/30' :
                        account.type === 'BANK' ? 'shadow-blue-500/20 dark:shadow-blue-500/10 hover:shadow-blue-500/30' :
                        'shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:shadow-indigo-500/30'
                    }`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hesap Türü</p>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                                {account.type === 'CASH' ? 'Kasa' : account.type === 'BANK' ? 'Banka' : 'POS'}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
                            <i className="fat fa-layer-group text-xl"></i>
                        </div>
                    </div>

                    {/* Account Number Card */}
                    <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-[32px] border border-white dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5 hover:shadow-blue-500/20">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hesap No</p>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{account.accountNumber || '-'}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
                            <i className="fat fa-list-ol text-xl"></i>
                        </div>
                    </div>

                    {/* IBAN Card */}
                    <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-[32px] border border-white dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5 hover:shadow-blue-500/20">
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IBAN</p>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono truncate">{account.iban || '-'}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0 ml-2">
                            <i className="fat fa-id-card text-xl"></i>
                        </div>
                    </div>

                    {/* Balance Card */}
                    <div className={`bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl p-4 rounded-[32px] border border-white dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] shadow-2xl ${
                        Number(account.balance) >= 0 ? 'shadow-emerald-500/20 dark:shadow-emerald-500/10 hover:shadow-emerald-500/30' : 'shadow-rose-500/20 dark:shadow-rose-500/10 hover:shadow-rose-500/30'
                    }`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mevcut Bakiye</p>
                            <h3 className={`text-xl font-black ${Number(account.balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {Number(account.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {account.currency}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 shrink-0">
                            <i className="fat fa-scale-balanced text-xl"></i>
                        </div>
                    </div>
                </div>

                </div>

            {/* Transactions Table Section */}
            <div className="flex-1 px-[50px] pb-6 overflow-hidden flex flex-col">
                <div className="bg-white dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
                        {/* Title - Left */}
                        <div className="flex-1 min-w-[200px]">
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-0">Hesap Hareketleri</h2>
                        </div>

                        {/* Search Bar - Center */}
                        <div className="flex-1 flex justify-center min-w-[300px]">
                            <div className="relative w-full max-w-md">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Hareket Ara (Açıklama, Cari...)"
                                    className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full shadow-inner"
                                />
                                <i className="fat fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            </div>
                        </div>

                        {/* Record Count - Right */}
                        <div className="flex-1 flex justify-end min-w-[200px]">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {total} {tFinance('recordCount')}
                            </div>
                        </div>
                    </div>
                    <div ref={tableContainerRef} className="flex-1 overflow-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md">
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Belge No</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Cari Hesap</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Yöntem</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <i className="fat fa-receipt text-6xl mb-4"></i>
                                                <p className="text-lg font-bold uppercase tracking-widest">Henüz bir hareket bulunmuyor</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all group">
                                            <td className="px-8 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(tx.createdAt).toLocaleDateString('tr-TR')}</div>
                                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date(tx.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                {tx.documentNumber ? (
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono tracking-tighter">
                                                        {tx.documentNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400/50 italic">-</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4">
                                                {tx.partner ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-black">
                                                            {tx.partner.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tx.partner.name}</span>
                                                    </div>
                                                ) : (tx.description.toLowerCase().includes('bakiyesi') || tx.sourceType === 'TRANSFER') ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black">
                                                            {account?.name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{account?.name}</span>
                                                    </div>
                                                ) : tx.sourceType === 'SALE' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[10px] font-black italic">
                                                            PM
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Perakende Müşteri</span>
                                                    </div>
                                                ) : tx.type === 'EXPENSE' ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center text-[10px] font-black italic">
                                                            GT
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Genel Tedarikçi</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Genel İşlem</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                        tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'
                                                    }`}>
                                                        <i className={`fat ${tx.type === 'INCOME' ? 'fa-arrow-up' : 'fa-arrow-down'} text-xs`}></i>
                                                    </div>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{tx.description}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                    {tx.paymentMethod === 'KASA' ? 'Kasa' : tx.paymentMethod === 'BANKA' ? 'Banka' : 'Kredi Kartı'}
                                                </span>
                                            </td>
                                            <td className={`px-8 py-4 text-right font-black text-lg ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {account.currency}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tCommon('page')}</span>
                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 shadow-sm">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{page}</span>
                                <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{lastPage}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-backward-step"></i>
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-chevron-left"></i>
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                disabled={page === lastPage}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-chevron-right"></i>
                            </button>
                            <button
                                onClick={() => setPage(lastPage)}
                                disabled={page === lastPage}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-forward-step"></i>
                            </button>
                        </div>
                        <div className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} / {total}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
