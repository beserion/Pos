'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../../AuthContext';

interface Partner {
    id: number;
    name: string;
    type: string;
    currentBalance: number;
    isActive: boolean;
}

interface Transaction {
    id: number;
    amount: number;
    type: string;
    description: string;
    paymentMethod: string;
    createdAt: string;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    description: string;
    totalAmount: number;
    status: string;
    issueDate: string;
}

export default function CustomerDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const API_URL = 'http://localhost:3050';

    const [partner, setPartner] = useState<Partner | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [partnerRes, txRes, invRes] = await Promise.all([
                axios.get(`${API_URL}/partners/${id}`, { headers }),
                axios.get(`${API_URL}/finance/partner/${id}`, { headers }),
                axios.get(`${API_URL}/invoices/partner/${id}`, { headers })
            ]);

            setPartner(partnerRes.data);
            setTransactions(txRes.data);
            setInvoices(invRes.data);
        } catch (error) {
            console.error('Error fetching customer data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (user && id) fetchData();
    }, [user, authLoading, id]);

    if (loading || authLoading || !partner) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Background Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-600/20 blur-[120px] z-0 pointer-events-none"></div>
            <div className="absolute bottom-[0%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[100px] z-0 pointer-events-none"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-user-gear me-3 text-purple-600 dark:text-purple-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-purple-600 dark:text-purple-400 leading-none uppercase tracking-[0.25em]">{partner.name}</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Cari Hesap Detayları ve Hareket Geçmişi</h5>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={() => router.push('/customers')}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-arrow-left"></i> Listeye Dön
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Güncel Bakiye */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer hover:shadow-[0_8px_30px_-5px_rgba(168,85,247,0.3)] hover:border-purple-300 dark:hover:border-purple-500/40">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase text-[10px] mb-1">Güncel Bakiye</p>
                            <h3 className={`text-2xl font-black ${partner.currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                ₺{Number(partner.currentBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-500/20 dark:to-purple-500/5 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-wallet text-2xl"></i>
                        </div>
                    </div>

                    {/* Bekleyen Ödemeler */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.2)] hover:border-amber-300 dark:hover:border-amber-500/40">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase text-[10px] mb-1">Bekleyen Ödemeler</p>
                            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                ₺{invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.totalAmount), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/5 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-hand-holding-dollar text-2xl"></i>
                        </div>
                    </div>

                    {/* Bekleyen Faturalar */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer hover:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.2)] hover:border-blue-300 dark:hover:border-blue-500/40">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase text-[10px] mb-1">Bekleyen Faturalar</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{invoices.filter(i => i.status !== 'PAID').length} Adet</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/5 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-file-invoice text-2xl"></i>
                        </div>
                    </div>

                    {/* Son Hareket */}
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.2)] hover:border-emerald-300 dark:hover:border-emerald-500/40">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase text-[10px] mb-1">Son Hareket</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                {transactions.length > 0 ? new Date(transactions[0].createdAt).toLocaleDateString('tr-TR') : '-'}
                            </h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-clock-rotate-left text-2xl"></i>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'transactions' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
                    >
                        Hesap Hareketleri
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'invoices' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
                    >
                        Faturalar
                    </button>
                </div>

                {/* Content Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        {activeTab === 'transactions' ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4 text-center w-24">Tarih</th>
                                        <th className="px-6 py-4">Açıklama</th>
                                        <th className="px-6 py-4">İşlem Türü</th>
                                        <th className="px-6 py-4">Ödeme Tipi</th>
                                        <th className="px-6 py-4 text-right">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                    {transactions.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Henüz hareket kaydı bulunmuyor.</td></tr>
                                    ) : transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm text-center">
                                                {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">{t.description}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                                    {t.type === 'INCOME' ? 'Tahsilat / Gelir' : 'Ödeme / Gider'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{t.paymentMethod}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.type === 'INCOME' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4 text-center w-24">Tarih</th>
                                        <th className="px-6 py-4">Fatura No</th>
                                        <th className="px-6 py-4">Açıklama</th>
                                        <th className="px-6 py-4 text-center">Durum</th>
                                        <th className="px-6 py-4 text-right">Toplam Tutar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                    {invoices.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Henüz fatura kaydı bulunmuyor.</td></tr>
                                    ) : invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm text-center">
                                                {new Date(inv.issueDate).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold tracking-wider">{inv.invoiceNumber}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{inv.description || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10'}`}>
                                                    {inv.status === 'PAID' ? 'ÖDENDİ' : 'BEKLEYEN'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-700 dark:text-slate-300">
                                                ₺{Number(inv.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
