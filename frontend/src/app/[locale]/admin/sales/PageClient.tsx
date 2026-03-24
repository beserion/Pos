'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useAuth } from '@/app/[locale]/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { useCallback } from 'react';

interface SaleItem {
    id: number;
    product: { name: string };
    quantity: number;
    unitPrice: number;
    note?: string;
}

interface Sale {
    id: number;
    status: string;
    totalAmount: number;
    table?: { name: string };
    waiter?: { firstName: string, lastName: string, name?: string, email: string };
    items: SaleItem[];
    createdAt: string;
    tableName?: string; // QuickSale etc.
    partner?: { name: string };
}

export function PageClient() {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [totalSales, setTotalSales] = useState(0);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterTable, setFilterTable] = useState('ALL');
    const [filterWaiter, setFilterWaiter] = useState('ALL');
    const [allTables, setAllTables] = useState<any[]>([]);
    const [allWaiters, setAllWaiters] = useState<any[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [limit, setLimit] = useState(10);

    const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

    const fetchInitialData = async () => {
        try {
            const token = Cookies.get('token');
            const [tablesRes, usersRes] = await Promise.all([
                axios.get(API_URL + '/tables', { headers: { Authorization: 'Bearer ' + token } }),
                axios.get(API_URL + '/users', { headers: { Authorization: 'Bearer ' + token } })
            ]);
            setAllTables(tablesRes.data);
            setAllWaiters(usersRes.data);
        } catch (error) {
            console.error('Error fetching filter data:', error);
        }
    };

    const fetchSales = useCallback(async () => {
        try {
            setLoading(true);
            const token = Cookies.get('token');
            const params: any = {
                page,
                limit,
                status: filterStatus === 'ALL' ? undefined : filterStatus,
                tableId: filterTable === 'ALL' ? undefined : filterTable,
                waiterId: filterWaiter === 'ALL' ? undefined : filterWaiter,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            };
            const res = await axios.get(`${API_URL}/sales`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setSales(res.data.data);
            setTotalSales(res.data.total);
            setLastPage(res.data.lastPage);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching sales:', error);
            setLoading(false);
        }
    }, [page, limit, filterStatus, filterTable, filterWaiter, startDate, endDate]);

    // WebSocket for real-time updates
    useEffect(() => {
        const socket = io(API_URL);

        socket.on('connect', () => {
            console.log('Admin Sales: Connected to WebSocket');
        });

        socket.on('salesUpdate', (newSale) => {
            console.log('Admin Sales: New sale update received', newSale);
            fetchSales();
        });

        return () => {
            socket.disconnect();
        };
    }, [fetchSales]);

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
                const token = Cookies.get('token');
                const res = await axios.post(API_URL + '/sales/end-of-day',
                    { userId: user?.id },
                    { headers: { Authorization: 'Bearer ' + token } }
                );

                const { cashTotal, cardTotal, bankTotal, grandTotal, date } = res.data;

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

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        const calculateLimit = () => {
            if (containerRef.current) {
                const availableHeight = containerRef.current.offsetHeight;
                const tableHeaderHeight = 48;
                const rowHeight = 54;
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
    }, [limit]);

    useEffect(() => {
        fetchSales();
    }, [page, limit, filterStatus, filterTable, filterWaiter, startDate, endDate]);

    useEffect(() => {
        setPage(1);
    }, [limit, filterStatus, filterTable, filterWaiter, startDate, endDate]);

    const updateStatus = async (id: number, status: string) => {
        try {
            const token = Cookies.get('token');
            await axios.post(`${API_URL}/sales/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toastSwal({
                icon: 'success',
                title: tc('success')
            });
            fetchSales();
        } catch (error) {
            showSwal({
                icon: 'error',
                title: tc('error'),
                text: t('statusUpdateError') || 'Durum güncellenemedi'
            });
        }
    };

    const showSaleDetails = (sale: Sale) => {
        showSwal({
            title: `Satış #${sale.id} Detayları`,
            width: '600px',
            html: `
                <div class="text-left w-full overflow-hidden">
                    <div class="mb-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-slate-800">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <i class="fat fa-receipt"></i> Satış Kalemleri
                        </div>
                        <div class="space-y-3 max-h-[400px] overflow-auto pr-2">
                            ${sale.items.map(item => `
                                <div class="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                    <div class="flex justify-between items-center mb-1">
                                        <div class="font-bold text-slate-700 dark:text-slate-200">${item.product?.name}</div>
                                        <div class="text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">x${item.quantity}</div>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Birim: ₺${item.unitPrice}</div>
                                        <div class="text-sm font-black text-orange-600 dark:text-orange-400">₺${Number(item.unitPrice) * Number(item.quantity)}</div>
                                    </div>
                                    ${item.note ? `<div class="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-100 dark:border-amber-500/20 italic">Not: ${item.note}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 mb-4 shadow-sm">
                        <div class="font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-[10px]">Personel</div>
                        <div class="text-sm font-black text-slate-700 dark:text-slate-200">
                            ${sale.waiter ? `${sale.waiter.firstName} ${sale.waiter.lastName}` : '-'}
                        </div>
                    </div>
                    <div class="flex justify-between items-center p-5 bg-slate-100 dark:bg-slate-900/80 rounded-[32px] border border-slate-200 dark:border-slate-800 mb-4">
                        <div class="font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-[10px]">Toplam Tutar</div>
                        <div class="text-2xl font-black text-orange-600 dark:text-orange-400">₺${sale.totalAmount}</div>
                    </div>
                    <button id="closeOrderModal" class="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-2xl transition-all active:scale-95">
                        Kapat
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: false,
            didOpen: () => {
                const closeBtn = document.getElementById('closeOrderModal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        import('sweetalert2').then((Swal) => Swal.default.close());
                    });
                }
            }
        });
    };

    const deleteSale = async (id: number) => {
        const result = await showSwal({
            title: tc('confirmTitle'),
            text: tc('confirmDelete'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('yes'),
            cancelButtonText: tc('no'),
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
        });

        if (result.isConfirmed) {
            try {
                const token = Cookies.get('token');
                await axios.delete(`${API_URL}/sales/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSwal({ icon: 'success', title: tc('success') });
                fetchSales();
            } catch (error) {
                console.error('Error deleting sale:', error);
                showSwal({ icon: 'error', title: tc('error'), text: 'Satış silinemedi' });
            }
        }
    };


    const getStatusBadge = (status: string) => {
        const styles: any = {
            'NEW': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'PREPARATION': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            'READY': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            'SERVED': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
            'COMPLETED': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
            'CANCELLED': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };

        const statusTexts: any = {
            'NEW': t('statusNew') || 'Yeni',
            'PREPARATION': t('statusPreparing') || 'Hazırlanıyor',
            'READY': t('statusReady') || 'Hazır',
            'SERVED': t('statusServed') || 'Servis Edildi',
            'COMPLETED': t('statusCompleted') || 'Tamamlandı',
            'CANCELLED': t('statusCancelled') || 'İptal',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || styles['NEW']}`}>
                {statusTexts[status] || status}
            </span>
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 dark:bg-orange-600/10 blur-[120px]"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-red-500/5 dark:bg-red-600/10 blur-[120px]"></div>
            </div>

            <div className="w-full px-4 md:px-[50px] py-8 relative z-10 h-full flex flex-col">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
                    <div className="flex items-center">
                        <i className="fat fa-basket-shopping me-3 text-orange-600 dark:text-orange-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-orange-600 dark:text-orange-400 leading-none uppercase tracking-[0.25em]" id="title">ADİSYON & SATIŞ YÖNETİMİ</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-orange-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('salesManagementDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.push(`/${locale}/waiter`)} className="px-6 py-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newOrder')}
                        </button>
                        <button onClick={handleEndOfDay} className="px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 border border-slate-700">
                            <i className="fat fa-moon-stars text-lg text-indigo-400"></i> Gün Sonu Al
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri Dön
                        </button>
                    </div>
                </div>

                <style jsx>{`
                    select {
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        appearance: none;
                        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                        background-repeat: no-repeat;
                        background-position: right 1rem center;
                        background-size: 1em;
                    }
                    /* Dark mode icon ayarı için varsayılan dropdown ok rengi */
                    .dark select {
                        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23CBD5E1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    }
                `}</style>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-4 items-center bg-white/40 dark:bg-slate-800/40 p-3 rounded-[32px] border border-white dark:border-slate-700/50 backdrop-blur-md w-full justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">{tc('status')}:</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-none rounded-xl shadow-sm text-sm font-bold pl-4 pr-12 py-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300 w-[250px]"
                        >
                            <option value="ALL">{tc('all')}</option>
                            <option value="NEW">{t('statusNew') || 'Yeni'}</option>
                            <option value="PREPARATION">{t('statusPreparing') || 'Hazırlanıyor'}</option>
                            <option value="READY">{t('statusReady') || 'Hazır'}</option>
                            <option value="SERVED">{t('statusServed') || 'Servis Edildi'}</option>
                            <option value="CANCELLED">{t('statusCancelled') || 'İptal'}</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">{t('table')}:</label>
                        <select
                            value={filterTable}
                            onChange={(e) => setFilterTable(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-none rounded-xl shadow-sm text-sm font-bold pl-4 pr-12 py-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300 w-[250px]"
                        >
                            <option value="ALL">{tc('all')}</option>
                            {allTables.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Personel:</label>
                        <select
                            value={filterWaiter}
                            onChange={(e) => setFilterWaiter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-none rounded-xl shadow-sm text-sm font-bold px-4 pr-12 py-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300 min-w-[150px]"
                        >
                            <option value="ALL">{tc('all')}</option>
                            {allWaiters.map((w) => (
                                <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Tarih Aralığı:</label>
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl shadow-sm px-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold py-2.5 outline-none text-slate-700 dark:text-slate-300"
                            />
                            <span className="text-slate-300 dark:text-slate-600 px-1">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-xs font-bold py-2.5 outline-none text-slate-700 dark:text-slate-300"
                            />
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="ml-2 text-rose-500 hover:text-rose-600"
                                >
                                    <i className="fat fa-xmark"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div ref={containerRef} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden flex-1 min-h-0">
                    <div className="overflow-auto h-full">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableId') || 'ID'}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[160px]">{t('table')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cari') || 'Cari'}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Garson / Kasiyer</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tc('status')}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableDate') || 'Tarih'}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableAmount') || 'Tutar'}</th>
                                    <th className="px-8 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{tc('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingOrders') || 'Satışlar Yükleniyor...'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-20 text-center">
                                            <div className="flex flex-col items-center opacity-40">
                                                <i className="fat fa-receipt text-6xl mb-4 text-slate-300"></i>
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('notFound') || 'Satış Bulunamadı'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all group">
                                        <td className="px-8 py-2">
                                            <span className="text-sm font-black text-slate-400">#{sale.id}</span>
                                        </td>
                                        <td className="px-8 py-2">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 w-[150px] overflow-hidden">
                                                <i className="fat fa-utensils text-slate-400 text-xs shrink-0"></i>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                                                    {sale.table?.name || sale.tableName || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-2">
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {sale.partner?.name || 'PAREKENDE MÜŞTERİ'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-2 font-medium text-slate-600 dark:text-slate-400">
                                            {sale.waiter ? `${sale.waiter.firstName} ${sale.waiter.lastName}` : '-'}
                                        </td>
                                        <td className="px-8 py-2">{getStatusBadge(sale.status)}</td>
                                        <td className="px-8 py-2 text-sm text-slate-500 font-medium">{new Date(sale.createdAt).toLocaleString()}</td>
                                        <td className="px-8 py-2 font-black text-orange-600 dark:text-orange-400 text-right">₺{sale.totalAmount}</td>
                                        <td className="px-8 py-2 text-right">
                                            <div className="flex justify-end gap-2 transition-all">
                                                <button
                                                    onClick={() => showSaleDetails(sale)}
                                                    className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center hover:scale-110 active:scale-90 transition-all"
                                                    title={tc('details')}
                                                >
                                                    <i className="fat fa-eye"></i>
                                                </button>

                                                {user?.role?.name === 'ADMIN' && (
                                                    <button
                                                        onClick={() => deleteSale(sale.id)}
                                                        className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:scale-110 active:scale-90 transition-all"
                                                        title={tc('delete')}
                                                    >
                                                        <i className="fat fa-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between bg-white/40 dark:bg-slate-800/40 p-4 rounded-[32px] border border-white dark:border-slate-700/50 backdrop-blur-md shrink-0">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">
                        {t('total') || 'Toplam'}: <span className="text-slate-900 dark:text-white">{totalSales}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(1)}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                            title={t('firstPage') || 'İlk Sayfa'}
                        >
                            <i className="fat fa-angles-left"></i>
                        </button>
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                        >
                            <i className="fat fa-chevron-left"></i>
                        </button>
                        <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300">
                            {page} / {lastPage}
                        </div>
                        <button
                            disabled={page === lastPage}
                            onClick={() => setPage(page + 1)}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                        >
                            <i className="fat fa-chevron-right"></i>
                        </button>
                        <button
                            disabled={page === lastPage}
                            onClick={() => setPage(lastPage)}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-400"
                            title={t('lastPage') || 'Son Sayfa'}
                        >
                            <i className="fat fa-angles-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
