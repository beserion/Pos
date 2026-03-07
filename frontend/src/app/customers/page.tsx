'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { showSwal, toastSwal } from '../utils/swal';

interface Partner {
    id: number;
    name: string;
    type: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    taxOffice?: string;
    city?: string;
    creditLimit: number;
    currentBalance: number;
    isActive: boolean;
}

export default function CustomersPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const API_URL = 'http://localhost:3050';

    const [partners, setPartners] = useState<Partner[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [formData, setFormData] = useState({
        name: '', type: 'CUSTOMER', contactName: '', email: '', phone: '',
        address: '', taxNumber: '', taxOffice: '', city: '',
        creditLimit: 0, currentBalance: 0, isActive: true
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL, CUSTOMER, SUPPLIER

    const fetchPartners = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/partners`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPartners(res.data);
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (user) fetchPartners();
    }, [user, loading, router]);

    const openCreateModal = () => {
        setEditingPartner(null);
        setFormData({
            name: '', type: 'CUSTOMER', contactName: '', email: '', phone: '',
            address: '', taxNumber: '', taxOffice: '', city: '',
            creditLimit: 0, currentBalance: 0, isActive: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (p: Partner) => {
        setEditingPartner(p);
        setFormData({
            name: p.name, type: p.type, contactName: p.contactName || '', email: p.email || '',
            phone: p.phone || '', address: p.address || '', taxNumber: p.taxNumber || '',
            taxOffice: p.taxOffice || '', city: p.city || '',
            creditLimit: p.creditLimit, currentBalance: p.currentBalance, isActive: p.isActive
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            showSwal({ icon: 'warning', title: 'Uyarı', text: 'Cari adı zorunludur.' });
            return;
        }
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            if (editingPartner) {
                await axios.put(`${API_URL}/partners/${editingPartner.id}`, formData, { headers });
                toastSwal({ icon: 'success', title: 'Cari güncellendi!' });
            } else {
                await axios.post(`${API_URL}/partners`, formData, { headers });
                toastSwal({ icon: 'success', title: 'Yeni cari oluşturuldu!' });
            }
            setIsModalOpen(false);
            fetchPartners();
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
                await axios.delete(`${API_URL}/partners/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSwal({ icon: 'success', title: 'Cari silindi!' });
                fetchPartners();
            } catch (error: any) {
                showSwal({ icon: 'error', title: 'Hata', text: error.response?.data?.message || 'Silme başarısız.' });
            }
        }
    };

    if (loading || !user) return null;

    const totalCustomers = partners.length;
    const totalAlacak = partners.filter(p => p.currentBalance > 0).reduce((sum, p) => sum + Number(p.currentBalance), 0);
    const totalBorc = partners.filter(p => p.currentBalance < 0).reduce((sum, p) => sum + Math.abs(Number(p.currentBalance)), 0);
    const totalNetBalance = partners.reduce((sum, p) => sum + Number(p.currentBalance), 0);

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-600/20 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[0%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute top-[30%] right-[30%] w-[20%] h-[20%] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[80px] z-0 pointer-events-none transition-colors duration-500"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header - formtitle rule */}
                {/* Header - formtitle rule */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-file-invoice-dollar me-3 text-purple-600 dark:text-purple-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-purple-600 dark:text-purple-400 leading-none uppercase tracking-[0.25em]">CARİLER</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Müşteri ve tedarikçi bakiye hesaplarını yönetin.</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={openCreateModal} className="px-6 py-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Cari Hesap
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-arrow-left"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toplam Cari Sayısı</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalCustomers}</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/5 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-users text-2xl"></i>
                        </div>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toplam Alacak (Müşteri)</p>
                            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₺{totalAlacak.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-500/20 dark:to-emerald-500/5 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-arrow-trend-up text-2xl"></i>
                        </div>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-[0_8px_30px_-5px_rgba(239,68,68,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toplam Borç (Tedarikçi)</p>
                            <h3 className="text-2xl font-black text-red-600 dark:text-red-400">₺{totalBorc.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/5 text-red-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-arrow-trend-down text-2xl"></i>
                        </div>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl border border-white/50 dark:border-slate-700/50 flex items-center justify-between transition-all hover:border-purple-300 dark:hover:border-purple-500/40 hover:shadow-[0_8px_30px_-5px_rgba(168,85,247,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Toplam Bakiye (Net)</p>
                            <h3 className={`text-2xl font-black ${totalNetBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                ₺{totalNetBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-500/20 dark:to-purple-500/5 text-purple-500 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-white/5">
                            <i className="fat fa-wallet text-2xl"></i>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-xl overflow-hidden transition-colors">
                    <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/30 dark:bg-slate-900/30">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 min-w-max">Cari Listesi</h2>

                        {/* Center Search */}
                        <div className="relative flex-1 max-w-lg mx-auto w-full lg:w-auto">
                            <input
                                type="text"
                                placeholder="Ünvan, Yetkili veya Vergi No Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-900 dark:text-slate-100 text-sm focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all shadow-inner"
                            />
                            <i className="fat fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400"></i>
                        </div>

                        {/* Right Filters */}
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 min-w-max">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'ALL' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                HEPSİ
                            </button>
                            <button
                                onClick={() => setFilterType('CUSTOMER')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'CUSTOMER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                MÜŞTERİLER
                            </button>
                            <button
                                onClick={() => setFilterType('SUPPLIER')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'SUPPLIER' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                TEDARİKÇİLER
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 text-sm transition-colors backdrop-blur-sm">
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Cari Ünvan/İsim</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Tür</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Telefon</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Vergi Dairesi</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Vergi No</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Şehir</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider text-right">Kredi Limiti</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider text-right">Bakiye</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-5 font-bold uppercase tracking-wider text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                {dataLoading ? (
                                    <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div></td></tr>
                                ) : (() => {
                                    const filteredPartners = partners.filter(p => {
                                        const matchesSearch =
                                            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (p.contactName && p.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                            (p.taxNumber && p.taxNumber.includes(searchTerm));

                                        const matchesFilter = filterType === 'ALL' || p.type === filterType;

                                        return matchesSearch && matchesFilter;
                                    });

                                    if (filteredPartners.length === 0) {
                                        return <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Aranan kriterde cari bulunamadı.</td></tr>;
                                    }

                                    return filteredPartners.map((c) => (
                                        <tr key={c.id} className="hover:bg-white/80 dark:hover:bg-slate-700/50 transition-colors group">
                                            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                                                <span className={`px-3 py-1 rounded-lg border block w-max text-xs font-bold ${c.type === 'CUSTOMER' ? 'bg-indigo-100/50 border-indigo-200/50 dark:bg-indigo-500/10 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'bg-amber-100/50 border-amber-200/50 dark:bg-amber-500/10 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    {c.type === 'CUSTOMER' ? 'Müşteri' : 'Tedarikçi'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{c.phone || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{c.taxOffice || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm font-mono">{c.taxNumber || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{c.city || '-'}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">₺{Number(c.creditLimit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                                            <td className={`px-6 py-4 text-right font-black ${Number(c.currentBalance) > 0 ? 'text-emerald-600 dark:text-emerald-400' : Number(c.currentBalance) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {Number(c.currentBalance) > 0 ? `+₺${Number(c.currentBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : Number(c.currentBalance) < 0 ? `-₺${Math.abs(Number(c.currentBalance)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '₺0.00'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${c.isActive ? 'bg-indigo-100/80 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'bg-slate-100/80 border-slate-200 dark:bg-slate-700/50 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                                    {c.isActive ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => router.push(`/customers/${c.id}`)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30" title="Detay Göster">
                                                        <i className="fat fa-eye text-lg"></i>
                                                    </button>
                                                    <button onClick={() => openEditModal(c)} className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30" title="Düzenle">
                                                        <i className="fat fa-pen-to-square text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30" title="Sil">
                                                        <i className="fat fa-trash text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <i className="fat fa-file-invoice-dollar text-purple-600"></i>
                                    {editingPartner ? 'Cari Düzenle' : 'Yeni Cari Hesap'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Cari bilgilerini doldurun</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-xl">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cari Adı *</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="Ad/Soyad veya Firma Adı" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tür</label>
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none">
                                        <option value="CUSTOMER">Müşteri</option>
                                        <option value="SUPPLIER">Tedarikçi</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Yetkili Kişi</label>
                                    <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="İletişim kişisi" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Telefon</label>
                                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="05xx..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">E-posta</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="email@firma.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adres</label>
                                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="Adres bilgisi" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vergi Dairesi</label>
                                    <input type="text" value={formData.taxOffice} onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="Vergi Dairesi" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vergi No</label>
                                    <input type="text" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="1234567890" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Şehir</label>
                                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" placeholder="İstanbul" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kredi Limiti (₺)</label>
                                    <input type="number" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Açılış Bakiyesi (₺)</label>
                                    <input type="number" value={formData.currentBalance} onChange={(e) => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20 outline-none" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Durum</label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${formData.isActive ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{formData.isActive ? 'Aktif' : 'Pasif'}</span>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2">
                                <i className="fat fa-times-circle"></i> İptal
                            </button>
                            <button onClick={handleSave} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:scale-105 transition-all flex items-center gap-2">
                                <i className="fat fa-check-circle"></i> {editingPartner ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
