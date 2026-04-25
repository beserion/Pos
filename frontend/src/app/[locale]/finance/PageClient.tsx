'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useTranslations, useLocale } from 'next-intl';
import { showSwal, toastSwal } from '../utils/swal';
import SearchableSelect from '@/components/SearchableSelect';

interface Transaction {
    id: number;
    amount: number;
    type: string;
    description: string;
    sourceType?: string;
    paymentMethod: string;
    category?: string;
    createdAt: string;
}

interface Summary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    kasa: number;
    banka: number;
    kart: number;
    count: number;
}

export function PageClient() {
    const { user, loading, hasFeature } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const tCommon = useTranslations('Common');
    const tFinance = useTranslations('Finance');
    
    const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [formData, setFormData] = useState({
        amount: 0, type: 'INCOME', description: '', sourceType: 'SALE',
        paymentMethod: 'KASA', category: 'Satış'
    });

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const calculateLimit = () => {
        if (tableContainerRef.current) {
            // Header(Search): ~70px, Table Header(thead): ~45px, Footer(Pagination): ~70px. 
            // Parent div offset: 255px. Total offset from screen top to tbody start + pagination: ~440px
            const availableHeight = window.innerHeight - 440;
            const rowHeight = 42; // py-1.5 rows
            const calculatedLimit = Math.max(5, Math.floor(availableHeight / rowHeight));
            setLimit(calculatedLimit);
        }
    };

    useEffect(() => {
        calculateLimit();
        window.addEventListener('resize', calculateLimit);
        return () => window.removeEventListener('resize', calculateLimit);
    }, []);

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };

            let url = `${API_URL}/finance/transactions?page=${page}&limit=${limit}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
            if (methodFilter !== 'ALL') url += `&paymentMethod=${methodFilter}`;

            const [txRes, sumRes] = await Promise.all([
                axios.get(url, { headers }),
                axios.get(`${API_URL}/finance/summary`, { headers })
            ]);
            setTransactions(txRes.data.data);
            setTotal(txRes.data.total);
            setLastPage(txRes.data.lastPage);
            setSummary(sumRes.data);
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user && hasFeature('finance_system')) fetchData();
    }, [user, loading, router, locale, page, limit, search, startDate, endDate, typeFilter, methodFilter, hasFeature]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        setPage(1);
    };

    const handleEndDateChange = (val: string) => {
        setEndDate(val);
        setPage(1);
    };

    const openCreateModal = () => {
        setEditingTx(null);
        setFormData({ amount: 0, type: 'INCOME', description: '', sourceType: 'SALE', paymentMethod: 'KASA', category: 'Satış' });
        setIsModalOpen(true);
    };

    const openEditModal = (tx: Transaction) => {
        setEditingTx(tx);
        setFormData({
            amount: tx.amount, type: tx.type, description: tx.description,
            sourceType: tx.sourceType || 'SALE', paymentMethod: tx.paymentMethod,
            category: tx.category || 'Satış'
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.description.trim() || formData.amount <= 0) {
            showSwal({ icon: 'warning', title: 'Uyarı', text: 'Tutar ve açıklama zorunludur.' });
            return;
        }
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            if (editingTx) {
                await axios.put(`${API_URL}/finance/transactions/${editingTx.id}`, formData, { headers });
                toastSwal({ icon: 'success', title: 'Hareket güncellendi!' });
            } else {
                await axios.post(`${API_URL}/finance/transactions`, formData, { headers });
                toastSwal({ icon: 'success', title: 'Yeni hareket oluşturuldu!' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            showSwal({ icon: 'error', title: 'Hata', text: error.response?.data?.message || 'İşlem başarısız.' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            icon: 'warning', title: 'Silmek istediğinize emin misiniz?',
            text: 'Bu işlem geri alınamaz!', showCancelButton: true,
            confirmButtonText: 'Evet, Sil', cancelButtonText: 'İptal'
        });
        if (result?.isConfirmed) {
            try {
                const token = Cookies.get('token');
                await axios.delete(`${API_URL}/finance/transactions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                toastSwal({ icon: 'success', title: 'Hareket silindi!' });
                fetchData();
            } catch (error: any) {
                showSwal({ icon: 'error', title: 'Hata', text: error.response?.data?.message || 'Silme başarısız.' });
            }
        }
    };

    if (loading || !user) return null;

    if (user && !hasFeature('finance_system')) {
        return (
            <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
                <PremiumModuleLocked moduleName="Finans Yönetim Sistemi" featureKey="finance_system" />
            </div>
        );
    }

    const methodLabel = (m: string) => m === 'KASA' ? 'Kasa' : m === 'BANKA' ? 'Banka' : 'Kredi Kartı';
    const methodIcon = (m: string) => m === 'KASA' ? 'fa-cash-register' : m === 'BANKA' ? 'fa-building-columns' : 'fa-credit-card';

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-yellow-500/10 dark:bg-yellow-600/15 blur-[120px] z-0 pointer-events-none"></div>
            <div className="absolute bottom-[0%] right-[5%] w-[30%] h-[30%] rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-[100px] z-0 pointer-events-none"></div>

            <div className="relative z-10 w-full px-6 py-10">
                {/* Header - formtitle rule */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                            <i className="fat fa-coins text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="mb-0 text-2xl font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">{tFinance('title')}</h3>
                            <h5 className="mb-0 text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">{tFinance('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={openCreateModal} className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {tFinance('newTransaction')}
                        </button>
                        <button
                            onClick={() => { setDataLoading(true); fetchData(); }}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-300 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                            title="Yenile"
                        >
                            <i className={`fat fa-arrow-rotate-right text-lg ${dataLoading ? 'animate-spin' : ''}`}></i> YENİLE
                        </button>
                        <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tCommon('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-4">
                    <div
                        onClick={() => { setTypeFilter(typeFilter === 'INCOME' ? 'ALL' : 'INCOME'); setMethodFilter('ALL'); setPage(1); }}
                        className={`bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[32px] border flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer ${typeFilter === 'INCOME' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-white dark:border-slate-700'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tFinance('totalIncome')}</p>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">₺{(summary?.totalIncome || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <i className="fat fa-arrow-trend-up text-2xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => { setTypeFilter(typeFilter === 'EXPENSE' ? 'ALL' : 'EXPENSE'); setMethodFilter('ALL'); setPage(1); }}
                        className={`bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[32px] border flex items-center justify-between transition-all hover:border-red-300 dark:hover:border-red-500/40 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-[0_8px_30px_-5px_rgba(239,68,68,0.3)] hover:scale-[1.02] cursor-pointer ${typeFilter === 'EXPENSE' ? 'ring-2 ring-red-500 border-red-500' : 'border-white dark:border-slate-700'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tFinance('totalExpense')}</p>
                            <h3 className="text-xl font-black text-red-600 dark:text-red-400">₺{(summary?.totalExpense || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                            <i className="fat fa-arrow-trend-down text-2xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => { setTypeFilter('ALL'); setMethodFilter('ALL'); setPage(1); }}
                        className="bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-blue-300 dark:hover:border-blue-500/40 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.02] cursor-pointer"
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tFinance('netBalance')}</p>
                            <h3 className={`text-xl font-black ${(summary?.balance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>₺{(summary?.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <i className="fat fa-scale-balanced text-2xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => { setMethodFilter(methodFilter === 'KASA' ? 'ALL' : 'KASA'); setTypeFilter('ALL'); setPage(1); }}
                        className={`bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[32px] border flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-[0_8px_30px_-5px_rgba(100,116,139,0.3)] hover:scale-[1.02] cursor-pointer ${methodFilter === 'KASA' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-white dark:border-slate-700'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tFinance('kasa')}</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">₺{(summary?.kasa || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            <i className="fat fa-cash-register text-2xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => { setMethodFilter(methodFilter === 'BANKA' ? 'ALL' : 'BANKA'); setTypeFilter('ALL'); setPage(1); }}
                        className={`bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[32px] border flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-[0_8px_30px_-5px_rgba(100,116,139,0.3)] hover:scale-[1.02] cursor-pointer ${methodFilter === 'BANKA' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-white dark:border-slate-700'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tFinance('banka')}</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">₺{(summary?.banka || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            <i className="fat fa-building-columns text-2xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => { setMethodFilter(methodFilter === 'KREDI_KARTI' ? 'ALL' : 'KREDI_KARTI'); setTypeFilter('ALL'); setPage(1); }}
                        className={`bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[32px] border flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-[0_8px_30px_-5px_rgba(100,116,139,0.3)] hover:scale-[1.02] cursor-pointer ${methodFilter === 'KREDI_KARTI' ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-white dark:border-slate-700'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tFinance('creditCard')}</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">₺{(summary?.kart || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            <i className="fat fa-credit-card text-2xl"></i>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/90 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none flex flex-col" style={{ height: 'calc(100vh - 255px)', marginBottom: '0' }}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
                        {/* Title - Left */}
                        <div className="flex-1 min-w-[200px]">
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">{tFinance('tableTitle')}</h2>
                        </div>

                        {/* Search - Center */}
                        <div className="flex-[1.5] flex justify-center max-w-lg">
                            <div className="relative w-full">
                                <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder={tFinance('tableDescription') + '...'}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Filters - Right */}
                        <div className="flex-1 flex items-center justify-end gap-3 min-w-[320px]">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-1.5 shadow-sm">
                                <i className="fat fa-calendar-range text-slate-400 text-sm"></i>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                    className="bg-transparent border-none text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-28 uppercase"
                                />
                                <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                    className="bg-transparent border-none text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-28 uppercase"
                                />
                            </div>
                            <button
                                onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setTypeFilter('ALL'); setMethodFilter('ALL'); setPage(1); }}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                                title={tCommon('clear')}
                            >
                                <i className="fat fa-filter-circle-xmark"></i>
                            </button>
                        </div>
                    </div>
                    <div ref={tableContainerRef} className="flex-1 overflow-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">#</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tFinance('tableDate')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tFinance('tableDescription')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tFinance('tableCategory')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tFinance('tablePaymentMethod')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tFinance('tableType')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{tFinance('tableAmount')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{tFinance('tableActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {dataLoading ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto"></div></td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">{tFinance('noRecord')}</td></tr>
                                ) : transactions.map((tx, index) => (
                                    <tr key={tx.id} className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-all group border-b border-slate-50 dark:border-slate-700/50">
                                        <td className="px-4 py-1.5 text-center text-xs font-bold text-slate-400">
                                            {((page - 1) * limit) + index + 1}
                                        </td>
                                        <td className="px-8 py-1.5 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                                            {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                                            <span className="ml-2 text-xs text-slate-400">{new Date(tx.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-8 py-1.5 font-semibold text-slate-800 dark:text-slate-200">{tx.description}</td>
                                        <td className="px-8 py-1.5 text-slate-500 dark:text-slate-400 text-sm">{tx.category || '-'}</td>
                                        <td className="px-8 py-1.5 text-sm">
                                            {(() => {
                                                const styles: any = {
                                                    'KASA': 'bg-emerald-100/80 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400',
                                                    'BANKA': 'bg-blue-100/80 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400',
                                                    'KREDI_KARTI': 'bg-indigo-100/80 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400',
                                                };
                                                const cls = styles[tx.paymentMethod] || 'bg-slate-100/50 border-slate-200 text-slate-700 dark:bg-slate-700/50 dark:border-slate-700/50 dark:text-slate-300';
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-[10px] uppercase tracking-wider whitespace-nowrap shadow-sm ${cls}`}>
                                                        <i className={`fat ${methodIcon(tx.paymentMethod)} text-xs`}></i>
                                                        {methodLabel(tx.paymentMethod)}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-8 py-1.5">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${tx.type === 'INCOME' ? 'bg-emerald-100/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                {tx.type === 'INCOME' ? tFinance('income') : tFinance('expense')}
                                            </span>
                                        </td>
                                        <td className={`px-8 py-1.5 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tx.type === 'INCOME' ? '+' : '-'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-1.5 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => openEditModal(tx)} className="text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors p-2 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/30">
                                                    <i className="fat fa-pen-to-square text-lg"></i>
                                                </button>
                                                <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30">
                                                    <i className="fat fa-trash text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tCommon('page')}</span>
                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 shadow-sm">
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{page}</span>
                                <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{lastPage}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-backward-step"></i>
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-chevron-left"></i>
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                disabled={page === lastPage}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-chevron-right"></i>
                            </button>
                            <button
                                onClick={() => setPage(lastPage)}
                                disabled={page === lastPage}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all shadow-sm"
                            >
                                <i className="fat fa-forward-step"></i>
                            </button>
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} / {total} {tFinance('recordCount')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <i className="fat fa-coins text-yellow-600"></i>
                                    {editingTx ? 'Hareket Düzenle' : 'Yeni Hesap Hareketi'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Hesap hareket bilgilerini doldurun</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tFinance('labelType')} *</label>
                                    <div className="-m-2 w-full">
                                        <SearchableSelect
                                            value={formData.type}
                                            onChange={(val) => setFormData({ ...formData, type: val.toString() })}
                                            options={[
                                                { value: 'INCOME', label: tFinance('income') },
                                                { value: 'EXPENSE', label: tFinance('expense') }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tFinance('labelAmount')} *</label>
                                    <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tFinance('labelDescription')} *</label>
                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none" placeholder={tFinance('labelDescription')} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tFinance('labelPaymentMethod')}</label>
                                    <div className="-m-2 w-full">
                                        <SearchableSelect
                                            value={formData.paymentMethod}
                                            onChange={(val) => setFormData({ ...formData, paymentMethod: val.toString() })}
                                            options={[
                                                { value: 'KASA', label: tFinance('kasa') },
                                                { value: 'BANKA', label: tFinance('banka') },
                                                { value: 'KREDI_KARTI', label: tFinance('creditCard') }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tFinance('labelCategory')}</label>
                                    <div className="-m-2 w-full">
                                        <SearchableSelect
                                            value={formData.category}
                                            onChange={(val) => setFormData({ ...formData, category: val.toString() })}
                                            options={[
                                                { value: 'Satış', label: tFinance('catSale') },
                                                { value: 'Tahsilat', label: tFinance('catCollection') },
                                                { value: 'Alım', label: tFinance('catPurchase') },
                                                { value: 'Gider', label: tFinance('catExpense') },
                                                { value: 'Maaş', label: tFinance('catSalary') },
                                                { value: 'Kira', label: tFinance('catRent') },
                                                { value: 'Diğer', label: tFinance('catOther') }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                {tCommon('cancel')}
                            </button>
                            <button onClick={handleSave} className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all">
                                {editingTx ? tFinance('updateButton') : tFinance('saveButton')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
