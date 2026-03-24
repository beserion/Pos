'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useLocale } from 'next-intl';

interface OutputProfile {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
    isActive: boolean;
    outputProfileId?: number | null;
    outputProfile?: OutputProfile;
}

const EMPTY: Department = { id: 0, name: '', isActive: true, outputProfileId: 0 };

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [items, setItems] = useState<Department[]>([]);
    const [outputProfiles, setOutputProfiles] = useState<OutputProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Department>({ ...EMPTY });

    useEffect(() => { if (user?.token) fetchData(); else if (user === null) setLoading(false); }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const h = { headers: { Authorization: `Bearer ${user.token}` } };
            const [depRes, opRes] = await Promise.all([
                axios.get(`${API}/departments`, h),
                axios.get(`${API}/output-profiles`, h)
            ]);
            setItems(depRes.data);
            setOutputProfiles(opRes.data);
        } catch { showSwal({ title: 'Hata', text: 'Veri yüklenemedi', icon: 'error' }); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const h = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData };
            if (payload.id === 0) {
                const { id, outputProfile, ...data } = payload as any;
                await axios.post(`${API}/departments`, data, h);
                toastSwal({ title: 'Başarılı', text: 'Kaydedildi', icon: 'success' });
            } else {
                const { outputProfile, ...data } = payload as any;
                await axios.put(`${API}/departments/${payload.id}`, data, h);
                toastSwal({ title: 'Başarılı', text: 'Güncellendi', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            showSwal({ title: 'Hata', text: err?.response?.data?.message || 'Kayıt hatası', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({ title: 'Emin misiniz?', text: 'Bu kategori silinecek.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sil', cancelButtonText: 'İptal' });
        if (result.isConfirmed && user?.token) {
            try {
                const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API}/departments/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: 'Silindi', text: 'Kategori silindi', icon: 'success' });
                fetchData();
            } catch { showSwal({ title: 'Hata', text: 'Silme hatası', icon: 'error' }); }
        }
    };

    const openModal = (item?: Department) => {
        setFormData(item ? { ...item } : { ...EMPTY });
        setIsModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">

                        <i className="fat fa-layer-group me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]">KATEGORİLER / STOK GRUBU</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Kategorileri ve çıktı profili kurallarını yönetin</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 transition-all flex items-center gap-2">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Kategori
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin/products`)} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 rounded-2xl shadow-sm hover:shadow-md transition-all mr-4 cursor-pointer">
                            <i className="fat fa-arrow-left text-lg"></i>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '50px' }}>ID</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">KATEGORİ ADI</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÇIKTI PROFİLİ OVERRIDE</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">DURUM</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İŞLEMLER</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                            <td className="px-6 py-4"><span className="text-sm font-black text-slate-400">#{item.id}</span></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500">
                                                        <i className="fat fa-layer-group text-lg"></i>
                                                    </div>
                                                    <span className="font-black text-slate-800 dark:text-white text-lg">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.outputProfileId ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                        <i className="fat fa-route text-xs"></i>
                                                        {item.outputProfile?.name || outputProfiles.find(p => p.id === item.outputProfileId)?.name || 'Bilinmiyor'}
                                                    </span>
                                                ) : <span className="text-sm font-bold text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${item.isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                                    {item.isActive ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => openModal(item)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center"><i className="fat fa-pen-field text-lg"></i></button>
                                                    <button onClick={() => handleDelete(item.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center"><i className="fat fa-trash-can text-lg"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr><td colSpan={5} className="p-20 text-center"><div className="flex flex-col items-center opacity-40"><i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i><p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Kategori bulunamadı</p></div></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-indigo-600`}></i>
                                {formData.id === 0 ? 'Yeni Kategori' : 'Kategori Düzenle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KATEGORİ ADI</label>
                                <div className="relative">
                                    <i className="fat fa-layer-group absolute left-4 top-4 text-indigo-500/50"></i>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" placeholder="ör: Yiyecek, İçecek..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">STOK GRUBU OVERRIDE PROFİLİ</label>
                                <div className="relative">
                                    <i className="fat fa-route absolute left-4 top-4 text-indigo-500/50"></i>
                                    <select value={formData.outputProfileId || ''} onChange={(e) => setFormData({ ...formData, outputProfileId: e.target.value ? parseInt(e.target.value) : 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                        <option value="">Cins Profilini Kullan (Geçersiz Kılma)</option>
                                        {outputProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 px-1">Profil seçilirse, bu kategoriye ait tüm ürünler o profile yönlendirilir.</p>
                            </div>
                            <div className="pt-2">
                                <div onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} className={`cursor-pointer flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${formData.isActive ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                                        {formData.isActive && <i className="fat fa-check text-[10px] text-white"></i>}
                                    </div>
                                    <span className={`text-sm font-black ${formData.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>Kategori Aktif</span>
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-[140px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                    İptal
                                </button>
                                <button type="submit" className="w-[140px] py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
