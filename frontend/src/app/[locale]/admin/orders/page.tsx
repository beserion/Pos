'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useAuth } from '@/app/[locale]/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface OrderItem {
    id: number;
    product: { name: string };
    quantity: number;
    unitPrice: number;
    note?: string;
}

interface Order {
    id: number;
    status: string;
    totalAmount: number;
    table?: { name: string };
    waiter?: { name: string, email: string };
    items: OrderItem[];
    createdAt: string;
}

export default function OrdersAdminPage() {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterTable, setFilterTable] = useState('ALL');
    const [filterWaiter, setFilterWaiter] = useState('ALL');

    const uniqueTables = Array.from(new Set(orders.map(o => o.table?.name).filter(Boolean)));
    const uniqueWaiters = Array.from(new Set(orders.map(o => o.waiter?.name || o.waiter?.email).filter(Boolean)));

    const API_URL = 'http://localhost:3050';

    const fetchOrders = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (id: number, status: string) => {
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/orders/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toastSwal({
                icon: 'success',
                title: tc('success')
            });
            fetchOrders();
        } catch (error) {
            showSwal({
                icon: 'error',
                title: tc('error'),
                text: t('statusUpdateError') || 'Durum güncellenemedi'
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            'NEW': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'IN_PREPARATION': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            'READY': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            'SERVED': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
            'CANCELLED': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || styles['NEW']}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px]"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 dark:bg-purple-600/10 blur-[120px]"></div>
            </div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-bowl-food me-3 text-rose-600 dark:text-rose-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-rose-600 dark:text-rose-400 leading-none uppercase tracking-[0.25em]" id="title">{t('orders')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-rose-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('ordersDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.push(`/${locale}/waiter`)} className="px-6 py-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newOrder')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
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
                            <option value="IN_PREPARATION">{t('statusPreparing') || 'Hazırlanıyor'}</option>
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
                            {uniqueTables.map((t, i) => (
                                <option key={i} value={t as string}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">{t('waiter')}:</label>
                        <select
                            value={filterWaiter}
                            onChange={(e) => setFilterWaiter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-none rounded-xl shadow-sm text-sm font-bold px-4 pr-12 py-2.5 outline-none cursor-pointer text-slate-700 dark:text-slate-300 min-w-[150px]"
                        >
                            <option value="ALL">{tc('all')}</option>
                            {uniqueWaiters.map((w, i) => (
                                <option key={i} value={w as string}>{w}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableId') || 'ID'}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('table')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('waiter')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tc('status')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableAmount') || 'Tutar'}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableDate') || 'Tarih'}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{tc('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingOrders') || 'Siparişler Yükleniyor...'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-20 text-center">
                                            <div className="flex flex-col items-center opacity-40">
                                                <i className="fat fa-receipt text-6xl mb-4 text-slate-300"></i>
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('notFound') || 'Sipariş Bulunamadı'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : orders.filter(o =>
                                    (filterStatus === 'ALL' || o.status === filterStatus) &&
                                    (filterTable === 'ALL' || o.table?.name === filterTable) &&
                                    (filterWaiter === 'ALL' || o.waiter?.email === filterWaiter)
                                ).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-20 text-center">
                                            <div className="flex flex-col items-center opacity-40">
                                                <i className="fat fa-filter text-6xl mb-4 text-slate-300"></i>
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('filterNotFound') || 'Filtrelere Uygun Sipariş Bulunamadı'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : orders.filter(o =>
                                    (filterStatus === 'ALL' || o.status === filterStatus) &&
                                    (filterTable === 'ALL' || o.table?.name === filterTable) &&
                                    (filterWaiter === 'ALL' || (o.waiter?.name || o.waiter?.email) === filterWaiter)
                                ).map(order => (
                                    <tr key={order.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                        <td className="px-8 py-3">
                                            <span className="text-sm font-black text-slate-400">#{order.id}</span>
                                        </td>
                                        <td className="px-8 py-3">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <i className="fat fa-utensils text-slate-400 text-xs"></i>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{order.table?.name || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-3 font-medium text-slate-600 dark:text-slate-400">{order.waiter?.name || order.waiter?.email || '-'}</td>
                                        <td className="px-8 py-3">{getStatusBadge(order.status)}</td>
                                        <td className="px-8 py-3 font-black text-indigo-600 dark:text-indigo-400">₺{order.totalAmount}</td>
                                        <td className="px-8 py-3 text-sm text-slate-500 font-medium">{new Date(order.createdAt).toLocaleString()}</td>
                                        <td className="px-8 py-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                                    className="bg-white dark:bg-slate-800 border-none rounded-xl shadow-sm text-xs font-bold px-4 py-2 focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer transition-shadow"
                                                >
                                                    <option value="NEW">{t('statusNew') || 'Yeni'}</option>
                                                    <option value="IN_PREPARATION">{t('statusPreparing') || 'Hazırlanıyor'}</option>
                                                    <option value="READY">{t('statusReady') || 'Hazır'}</option>
                                                    <option value="SERVED">{t('statusServed') || 'Servis Edildi'}</option>
                                                    <option value="CANCELLED">{t('statusCancelled') || 'İptal'}</option>
                                                </select>
                                            </div>
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
