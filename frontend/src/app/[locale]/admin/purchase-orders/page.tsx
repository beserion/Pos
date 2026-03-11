'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useLocale } from 'next-intl';
import { showSwal, toastSwal } from '../../utils/swal';

interface PurchaseOrder {
    id: number;
    supplier?: { name: string };
    supplierId: number;
    status: string;
    totalAmount: number;
    invoiceNumber: string | null;
    invoiceDateStr: string | null;
    invoiceAmount: number | null;
    paymentStatus: string;
    items: any[];
    createdAt: string;
}

export default function PurchaseOrdersPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const API_URL = 'http://localhost:3050';

    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        invoiceAmount: 0,
        paymentMethod: 'KASA',
        paymentStatus: 'PAID'
    });

    const fetchOrders = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/purchase-orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) fetchOrders();
    }, [user, loading, router]);

    const openInvoiceModal = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setInvoiceForm({
            invoiceNumber: order.invoiceNumber || '',
            invoiceDate: order.invoiceDateStr || new Date().toISOString().split('T')[0],
            invoiceAmount: order.invoiceAmount || Number(order.totalAmount),
            paymentMethod: 'KASA',
            paymentStatus: 'PAID'
        });
        setIsModalOpen(true);
    };

    const handleSaveInvoice = async () => {
        if (!selectedOrder) return;
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/purchase-orders/${selectedOrder.id}/receive-invoice`, invoiceForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toastSwal({ icon: 'success', title: 'Fatura işlendi ve stoklar güncellendi!' });
            setIsModalOpen(false);
            fetchOrders();
        } catch (e: any) {
            showSwal({ icon: 'error', title: 'Hata', text: e.response?.data?.message || 'İşlem başarısız.' });
        }
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 font-sans transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-[120px] z-0 pointer-events-none"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-cart-shopping me-3 text-amber-600 dark:text-amber-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-amber-600 dark:text-amber-400 leading-none uppercase tracking-[0.25em]">SATIN ALMA</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Tedarikçi siparişleri ve fatura yönetimi</h5>
                        </div>
                    </div>
                    <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                        <i className="fat fa-reply"></i> Geri Dön
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white">Sipariş Listesi</h2>
                        <span className="text-xs text-slate-400 font-bold">{orders.length} kayıt bulunuyor</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedarikçi / Tarih</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fatura Bilgisi</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {dataLoading ? (
                                    <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400">Yükleniyor...</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400">Henüz satın alma siparişi bulunmuyor.</td></tr>
                                ) : orders.map(order => (
                                    <tr key={order.id} className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-all group">
                                        <td className="px-8 py-4">
                                            <div className="font-black text-slate-800 dark:text-white mb-0.5">{order.supplier?.name || `Tedarikçi #${order.supplierId}`}</div>
                                            <div className="text-xs text-slate-400 font-bold">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${order.status === 'RECEIVED' ? 'bg-emerald-100/80 border-emerald-200 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                                                    order.status === 'SENT' ? 'bg-blue-100/80 border-blue-200 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                                                        'bg-slate-100 border-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {order.status === 'RECEIVED' ? '✔ Teslim Alındı' : order.status === 'SENT' ? '✉ Gönderildi' : '📄 Taslak'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="font-black text-slate-800 dark:text-white">₺{Number(order.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                        </td>
                                        <td className="px-8 py-4">
                                            {order.invoiceNumber ? (
                                                <div className="text-sm">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300">Fatura: {order.invoiceNumber}</div>
                                                    <div className="text-xs text-slate-400">{order.invoiceDateStr} · {order.paymentStatus}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Fatura girilmedi</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            {order.status !== 'RECEIVED' && (
                                                <button onClick={() => openInvoiceModal(order)} className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm">
                                                    Fatura Gir / Teslim Al
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Invoice Modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white">Fatura Girişi</h2>
                                <p className="text-xs text-slate-400 mt-1">{selectedOrder.supplier?.name || 'Tedarikçi'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-3xl text-slate-400 hover:text-slate-800 dark:hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura No *</label>
                                    <input type="text" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-amber-500/30 text-sm font-bold" placeholder="ABC-2024-001" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura Tarihi *</label>
                                    <input type="date" value={invoiceForm.invoiceDate} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-amber-500/30 text-sm font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Toplam Tutar (₺)</label>
                                <input type="number" step="0.01" value={invoiceForm.invoiceAmount} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceAmount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-amber-500/30 text-sm font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Ödeme Yöntemi</label>
                                    <select value={invoiceForm.paymentMethod} onChange={e => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold">
                                        <option value="KASA">Kasa (Nakit)</option>
                                        <option value="BANKA">Banka Havalesi</option>
                                        <option value="KREDI_KARTI">Kredi Kartı</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Ödeme Durumu</label>
                                    <select value={invoiceForm.paymentStatus} onChange={e => setInvoiceForm({ ...invoiceForm, paymentStatus: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold">
                                        <option value="PAID">Ödendi (Borç Artmaz)</option>
                                        <option value="UNPAID">Ödenmedi (Borca İşle)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">İptal</button>
                            <button onClick={handleSaveInvoice} className="flex-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Onayla ve Teslim Al</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
