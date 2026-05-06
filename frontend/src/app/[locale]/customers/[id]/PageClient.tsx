'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../../AuthContext';
import { API_URL } from '@/lib/apiConfig';

// API Modelleri
interface Partner {
    id: number;
    name: string;
    type: string; // CUSTOMER | SUPPLIER
    currentBalance: number;
    isActive: boolean;
    phone?: string;
    email?: string;
    taxNumber?: string;
    taxOffice?: string;
    address?: string;
}

interface Transaction {
    id: number;
    amount: number;
    type: string; // INCOME | EXPENSE
    description: string;
    paymentMethod: string;
    createdAt: string;
    runningBalance?: number;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    description: string;
    totalAmount: number;
    status: string; // PAID | UNPAID
    issueDate: string;
}


export function PageClient() {
    const { id, locale } = useParams() as { id: string; locale: string };
    const router = useRouter();
    const { user, loading: authLoading, hasFeature } = useAuth();
    

    
    // State
    const [partner, setPartner] = useState<Partner | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices'>('overview');

    // Bağımsız Veri Çekme Fonksiyonu
    const fetchData = async () => {
        const token = Cookies.get('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            // 1. Ana Cari Bilgisi (Kritik)
            try {
                const partnerRes = await axios.get(`${API_URL}/partners/${id}`, { headers });
                setPartner(partnerRes.data);
            } catch (err) {
                console.error('Partner fetch error:', err);
                setPartner(null);
            }

            // 2. Finansal Modül Gerekli Veriler
            if (hasFeature('finance_system')) {
                // Hesap Hareketleri
                try {
                    const txRes = await axios.get(`${API_URL}/finance/partner/${id}`, { headers });
                    setTransactions(txRes.data);
                } catch (err) {
                    console.error('Transactions fetch error:', err);
                    setTransactions([]);
                }

                // Faturalar
                try {
                    const invRes = await axios.get(`${API_URL}/invoices/partner/${id}`, { headers });
                    setInvoices(invRes.data);
                } catch (err) {
                    console.error('Invoices fetch error:', err);
                    setInvoices([]);
                }
            }
        } catch (error) {
            console.error('Global fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) router.push(`/${locale}/login`);
        if (user && id) fetchData();
    }, [user, authLoading, id]);

    // Yükleme Durumu
    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-violet-500/10 border-b-violet-500 rounded-full animate-spin-slow"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Bulunamadı Durumu
    if (!partner) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-8">
                <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <i className="fat fa-user-slash text-5xl"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3">Cari Kaydı Bulunamadı</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-center mb-8">Aradığınız cari hesap sistemde mevcut değil veya silinmiş olabilir. Lütfen listeye dönüp tekrar deneyin.</p>
                <button 
                    onClick={() => router.push(`/${locale}/customers`)}
                    className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <i className="fat fa-reply me-2"></i> Listeye Geri Dön
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-500 relative overflow-hidden">
            {/* Dinamik Arka Plan Efektleri */}
            <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/10 dark:bg-violet-600/10 blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 w-full px-8 md:px-[60px] py-12">
                
                {/* Header (formtitle workflow style) */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12 animate-slide-down">
                    <div className="flex items-center group">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[22px] shadow-2xl shadow-indigo-500/30 flex items-center justify-center transition-transform group-hover:rotate-6">
                            <i className="fat fa-user-tie text-3xl text-white"></i>
                        </div>
                        <div className="ms-5">
                            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight uppercase leading-none">
                                {partner.name}
                            </h1>
                            <div className="flex items-center mt-2.5">
                                <span className={`flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${partner.type === 'CUSTOMER' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400' : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'}`}>
                                    <i className={`fat ${partner.type === 'CUSTOMER' ? 'fa-user' : 'fa-building'} me-1.5`}></i>
                                    {partner.type === 'CUSTOMER' ? 'Müşteri' : 'Tedarikçi'}
                                </span>
                                <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    Cari Kayıt Detayları
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => fetchData()} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95">
                            <i className="fat fa-sync-alt text-lg"></i>
                        </button>
                        <button 
                            onClick={() => router.push(`/${locale}/customers`)}
                            className="px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-12 gap-8">
                    
                    {/* Left Sidebar (Profile & HUD) */}
                    <div className="col-span-12 lg:col-span-4 space-y-8 animate-fade-in">
                        
                        {/* Summary Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-[32px] border border-white dark:border-slate-700/50 p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <i className="fat fa-id-card text-8xl text-indigo-500"></i>
                            </div>
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Finansal Durum</h4>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-end justify-between mb-2">
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Güncel Bakiye</p>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${partner.currentBalance >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {partner.currentBalance >= 0 ? 'Alacaklı' : 'Borçlu'}
                                        </span>
                                    </div>
                                    <div className={`text-4xl font-black tracking-tighter ${partner.currentBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        ₺{Math.abs(partner.currentBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bekleyen Ödeme</p>
                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200 text-amber-500">₺{invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.totalAmount), 0).toLocaleString('tr-TR', { minimumFractionDigits: 1 })}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Açık Fatura</p>
                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200 text-indigo-500">{invoices.filter(i => i.status !== 'PAID').length} Adet</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Card */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-[32px] border border-white dark:border-slate-700/50 p-8 shadow-xl">
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">İletişim Bilgileri</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                        <i className="fat fa-phone"></i>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Telefon</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{partner.phone || 'Belirtilmemiş'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-violet-500 group-hover:text-white transition-all">
                                        <i className="fat fa-at"></i>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">E-Posta</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{partner.email || 'Belirtilmemiş'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                        <i className="fat fa-map-marker-alt"></i>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Adres</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{partner.address || 'Belirtilmemiş'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <button className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex flex-col items-center gap-2 transition-all shadow-lg shadow-indigo-500/30 group">
                                <i className="fat fa-plus-circle text-xl group-hover:scale-110 transition-transform"></i>
                                Tahsilat Gir
                            </button>
                            <button className="p-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex flex-col items-center gap-2 transition-all shadow-lg shadow-violet-500/30 group">
                                <i className="fat fa-minus-circle text-xl group-hover:scale-110 transition-transform"></i>
                                Ödeme Yap
                            </button>
                        </div>

                    </div>

                    {/* Main Content Area */}
                    <div className="col-span-12 lg:col-span-8 animate-slide-up">
                        
                        {/* Tabs Navigation */}
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl p-2 border border-white dark:border-slate-700/50 flex gap-2 mb-8 shadow-xl">
                            <button 
                                onClick={() => setActiveTab('overview')}
                                className={`flex-1 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                            >
                                <i className="fat fa-analytics me-2"></i> Analiz
                            </button>
                            <button 
                                onClick={() => setActiveTab('transactions')}
                                className={`flex-1 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'transactions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                            >
                                <i className="fat fa-list-ul me-2"></i> Hareketler
                            </button>
                            <button 
                                onClick={() => setActiveTab('invoices')}
                                className={`flex-1 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                            >
                                <i className="fat fa-file-invoice-dollar me-2"></i> Faturalar
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[500px]">
                            
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[32px] p-8 border border-white dark:border-slate-700/50 shadow-xl overflow-hidden relative group">
                                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Toplam İşlem Hacmi</h5>
                                            <p className="text-3xl font-black text-slate-800 dark:text-white">₺{transactions.reduce((s, t) => s + Number(t.amount), 0).toLocaleString('tr-TR')}</p>
                                            <p className="text-xs text-slate-500 mt-2">Sistemdeki tüm hareketlerin toplamı</p>
                                        </div>
                                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[32px] p-8 border border-white dark:border-slate-700/50 shadow-xl overflow-hidden relative group">
                                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all"></div>
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Son İşlem Tarihi</h5>
                                            <p className="text-3xl font-black text-slate-800 dark:text-white">
                                                {transactions.length > 0 ? new Date(transactions[0].createdAt).toLocaleDateString('tr-TR') : 'YOK'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2">En son kaydedilen aktivite</p>
                                        </div>
                                    </div>
                                    
                                    {/* Son Hareketler Listesi (Analiz Sekmesi İçinde) */}
                                    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 shadow-xl overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Son Aktivite</h5>
                                            <span className="text-[10px] font-bold text-indigo-500 hover:underline cursor-pointer" onClick={() => setActiveTab('transactions')}>Tümünü Gör</span>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {transactions.slice(0, 5).map((tx) => (
                                                <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                            <i className={`fat fa-${tx.type === 'INCOME' ? 'long-arrow-alt-down' : 'long-arrow-alt-up'}`}></i>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white leading-none mb-1">{tx.description}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                                                {new Date(tx.createdAt).toLocaleDateString('tr-TR')} • {tx.paymentMethod}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`text-sm font-black ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {tx.type === 'INCOME' ? '+' : '-'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 1 })}
                                                    </div>
                                                </div>
                                            ))}
                                            {transactions.length === 0 && (
                                                <div className="p-12 text-center text-slate-400 text-sm italic">Henüz bir hareket kaydedilmemiş.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'transactions' && (
                                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 shadow-2xl overflow-hidden animate-fade-in">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-700">
                                                    <th className="px-8 py-5">Tarih</th>
                                                    <th className="px-8 py-5">Açıklama</th>
                                                    <th className="px-8 py-5">Tür</th>
                                                    <th className="px-8 py-5 text-right">Tutar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                {transactions.length === 0 ? (
                                                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">Hareket kaydı bulunamadı.</td></tr>
                                                ) : transactions.map((t) => (
                                                    <tr key={t.id} className="group hover:bg-indigo-500/[0.02] transition-colors">
                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{new Date(t.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{t.description}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{t.paymentMethod}</p>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${t.type === 'INCOME' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                                                                {t.type === 'INCOME' ? 'Tahsilat' : 'Ödeme'}
                                                            </span>
                                                        </td>
                                                        <td className={`px-8 py-5 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {t.type === 'INCOME' ? '+' : '-'}₺{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'invoices' && (
                                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 shadow-2xl overflow-hidden animate-fade-in">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-700">
                                                    <th className="px-8 py-5">Belge No</th>
                                                    <th className="px-8 py-5">Tarih</th>
                                                    <th className="px-8 py-5">Durum</th>
                                                    <th className="px-8 py-5 text-right">Tutar</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                {invoices.length === 0 ? (
                                                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">Fatura kaydı bulunamadı.</td></tr>
                                                ) : invoices.map((inv) => (
                                                    <tr key={inv.id} className="group hover:bg-indigo-500/[0.02] transition-colors">
                                                        <td className="px-8 py-5">
                                                            <p className="text-sm font-black text-slate-800 dark:text-white tracking-widest">{inv.invoiceNumber}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{inv.description || 'Fatura Detayı'}</p>
                                                        </td>
                                                        <td className="px-8 py-5 whitespace-nowrap">
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(inv.issueDate).toLocaleDateString('tr-TR')}</p>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${inv.status === 'PAID' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20'}`}>
                                                                {inv.status === 'PAID' ? 'Ödendi' : 'Bekliyor'}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-black text-slate-800 dark:text-slate-100">
                                                            ₺{Number(inv.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>

                </div>

            </div>

            {/* Global Style (Animations) */}
            <style jsx global>{`
                @keyframes slideDown {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-down { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
                .animate-spin-slow { animation: spin 3s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
