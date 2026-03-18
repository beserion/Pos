'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useTranslations, useLocale } from 'next-intl';
import { showSwal, toastSwal } from '../../utils/swal';

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
}

export function PageClient() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const tCommon = useTranslations('Common');
    const tFinance = useTranslations('Finance');
    const tAdmin = useTranslations('Admin');
    const API_URL = 'http://localhost:3050';

    const [accounts, setAccounts] = useState<CompanyAccount[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<CompanyAccount | null>(null);
    const [formData, setFormData] = useState({
        name: '', type: 'BANK', accountNumber: '', iban: '', currency: 'TL', isActive: true
    });

    const currencyTotals = useMemo(() => {
        return ['TL', 'USD', 'EUR', 'GBP'].map((ccy) => {
            const filtered = accounts.filter(a => a.currency === ccy);
            const total = filtered.reduce((sum, a) => sum + Number(a.balance), 0);
            return {
                ccy,
                total,
                count: filtered.length,
                config: {
                    TL: { name: 'Türk Lirası', icon: 'fa-turkish-lira-sign', color: 'emerald', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent' },
                    USD: { name: 'Amerikan Doları', icon: 'fa-dollar-sign', color: 'blue', gradient: 'from-blue-500/20 via-blue-500/5 to-transparent' },
                    EUR: { name: 'Euro', icon: 'fa-euro-sign', color: 'indigo', gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent' },
                    GBP: { name: 'İngiliz Sterlini', icon: 'fa-sterling-sign', color: 'rose', gradient: 'from-rose-500/20 via-rose-500/5 to-transparent' }
                }[ccy] || { name: ccy, icon: 'fa-money-bill', color: 'slate', gradient: 'from-slate-500/20 to-transparent' }
            };
        });
    }, [accounts]);

    const fetchAccounts = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/finance/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(res.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) fetchAccounts();
    }, [user, loading, router, locale]);

    const openCreateModal = () => {
        setEditingAccount(null);
        setFormData({ name: '', type: 'BANK', accountNumber: '', iban: '', currency: 'TL', isActive: true });
        setIsModalOpen(true);
    };

    const openEditModal = (account: CompanyAccount) => {
        setEditingAccount(account);
        setFormData({
            name: account.name,
            type: account.type,
            accountNumber: account.accountNumber || '',
            iban: account.iban || '',
            currency: account.currency,
            isActive: account.isActive
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            showSwal({ icon: 'warning', title: 'Uyarı', text: 'Hesap adı zorunludur.' });
            return;
        }
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            if (editingAccount) {
                await axios.put(`${API_URL}/finance/accounts/${editingAccount.id}`, formData, { headers });
                toastSwal({ icon: 'success', title: 'Hesap güncellendi!' });
            } else {
                await axios.post(`${API_URL}/finance/accounts`, formData, { headers });
                toastSwal({ icon: 'success', title: 'Yeni hesap oluşturuldu!' });
            }
            setIsModalOpen(false);
            fetchAccounts();
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
                await axios.delete(`${API_URL}/finance/accounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                toastSwal({ icon: 'success', title: 'Hesap silindi!' });
                fetchAccounts();
            } catch (error: any) {
                showSwal({ icon: 'error', title: 'Hata', text: error.response?.data?.message || 'Silme başarısız.' });
            }
        }
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }
                .dark .custom-scrollbar {
                    scrollbar-color: #334155 transparent;
                }
            `}</style>
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full px-6 py-10">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
                            <i className="fat fa-building-columns text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-wider text-blue-600">{tAdmin('companyAccounts')}</h3>
                            <h5 className="text-slate-500 text-xs font-medium uppercase tracking-widest">{tAdmin('companyAccountsDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-2xl font-bold hover:bg-blue-500/20 transition-all active:scale-95 shadow-sm"
                        >
                            <i className="fat fa-plus-circle"></i> Yeni Hesap Ekle
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/finance`)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold shadow-sm hover:bg-slate-50 transition-all"
                        >
                            <i className="fat fa-reply"></i> Geri Dön
                        </button>
                    </div>
                </div>
                {/* Currency & Accounts Section */}
                {!dataLoading && (
                    <div className="flex flex-col h-[calc(100vh-170px)]">
                        {/* Top Summary Cards Row - Fixed */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 flex-shrink-0 mb-8">
                            {currencyTotals.map(({ ccy, total, count, config }) => (
                                <div key={ccy} className={`group relative ${ccy === 'TL' ? 'bg-emerald-100/80 dark:bg-emerald-900/30' : 'bg-slate-100/90 dark:bg-slate-800/90'} backdrop-blur-2xl p-7 rounded-[40px] border border-white/50 dark:border-slate-700/50 transition-all duration-500 hover:-translate-y-1 shadow-xl hover:shadow-2xl overflow-hidden ${config.color === 'emerald' ? 'hover:shadow-emerald-500/20 border-t-emerald-500' :
                                        config.color === 'blue' ? 'hover:shadow-blue-500/20 border-t-blue-500' :
                                            config.color === 'indigo' ? 'hover:shadow-indigo-500/20 border-t-indigo-500' :
                                                'hover:shadow-rose-500/20 border-t-rose-500'
                                    } border-t-4`}>
                                    
                                    <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-gradient-to-br ${config.gradient} opacity-50 blur-3xl transition-all duration-700 group-hover:scale-150`}></div>

                                    {/* Rhombus Icon Container at Bottom Right */}
                                    <div className={`absolute -bottom-8 -right-8 w-32 h-32 rotate-[35deg] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-[25deg] ${config.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500/20 dark:text-emerald-400/10' :
                                            config.color === 'blue' ? 'bg-blue-500/10 text-blue-500/20 dark:text-blue-400/10' :
                                                config.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500/20 dark:text-indigo-400/10' :
                                                    'bg-rose-500/10 text-rose-500/20 dark:text-rose-400/10'
                                        }`}>
                                        <i className={`fat ${config.icon} text-6xl -rotate-[35deg] group-hover:rotate-[-25deg] transition-all duration-700`}></i>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{config.name}</p>
                                            <div className={`px-4 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-sm flex-shrink-0 ${config.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                    config.color === 'blue' ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                                                        config.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
                                                            'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                                                }`}>
                                                {count} Hesap
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-baseline gap-2">
                                            <h3 className={`text-3xl font-black tracking-tight transition-colors ${total >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-600'}`}>
                                                {total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </h3>
                                            <span className={`text-base font-black opacity-40 ${config.color === 'emerald' ? 'text-emerald-500' :
                                                    config.color === 'blue' ? 'text-blue-500' :
                                                        config.color === 'indigo' ? 'text-indigo-500' :
                                                            'text-rose-500'
                                                }`}>{ccy}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Accounts Lists - Scrollable Section */}
                        <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10">
                                {currencyTotals.map(({ ccy, total, count, config }) => (
                                    <div key={ccy} className="flex flex-col gap-4">
                                        {accounts
                                            .filter(a => a.currency === ccy)
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((account) => (
                                                <div
                                                    key={account.id}
                                                    onClick={() => router.push(`/${locale}/finance/accounts/${account.id}`)}
                                                    className="group relative bg-white dark:bg-slate-800/60 backdrop-blur-xl border border-slate-100 dark:border-slate-700/50 rounded-[28px] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden transform hover:-translate-y-1 active:scale-[0.98]"
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-5">
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className={`w-14 h-14 flex-shrink-0 rounded-[20px] flex items-center justify-center text-2xl ${account.type === 'CASH' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                    account.type === 'BANK' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'
                                                                }`}>
                                                                <i className={`fat ${account.type === 'CASH' ? 'fa-wallet' :
                                                                        account.type === 'BANK' ? 'fa-building-columns' :
                                                                            'fa-credit-card'
                                                                    }`}></i>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-lg font-black text-slate-800 dark:text-white truncate leading-tight mb-0.5">{account.name}</h3>
                                                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                    {account.type === 'CASH' ? 'Kasa' : account.type === 'BANK' ? 'Banka' : 'Kredi Kartı'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(account); }} className="w-10 h-10 rounded-xl bg-transparent text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 flex items-center justify-center transition-all">
                                                                <i className="fat fa-eye text-[16px]"></i>
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }} className="w-10 h-10 rounded-xl bg-transparent text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 flex items-center justify-center transition-all">
                                                                <i className="fat fa-trash text-[16px]"></i>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {(account.accountNumber || account.iban) && (
                                                        <div className="space-y-2 mb-5 px-1">
                                                            {account.accountNumber && (
                                                                <div className="flex items-center justify-between text-[13px] text-slate-500 dark:text-slate-400 font-bold overflow-hidden">
                                                                    <span className="text-[11px] font-black opacity-30 uppercase whitespace-nowrap">Hesap No</span>
                                                                    <span className="truncate ml-4 text-right">{account.accountNumber}</span>
                                                                </div>
                                                            )}
                                                            {account.iban && (
                                                                <div className="flex items-center justify-between text-[13px] text-slate-500 dark:text-slate-400 font-bold font-mono tracking-tighter overflow-hidden">
                                                                    <span className="text-[11px] font-black opacity-30 uppercase font-sans whitespace-nowrap">IBAN</span>
                                                                    <span className="truncate ml-4 text-right">{account.iban}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                                        <span className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Bakiye</span>
                                                        <div className={`text-2xl font-black tracking-tight ${Number(account.balance) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {Number(account.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-[11px] opacity-40 ml-1">{ccy}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {count === 0 && (
                                            <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px]">
                                                <p className="text-xs text-slate-400 font-medium">Bu birime ait hesap bulunamadı.</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Account Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <i className="fat fa-building-columns text-blue-600"></i>
                                    {editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">Hesap detaylarını doldurun</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-2xl">&times;</button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Hesap Adı *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    placeholder="Örn: Garanti Ticari Hesabı"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Hesap Tipi</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    >
                                        <option value="BANK">Banka Hesabı</option>
                                        <option value="CASH">Kasa</option>
                                        <option value="CREDIT_CARD">Kredi Kartı</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Para Birimi</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    >
                                        <option value="TL">Türk Lirası (₺)</option>
                                        <option value="USD">Amerikan Doları ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                        <option value="GBP">İngiliz Sterlini (£)</option>
                                    </select>
                                </div>
                            </div>
                            {formData.type === 'BANK' && (
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">IBAN</label>
                                        <input
                                            type="text"
                                            value={formData.iban}
                                            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-mono font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="TR00 0000 0000..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Hesap Numarası</label>
                                        <input
                                            type="text"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="000-000000"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-600">
                                Vazgeç
                            </button>
                            <button onClick={handleSave} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all">
                                {editingAccount ? 'Değişiklikleri Kaydet' : 'Hesabı Oluştur'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
