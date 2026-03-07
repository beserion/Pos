'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { showSwal, toastSwal } from '../utils/swal';

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

export default function FinancePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const API_URL = 'http://localhost:3050';

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [formData, setFormData] = useState({
        amount: 0, type: 'INCOME', description: '', sourceType: 'SALE',
        paymentMethod: 'KASA', category: 'Satış'
    });

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [txRes, sumRes] = await Promise.all([
                axios.get(`${API_URL}/finance/transactions`, { headers }),
                axios.get(`${API_URL}/finance/summary`, { headers })
            ]);
            setTransactions(txRes.data);
            setSummary(sumRes.data);
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (user) fetchData();
    }, [user, loading, router]);

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

    const methodLabel = (m: string) => m === 'KASA' ? 'Kasa' : m === 'BANKA' ? 'Banka' : 'Kredi Kartı';
    const methodIcon = (m: string) => m === 'KASA' ? 'fa-cash-register' : m === 'BANKA' ? 'fa-building-columns' : 'fa-credit-card';

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-yellow-500/10 dark:bg-yellow-600/15 blur-[120px] z-0 pointer-events-none"></div>
            <div className="absolute bottom-[0%] right-[5%] w-[30%] h-[30%] rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-[100px] z-0 pointer-events-none"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header - formtitle rule */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-coins me-3 text-amber-500 dark:text-amber-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-amber-500 dark:text-amber-400 leading-none uppercase tracking-[0.25em]">FİNANS</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Hesap hareketleri, kasa, banka ve kart işlemleri.</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={openCreateModal} className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Hareket
                        </button>
                        <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-arrow-left"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Gelir</p>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">₺{(summary?.totalIncome || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <i className="fat fa-arrow-trend-up text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-[0_8px_30px_-5px_rgba(239,68,68,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Gider</p>
                            <h3 className="text-xl font-black text-red-600 dark:text-red-400">₺{(summary?.totalExpense || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                            <i className="fat fa-arrow-trend-down text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Bakiye</p>
                            <h3 className={`text-xl font-black ${(summary?.balance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>₺{(summary?.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <i className="fat fa-scale-balanced text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40 hover:shadow-[0_8px_30px_-5px_rgba(100,116,139,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kasa</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">₺{(summary?.kasa || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            <i className="fat fa-cash-register text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40 hover:shadow-[0_8px_30px_-5px_rgba(100,116,139,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Banka</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">₺{(summary?.banka || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            <i className="fat fa-building-columns text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40 hover:shadow-[0_8px_30px_-5px_rgba(100,116,139,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kart</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">₺{(summary?.kart || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            <i className="fat fa-credit-card text-2xl"></i>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Hesap Hareketleri</h2>
                        <span className="text-sm font-bold text-slate-400">{transactions.length} kayıt</span>
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ödeme Yöntemi</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tür</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {dataLoading ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto"></div></td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Henüz hesap hareketi bulunmuyor.</td></tr>
                                ) : transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-all">
                                        <td className="px-8 py-3 text-slate-500 dark:text-slate-400 text-sm">{new Date(tx.createdAt).toLocaleDateString('tr-TR')} <span className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></td>
                                        <td className="px-8 py-3 font-semibold text-slate-800 dark:text-slate-200">{tx.description}</td>
                                        <td className="px-8 py-3 text-slate-500 dark:text-slate-400 text-sm">{tx.category || '-'}</td>
                                        <td className="px-8 py-3 text-sm">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/50 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-medium">
                                                <i className={`fat ${methodIcon(tx.paymentMethod)} text-xs`}></i>
                                                {methodLabel(tx.paymentMethod)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-3">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${tx.type === 'INCOME' ? 'bg-emerald-100/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
                                                {tx.type === 'INCOME' ? 'Gelir' : 'Gider'}
                                            </span>
                                        </td>
                                        <td className={`px-8 py-3 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {tx.type === 'INCOME' ? '+' : '-'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-3 text-right">
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
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tür *</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none">
                                        <option value="INCOME">Gelir</option>
                                        <option value="EXPENSE">Gider</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tutar (₺) *</label>
                                    <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Açıklama *</label>
                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none" placeholder="Hareket açıklaması" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ödeme Yöntemi</label>
                                    <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none">
                                        <option value="KASA">Kasa</option>
                                        <option value="BANKA">Banka</option>
                                        <option value="KREDI_KARTI">Kredi Kartı</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-yellow-500/20 outline-none">
                                        <option value="Satış">Satış</option>
                                        <option value="Tahsilat">Tahsilat</option>
                                        <option value="Alım">Alım</option>
                                        <option value="Gider">Gider</option>
                                        <option value="Maaş">Maaş</option>
                                        <option value="Kira">Kira</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                İptal
                            </button>
                            <button onClick={handleSave} className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all">
                                {editingTx ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
