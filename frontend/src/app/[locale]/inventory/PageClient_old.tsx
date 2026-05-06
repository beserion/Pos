'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useLocale, useTranslations } from 'next-intl';
import { showSwal, toastSwal } from '../utils/swal';
import StockUpsert from './_StockUpsert';

interface AppStock {
    id: number;
    stockCardId: number;
    name: string;
    sku: string;
    qty: number;
    price: number;
    location: string;
    status: string;
    lotNumber?: string;
    barcode?: string;
    description?: string;
    expirationDate?: string;
}

export function PageClient() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');

    const [stocks, setStocks] = useState<AppStock[]>([]);
    const [stats, setStats] = useState({ total: 0, warning: 0, empty: 0 });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [isFetching, setIsFetching] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({
        id: 0,
        stockCardId: 0,
        quantity: 0,
        location: '',
        lotNumber: '',
        barcode: '',
        description: '',
        expirationDate: ''
    });

    const fetchStocks = async () => {
        try {
            setIsFetching(true);
            const token = Cookies.get('token');
            const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + '/stocks', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page,
                    limit,
                    search: search || undefined,
                    location: selectedLocation || undefined
                }
            });

            const { data, stats: serverStats, total: serverTotal, lastPage: serverLastPage } = res.data;

            const formattedData = data.map((s: any) => {
                const qty = Number(s.quantity);
                const minLevel = Number(s.stockCard?.minStockLevel || 5);
                let status = 'Yeterli';
                if (qty <= 0) status = 'Tükendi';
                else if (qty <= minLevel) status = 'Kritik';

                return {
                    id: s.id,
                    stockCardId: s.stockCard?.id,
                    name: s.stockCard?.name || 'Bilinmeyen Stok',
                    sku: s.stockCard?.sku || s.stockCard?.code || '-',
                    qty: qty,
                    price: Number(s.stockCard?.costPerBaseUnit || 0),
                    location: s.location,
                    status: status,
                    lotNumber: s.lotNumber,
                    barcode: s.barcode,
                    description: s.description,
                    expirationDate: s.expirationDate ? new Date(s.expirationDate).toISOString().split('T')[0] : ''
                };
            });

            setStocks(formattedData);
            setStats(serverStats);
            setTotal(serverTotal);
            setLastPage(serverLastPage);
            setIsFetching(false);
        } catch (error) {
            console.error('Error fetching stocks:', error);
            setIsFetching(false);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(process.env.NEXT_PUBLIC_API_URL + '/warehouses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWarehouses(res.data);
        } catch (error) {
            console.error('Error fetching warehouses:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = Cookies.get('token');
            const data = {
                ...formData,
                stockCard: { id: formData.stockCardId }
            };

            if (formData.id === 0) {
                await axios.post(process.env.NEXT_PUBLIC_API_URL + '/stocks', data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/stocks/${formData.id}`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            toastSwal({ icon: 'success', title: tc('success') });
            setIsModalOpen(false);
            fetchStocks();
        } catch (error: any) {
            showSwal({ icon: 'error', title: tc('error'), text: error.response?.data?.message || 'Kaydedilemedi' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: tc('confirmTitle'),
            text: tc('confirmDelete'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('yes'),
            cancelButtonText: tc('no')
        });

        if (result.isConfirmed) {
            try {
                const token = Cookies.get('token');
                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/stocks/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSwal({ icon: 'success', title: tc('success') });
                fetchStocks();
            } catch (error) {
                showSwal({ icon: 'error', title: tc('error'), text: 'Silinemedi' });
            }
        }
    };

    const openModal = (stock?: AppStock) => {
        if (stock) {
            setFormData({
                id: stock.id,
                stockCardId: stock.stockCardId,
                quantity: stock.qty,
                location: stock.location,
                lotNumber: stock.lotNumber || '',
                barcode: stock.barcode || '',
                description: stock.description || '',
                expirationDate: stock.expirationDate || ''
            });
        } else {
            setFormData({
                id: 0,
                stockCardId: 0,
                quantity: 0,
                location: '',
                lotNumber: '',
                barcode: '',
                description: '',
                expirationDate: ''
            });
        }
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) {
            fetchStocks();
            fetchWarehouses();
        }
    }, [user, loading, router, page, limit, search, selectedLocation]);

    useEffect(() => {
        const calculateLimit = () => {
            if (containerRef.current) {
                const availableHeight = containerRef.current.offsetHeight;
                const tableHeaderHeight = 56; // Reduced from 64
                const rowHeight = 46; // Reduced from 62
                const calculatedLimit = Math.floor((availableHeight - tableHeaderHeight) / rowHeight);
                const finalLimit = Math.max(calculatedLimit, 5);
                if (finalLimit !== limit) {
                    setLimit(finalLimit);
                }
            }
        };

        const timer = setTimeout(calculateLimit, 100);
        window.addEventListener('resize', calculateLimit);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateLimit);
        };
    }, []);

    if (loading || !user) return null;

    return (
        <div className="h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 flex flex-col">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/20 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 dark:bg-teal-600/20 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>

            <div className="relative z-10 w-full px-[50px] pt-8 pb-4 flex-none">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center">
                        <i className="fat fa-boxes-stacked me-3 text-emerald-600 dark:text-emerald-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-emerald-600 dark:text-emerald-400 leading-none uppercase tracking-[0.25em]">Envanter & Stok</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Depo durumunu takip edin ve yönetin.</h5>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/${locale}/admin/stock-cards`)}
                            className="px-6 py-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-boxes-stacked"></i> Stok Kartları
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/inventory/movements`)}
                            className="px-6 py-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-exchange text-lg"></i> Stok Hareketleri
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/inventory/count`)}
                            className="px-6 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-list-check text-lg"></i> Sayım Ekranı
                        </button>
                        <button
                            onClick={() => openModal()}
                            className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-plus-circle text-lg"></i> Stok Girişi
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/dashboard`)}
                            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* Dashboard Stats (Glassmorphism) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-md shadow-slate-200/20 dark:shadow-none flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toplam Kalem</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.total}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/5 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-md shadow-amber-500/10 flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Kritik Stok</p>
                            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.warning}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-md shadow-red-500/10 flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tükenenler</p>
                            <h3 className="text-2xl font-black text-red-600 dark:text-red-400">{stats.empty}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/5 text-red-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section (Glassmorphism) */}
            <div className="flex-1 px-[50px] pb-6 overflow-hidden flex flex-col">
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] border border-white/50 dark:border-slate-700/50 shadow-xl overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-4 bg-white/30 dark:bg-slate-900/30">
                        {/* Title - Left */}
                        <div className="flex-1 min-w-[200px]">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-0">Stok Hareketleri</h2>
                        </div>

                        {/* Search Bar - Center */}
                        <div className="flex-1 flex justify-center min-w-[300px]">
                            <div className="relative w-full max-w-md">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Ürün veya SKU Ara..."
                                    className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all w-full shadow-inner"
                                />
                                <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>

                        {/* Warehouse Dropdown - Right */}
                        <div className="flex-1 flex justify-end min-w-[200px]">
                            <div className="relative w-48 shrink-0">
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner appearance-none cursor-pointer"
                                    title="Depo Seçiniz"
                                >
                                    <option value="">Tüm Depolar</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.name}>{w.name}</option>
                                    ))}
                                </select>
                                <i className="fat fa-warehouse absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <i className="fat fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
                            </div>
                        </div>
                    </div>

                    <div ref={containerRef} className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 w-16 text-center">#</th>
                                    <th className="px-6 py-3">Stok Kartı</th>
                                    <th className="px-6 py-3">SKU / Kod</th>
                                    <th className="px-6 py-3">Depo Konumu</th>
                                    <th className="px-6 py-3 text-center">Durum</th>
                                    <th className="px-6 py-3 text-right">Miktar</th>
                                    <th className="px-6 py-3 text-right">Maliyet</th>
                                    <th className="px-6 py-3 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                {isFetching ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
                                                <span className="text-slate-400 text-sm font-medium">Veriler yükleniyor...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : stocks.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-medium">
                                            Stok kaydı bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    stocks.map((s, idx) => (
                                        <tr key={s.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors group">
                                            <td className="px-6 py-2 text-center text-slate-400 font-mono text-xs w-16">
                                                {(page - 1) * limit + idx + 1}
                                            </td>
                                            <td className="px-6 py-2">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 block">{s.name}</span>
                                            </td>
                                            <td className="px-6 py-2 text-slate-500 dark:text-slate-400 text-sm">{s.sku}</td>
                                            <td className="px-6 py-2 text-slate-500 dark:text-slate-400 text-sm">{s.location}</td>
                                            <td className="px-6 py-2">
                                                <span className={`inline-flex px-3 py-0.5 text-[10px] font-black uppercase rounded-full border ${s.status === 'Yeterli' ? 'bg-emerald-100/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                    s.status === 'Kritik' ? 'bg-amber-100/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-100/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-700 dark:text-red-400'
                                                    }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 text-right">
                                                <span className="inline-block font-mono text-slate-700 dark:text-slate-200 font-bold bg-slate-100/50 dark:bg-slate-700 rounded-lg py-1 px-3 border border-slate-200/50 dark:border-slate-700">{s.qty}</span>
                                            </td>
                                            <td className="px-6 py-2 text-right">
                                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                                    ₺{(s.price || 0).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => openModal(s)}
                                                        className="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                                    >
                                                        <i className="fat fa-pen-to-square text-lg"></i>
                                                    </button>
                                                    {user?.role === 'ADMIN' && (
                                                        <button
                                                            onClick={() => handleDelete(s.id)}
                                                            className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/30"
                                                        >
                                                            <i className="fat fa-trash-can text-lg"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span>
                            <span>kayıt bulundu</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                                title={t('firstPage') || 'First Page'}
                            >
                                <i className="fat fa-angles-left"></i>
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                            >
                                <i className="fat fa-angle-left"></i>
                            </button>

                            <div className="h-10 px-4 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{page}</span>
                                <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{lastPage}</span>
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                disabled={page === lastPage}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                            >
                                <i className="fat fa-angle-right"></i>
                            </button>
                            <button
                                onClick={() => setPage(lastPage)}
                                disabled={page === lastPage}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                                title={t('lastPage') || 'Last Page'}
                            >
                                <i className="fat fa-angles-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-emerald-600`}></i>
                                    {formData.id === 0 ? 'Yeni Stok Girişi' : 'Stok Kaydını Düzenle'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Stok kartı bazlı stok verilerini yönetin</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <StockUpsert
                                formData={formData}
                                setFormData={setFormData}
                                onSave={handleSave}
                                onClose={() => setIsModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
