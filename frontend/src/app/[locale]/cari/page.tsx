'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useLocale } from 'next-intl';
import { showSwal, toastSwal } from '../utils/swal';

interface Partner {
    id: number;
    name: string;
    type: string; // CUSTOMER | SUPPLIER
    phone?: string;
    email?: string;
    currentBalance: number;
    isActive: boolean;
}

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

export default function CariPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const API_URL = 'http://localhost:3050';

    const [partners, setPartners] = useState<Partner[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
    const [dataLoading, setDataLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(false);

    // New manual transaction modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ amount: 0, type: 'INCOME', description: '', paymentMethod: 'KASA', category: 'Tahsilat' });

    const fetchPartners = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/partners`, { headers: { Authorization: `Bearer ${token}` } });
            setPartners(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setDataLoading(false);
        }
    };

    const fetchPartnerTransactions = async (partnerId: number) => {
        setTxLoading(true);
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/finance/partner/${partnerId}`, { headers: { Authorization: `Bearer ${token}` } });
            setTransactions(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setTxLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) fetchPartners();
    }, [user, loading]);

    const handlePartnerSelect = (partner: Partner) => {
        setSelectedPartner(partner);
        fetchPartnerTransactions(partner.id);
    };

    const handleSaveTransaction = async () => {
        if (!selectedPartner || !form.description.trim() || form.amount <= 0) {
            showSwal({ icon: 'warning', title: 'Uyarı', text: 'Tutar ve açıklama zorunludur.' });
            return;
        }
        try {
            const token = Cookies.get('token');
            await axios.post(`${API_URL}/finance/transactions`, {
                ...form,
                partnerId: selectedPartner.id,
                sourceType: 'MANUAL',
            }, { headers: { Authorization: `Bearer ${token}` } });
            toastSwal({ icon: 'success', title: 'Hareket eklendi!' });
            setIsModalOpen(false);
            fetchPartnerTransactions(selectedPartner.id);
        } catch (e: any) {
            showSwal({ icon: 'error', title: 'Hata', text: e.response?.data?.message || 'İşlem başarısız.' });
        }
    };

    const filteredPartners = partners.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'ALL' || p.type === typeFilter;
        return matchSearch && matchType;
    });

    // Running balance calculation
    let runningBalance = 0;
    const txWithBalance = [...transactions].reverse().map(tx => {
        runningBalance += tx.type === 'INCOME' ? Number(tx.amount) : -Number(tx.amount);
        return { ...tx, runningBalance };
    }).reverse();

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    const methodLabel = (m: string) => m === 'KASA' ? 'Kasa' : m === 'BANKA' ? 'Banka' : 'Kredi Kartı';

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 font-sans transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] z-0 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[30%] h-[30%] rounded-full bg-violet-500/10 dark:bg-violet-600/10 blur-[100px] z-0 pointer-events-none"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-users-between-lines me-3 text-indigo-500 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-500 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]">CARİLER</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Müşteri ve tedarikçi hesap hareketleri</h5>
                        </div>
                    </div>
                    <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                        <i className="fat fa-reply"></i> Geri Dön
                    </button>
                </div>

                <div className="flex gap-6 h-[calc(100vh-200px)]">
                    {/* Left Panel: Partner List */}
                    <div className="w-80 shrink-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-2">
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari ara..."
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/30"
                            />
                            <div className="flex gap-1">
                                {(['ALL', 'CUSTOMER', 'SUPPLIER'] as const).map(t => (
                                    <button key={t} onClick={() => setTypeFilter(t)}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}>
                                        {t === 'ALL' ? 'Tümü' : t === 'CUSTOMER' ? 'Müşteri' : 'Tedarikçi'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {dataLoading ? (
                                <div className="flex items-center justify-center h-32 text-slate-400">Yükleniyor...</div>
                            ) : filteredPartners.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Cari bulunamadı</div>
                            ) : filteredPartners.map(p => (
                                <button key={p.id} onClick={() => handlePartnerSelect(p)}
                                    className={`w-full text-left px-4 py-3 rounded-2xl mb-1 transition-all ${selectedPartner?.id === p.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-sm">{p.name}</div>
                                            <div className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${selectedPartner?.id === p.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {p.type === 'CUSTOMER' ? '👤 Müşteri' : '🏭 Tedarikçi'}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Transactions */}
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        {!selectedPartner ? (
                            <div className="flex-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 flex flex-col items-center justify-center text-slate-400">
                                <i className="fat fa-hand-point-left text-6xl opacity-20 mb-4"></i>
                                <p className="font-bold">Sol panelden bir cari seçin</p>
                            </div>
                        ) : (
                            <>
                                {/* Partner Header + KPI */}
                                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 p-5 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">{selectedPartner.name}</h2>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${selectedPartner.type === 'CUSTOMER' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'}`}>
                                            {selectedPartner.type === 'CUSTOMER' ? 'Müşteri' : 'Tedarikçi'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center px-8 py-2 min-w-[140px] bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
                                            <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Gelir</div>
                                            <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">₺{totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="text-center px-8 py-2 min-w-[140px] bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20">
                                            <div className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider">Gider</div>
                                            <div className="text-lg font-black text-red-700 dark:text-red-400">₺{totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className={`text-center px-8 py-2 min-w-[140px] rounded-2xl border ${netBalance >= 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'}`}>
                                            <div className={`text-[10px] font-black uppercase tracking-wider ${netBalance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>Bakiye</div>
                                            <div className={`text-lg font-black ${netBalance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-amber-700 dark:text-amber-400'}`}>₺{netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <button onClick={() => setIsModalOpen(true)} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/30">
                                            <i className="fat fa-plus"></i> Hareket Ekle
                                        </button>
                                    </div>
                                </div>

                                {/* Transactions Table */}
                                <div className="flex-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[32px] border border-white dark:border-slate-700/50 overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-black text-slate-800 dark:text-slate-100">Hesap Hareketleri</h3>
                                        <span className="text-xs text-slate-400 font-bold">{transactions.length} kayıt</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        {txLoading ? (
                                            <div className="flex items-center justify-center h-32 text-slate-400">Yükleniyor...</div>
                                        ) : txWithBalance.length === 0 ? (
                                            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Bu cari için henüz hareket bulunmuyor.</div>
                                        ) : (
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
                                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kaynak</th>
                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ödeme</th>
                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Bakiye</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                    {txWithBalance.map((tx: any) => (
                                                        <tr key={tx.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/5 transition-all">
                                                            <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                                                                {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                                                                <span className="text-xs text-slate-400 ml-1">{new Date(tx.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </td>
                                                            <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200 text-sm">{tx.description}</td>
                                                            <td className="px-5 py-3 text-xs text-slate-400">{tx.sourceType || 'MANUAL'}</td>
                                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{methodLabel(tx.paymentMethod)}</td>
                                                            <td className={`px-5 py-3 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {tx.type === 'INCOME' ? '+' : '-'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className={`px-5 py-3 text-right font-black text-sm ${tx.runningBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                                ₺{tx.runningBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Transaction Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <i className="fat fa-plus-circle text-indigo-500"></i>
                                Manuel Hareket — {selectedPartner?.name}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tür *</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/30">
                                        <option value="INCOME">Gelir / Tahsilat</option>
                                        <option value="EXPENSE">Gider / Ödeme</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tutar (₺) *</label>
                                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/30" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Açıklama *</label>
                                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/30" placeholder="Açıklama girin" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ödeme Yöntemi</label>
                                    <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/30">
                                        <option value="KASA">Kasa</option>
                                        <option value="BANKA">Banka</option>
                                        <option value="KREDI_KARTI">Kredi Kartı</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 ring-indigo-500/30">
                                        <option value="Tahsilat">Tahsilat</option>
                                        <option value="Satış">Satış</option>
                                        <option value="Ödeme">Ödeme</option>
                                        <option value="Alım">Alım</option>
                                        <option value="Gider">Gider</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">İptal</button>
                            <button onClick={handleSaveTransaction} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all">Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
