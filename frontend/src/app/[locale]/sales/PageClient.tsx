'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { showSwal, toastSwal } from '../utils/swal';
import { useThemeTransition } from '@/hooks/useThemeTransition';

interface Sale {
    id: number;
    saleNumber?: string;
    tableId?: number;
    tableName?: string;
    totalAmount: number;
    grandTotal: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    userId: number;
    userName?: string;
    note?: string;
}

export function PageClient() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const tc = useTranslations('Common');
    const { theme } = useThemeTransition();

    const [sales, setSales] = useState<Sale[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 30;

    const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) : (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')));

    const fetchSales = async () => {
        setDataLoading(true);
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            // Fetch for today's sales or chosen date
            const res = await fetch(`${API_URL}/sales?startDate=${filterDate}&endDate=${filterDate}T23:59:59&page=${page}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setSales(result.data || []);
                setTotalPages(result.totalPages || 1);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) fetchSales();
    }, [user, loading, filterDate, page]);

    const handleEditSale = async (sale: Sale) => {
        const result = await showSwal({
            title: 'Satış Düzenlensin mi?',
            text: "Bu satış masaya geri yüklenecektir. Mevcut kapalı satış iptal edilip, ürünler masanın adisyonuna eklenecektir.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Evet, Geri Yükle',
            cancelButtonText: 'Vazgeç'
        });

        if (result.isConfirmed) {
            router.push(`/${locale}/pos?restoreSaleId=${sale.id}&tableId=${sale.tableId}`);
        }
    };

    const handleDeleteSale = async (id: number) => {
        const result = await showSwal({
            title: tc('areYouSure') || 'Emin misiniz?',
            text: "Bu satış kalıcı olarak silinecektir!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'Hayır'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token') || (user as any)?.token;
                const res = await fetch(`${API_URL}/sales/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    toastSwal({ icon: 'success', title: 'Satış silindi.' });
                    fetchSales();
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleEndOfDay = async () => {
        const result = await showSwal({
            title: 'Gün Sonu Al',
            html: '<div class="text-left py-2">' +
                '<p class="text-sm text-slate-500 mb-2">Bugünkü <b>Tamamlanmış</b> satışlarınızın nakit ve kart dökümleri ayrılarak kasaya işlenecektir.</p>' +
                '<p class="text-xs font-bold text-rose-500 border-l-2 border-rose-500 pl-2 bg-rose-50 dark:bg-rose-500/10 py-1 uppercase">Bu işlem geri alınamaz.</p>' +
                '</div>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Evet, Gün Sonunu Al',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#4f46e5',
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token') || (user as any)?.token;
                const res = await fetch(API_URL + '/sales/end-of-day', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({ userId: user?.id || (user as any)?.sub })
                });

                if (!res.ok) throw new Error('Gün sonu sunucu hatası');
                const data = await res.json();
                const { cashTotal, cardTotal, bankTotal, grandTotal, date } = data;

                if (grandTotal === 0) {
                    toastSwal({ icon: 'info', title: 'Kapatılacak satış bulunamadı.' });
                    return;
                }

                await showSwal({
                    title: 'Gün Sonu Raporu',
                    html: '<div class="text-left w-full space-y-3">' +
                        '<div class="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">' +
                        '<div class="flex justify-between items-center mb-1">' +
                        '<div class="text-xs font-bold text-slate-400 uppercase tracking-widest">Tarih</div>' +
                        '<div class="text-sm font-black text-slate-700 dark:text-slate-200">' + date + '</div>' +
                        '</div></div>' +
                        '<div class="grid grid-cols-2 gap-3">' +
                        '<div class="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">' +
                        '<div class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Nakit</div>' +
                        '<div class="text-xl font-black text-emerald-700 dark:text-emerald-300">₺' + cashTotal + '</div>' +
                        '</div>' +
                        '<div class="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">' +
                        '<div class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Kart</div>' +
                        '<div class="text-xl font-black text-indigo-700 dark:text-indigo-300">₺' + cardTotal + '</div>' +
                        '</div></div>' +
                        (bankTotal > 0 ?
                            '<div class="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">' +
                            '<div class="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Banka</div>' +
                            '<div class="text-xl font-black text-blue-700 dark:text-blue-300">₺' + bankTotal + '</div>' +
                            '</div>' : '') +
                        '<div class="p-5 bg-slate-900 rounded-[28px] text-center shadow-xl">' +
                        '<div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Toplam Gün Sonu</div>' +
                        '<div class="text-3xl font-black text-white">₺' + grandTotal + '</div>' +
                        '</div></div>',
                    icon: 'success',
                });

                fetchSales();
            } catch (error) {
                console.error('Error in End of Day:', error);
                showSwal({ icon: 'error', title: 'Hata', text: 'Gün sonu işlemi tamamlanamadı.' });
            }
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    };

    const getSaleTotal = (sale: Sale) => {
        let total = Number(sale.totalAmount || 0);
        if (total === 0 && (sale as any).items && (sale as any).items.length > 0) {
            total = (sale as any).items.reduce((sum: number, i: any) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);
        }
        return total;
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden font-sans">
             {/* Decorative Background Accents */}
             <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none"></div>

            {/* Header Area */}
            <header className="px-8 py-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-b border-white/20 dark:border-slate-800 flex items-center shrink-0 relative z-20 transition-all">
                {/* Left Section - Premium Title like Admin Orders */}
                <div className="flex items-center gap-5 w-1/3">
                    <div className="w-14 h-14 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center shadow-sm shrink-0">
                        <i className="fat fa-receipt text-3xl"></i>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-tight text-rose-500 leading-none">SATIŞ LİSTESİ</h3>
                        <h5 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1.5 leading-none">Günlük işlem dökümü</h5>
                    </div>
                </div>

                {/* Center Section - Search (Stay Centered) */}
                <div className="flex justify-center w-1/3 px-4">
                    <div className="relative group w-full max-w-[450px]">
                        <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors"></i>
                        <input
                            type="text"
                            placeholder="Masa veya İşlem Ara..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all text-center"
                        />
                    </div>
                </div>

                {/* Right Section - Date Filter & Home Button */}
                <div className="flex items-center justify-end gap-3 w-1/3">
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 gap-3 shadow-sm hover:border-rose-400 transition-all">
                        <i className="fat fa-calendar text-rose-500"></i>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                            className="bg-transparent text-[11px] font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        />
                    </div>
                    <button onClick={handleEndOfDay} className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 border border-slate-700 min-w-max" title="Gün Sonu Al">
                        <i className={`fat fa-moon-stars text-lg text-indigo-400`}></i> 
                        <span className="hidden lg:inline">GÜN SONU AL</span>
                    </button>
                    <button onClick={() => { setPage(1); fetchSales(); }} className="px-5 py-3 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-200 dark:border-rose-500/20 active:scale-95 gap-2 font-black text-[10px] uppercase tracking-widest" title="Yenile">
                        <i className={`fat fa-arrow-rotate-right text-lg ${dataLoading ? 'animate-spin' : ''}`}></i>
                        YENİLE
                    </button>
                    <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-5 py-3 bg-white dark:bg-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 shadow-sm group">
                        <i className="fat fa-home text-lg group-hover:scale-110"></i> ANA MENÜ
                    </button>
                </div>
            </header>

            {/* List Area */}
            <main className="flex-1 p-6 overflow-hidden flex flex-col relative z-10">
                <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] border border-white/50 dark:border-white/5 shadow-2xl flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl z-20">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-[150px]">İŞLEM NO</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-[100px]">SAAT</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-[200px]">LOKASYON</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-auto">AÇIKLAMA</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-[150px]">ÖDEME</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-[150px]">DURUM</th>
                                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 text-right w-[150px]">TUTAR</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700/50 w-[120px]">İŞLEM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <i className="fat fa-receipt text-5xl text-slate-300"></i>
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                    {dataLoading ? 'Yükleniyor...' : 'Kayıt Bulunamadı'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sales
                                    .filter(s => (s.tableName?.toLowerCase().includes(filterSearch.toLowerCase())) || String(s.id).includes(filterSearch))
                                    .map((sale) => (
                                        <tr key={sale.id} className="hover:bg-rose-500/[0.03] dark:hover:bg-rose-500/[0.05] transition-all group border-b border-slate-50 dark:border-slate-800/20">
                                            <td className="px-5 py-2 truncate">
                                               <span className="font-extrabold text-slate-700 dark:text-slate-200 tabular-nums">#{sale.id}</span>
                                            </td>
                                            <td className="px-5 py-2 truncate">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">{formatDate(sale.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-2 truncate">
                                                <span className="inline-flex items-center px-3 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase border border-rose-100 dark:border-rose-500/20 truncate">{sale.tableName || 'Masa Belirsiz'}</span>
                                            </td>
                                            <td className="px-5 py-2 truncate">
                                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic truncate" title={sale.note || ''}>{sale.note || '-'}</span>
                                            </td>
                                            <td className="px-5 py-2 truncate">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate">{sale.paymentMethod === 'CASH' ? 'Nakit' : sale.paymentMethod === 'CREDIT_CARD' ? 'Kart' : sale.paymentMethod || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-2 text-left">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${sale.status === 'PAID' || sale.status === 'COMPLETED' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/5 border-amber-500/20 text-amber-500'}`}>
                                                    {sale.status === 'PAID' || sale.status === 'COMPLETED' ? 'Tamamlandı' : sale.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-2 text-right">
                                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(getSaleTotal(sale))}</span>
                                            </td>
                                            <td className="px-5 py-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditSale(sale)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100 dark:border-emerald-500/20 active:scale-95"
                                                        title="Geri Yükle"
                                                    >
                                                        <i className="fat fa-arrow-rotate-left text-xs"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteSale(sale.id)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 dark:border-rose-500/20 active:scale-95"
                                                        title="İptal"
                                                    >
                                                        <i className="fat fa-trash text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Summary & Pagination Footer */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/50 shrink-0 flex items-center justify-between">
                        {/* Left: Info */}
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <i className="fat fa-circle-info text-rose-500"></i>
                            KDV Dahil Toplamlar
                        </div>

                        {/* Center: Pagination */}
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sayfa: {page} / {totalPages}</span>
                            <div className="flex gap-1.5">
                                <button 
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-rose-600 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-90"
                                >
                                    <i className="fat fa-chevron-left text-xs"></i>
                                </button>
                                <button 
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-rose-600 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm active:scale-90"
                                >
                                    <i className="fat fa-chevron-right text-xs"></i>
                                </button>
                            </div>
                        </div>

                        {/* Right: Total Amount */}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-right">Toplam Hasılat</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                                {formatCurrency(sales.filter(s => s.status === 'COMPLETED' || s.status === 'PAID').reduce((sum, s) => sum + getSaleTotal(s), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
