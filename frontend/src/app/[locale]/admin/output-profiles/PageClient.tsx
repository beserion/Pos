'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';

interface Printer { id: number; name: string; }

interface OutputProfile {
    id: number;
    name: string;
    mainPrinterId: number;
    mainPrinter?: Printer | null;
    kdsEnabled: boolean;
    kdsTarget: string;
    infoPrinterId: number;
    infoPrinter?: Printer | null;
    copyCount: number;
    warnIfNoPrinter: boolean;
    infoOnly: boolean;
    noOutput: boolean;
    isActive: boolean;
}

const EMPTY: OutputProfile = { id: 0, name: '', mainPrinterId: 0, kdsEnabled: false, kdsTarget: '', infoPrinterId: 0, copyCount: 1, warnIfNoPrinter: true, infoOnly: false, noOutput: false, isActive: true };

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [items, setItems] = useState<OutputProfile[]>([]);
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<OutputProfile>({ ...EMPTY });

    useEffect(() => { if (user?.token) fetchData(); else if (user === null) setLoading(false); }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const h = { headers: { Authorization: `Bearer ${user.token}` } };
            const [res, pRes] = await Promise.all([
                axios.get(`${API}/output-profiles`, h),
                axios.get(`${API}/printers`, h),
            ]);
            setItems(res.data);
            setPrinters(pRes.data);
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
                const { id, mainPrinter, infoPrinter, ...data } = payload as any;
                await axios.post(`${API}/output-profiles`, data, h);
                toastSwal({ title: 'Başarılı', text: 'Kaydedildi', icon: 'success' });
            } else {
                const { mainPrinter, infoPrinter, ...data } = payload as any;
                await axios.put(`${API}/output-profiles/${payload.id}`, data, h);
                toastSwal({ title: 'Başarılı', text: 'Güncellendi', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            showSwal({ title: 'Hata', text: err?.response?.data?.message || 'Kayıt hatası', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({ title: 'Emin misiniz?', text: 'Bu çıktı profili silinecek.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sil', cancelButtonText: 'İptal' });
        if (result.isConfirmed && user?.token) {
            try {
                const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API}/output-profiles/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: 'Silindi', text: 'Profil silindi', icon: 'success' });
                fetchData();
            } catch { showSwal({ title: 'Hata', text: 'Silme hatası', icon: 'error' }); }
        }
    };

    const openModal = (item?: OutputProfile) => {
        setFormData(item ? { ...item } : { ...EMPTY });
        setIsModalOpen(true);
    };

    const Toggle = ({ label, value, onChange, color = 'teal' }: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string }) => (
        <div onClick={() => onChange(!value)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${value ? `bg-${color}-50 border-${color}-500 dark:bg-${color}-500/10` : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${value ? `border-${color}-600 bg-${color}-600` : 'border-slate-300'}`}>
                {value && <i className="fat fa-check text-[10px] text-white"></i>}
            </div>
            <span className={`text-sm font-black ${value ? `text-${color}-700 dark:text-${color}-400` : 'text-slate-500'}`}>{label}</span>
        </div>
    );

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-route me-3 text-cyan-600 dark:text-cyan-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-cyan-600 dark:text-cyan-400 leading-none uppercase tracking-[0.25em]">ÇIKTI PROFİLLERİ</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Yazıcı, KDS ve bilgi fişi yönlendirme profilleri</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Profil
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '50px' }}>ID</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">PROFİL ADI</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ANA YAZICI</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">KDS</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">BİLGİ YAZICI</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÖZEL DURUM</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İŞLEMLER</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10 transition-all group">
                                            <td className="px-6 py-4"><span className="text-sm font-black text-slate-400">#{item.id}</span></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.noOutput ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500'}`}>
                                                        <i className={`fat ${item.noOutput ? 'fa-ban' : 'fa-route'} text-lg`}></i>
                                                    </div>
                                                    <span className="font-black text-slate-800 dark:text-white text-lg">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.mainPrinter?.name || printers.find(p => p.id === item.mainPrinterId)?.name || '-'}</span></td>
                                            <td className="px-6 py-4"><span className={`text-[10px] font-black uppercase tracking-widest ${item.kdsEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>{item.kdsEnabled ? 'Aktif' : 'Kapalı'}</span></td>
                                            <td className="px-6 py-4"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.infoPrinter?.name || printers.find(p => p.id === item.infoPrinterId)?.name || '-'}</span></td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {item.noOutput && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-black uppercase rounded-md tracking-wide">Çıktı Yok</span>}
                                                    {item.infoOnly && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[10px] font-black uppercase rounded-md tracking-wide">Sadece Bilgi</span>}
                                                    {item.copyCount > 1 && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black uppercase rounded-md tracking-wide">{item.copyCount} Kopya</span>}
                                                    {!item.noOutput && !item.infoOnly && item.copyCount <= 1 && <span className="text-sm text-slate-400">-</span>}
                                                </div>
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
                                        <tr><td colSpan={7} className="p-20 text-center"><div className="flex flex-col items-center opacity-40"><i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i><p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Henüz çıktı profili tanımlanmamış</p></div></td></tr>
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-cyan-600`}></i>
                                    {formData.id === 0 ? 'Yeni Çıktı Profili' : 'Profil Düzenle'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-5 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">PROFİL ADI</label>
                                <div className="relative">
                                    <i className="fat fa-route absolute left-4 top-4 text-cyan-500/50"></i>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="ör: İçecek Profili, Mutfak Profili..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <SearchableSelect
                                        value={formData.mainPrinterId || ''}
                                        onChange={(val) => setFormData({ ...formData, mainPrinterId: val ? parseInt(val) : 0 })}
                                        options={[
                                            { value: '', label: 'Yazıcı yok' },
                                            ...printers.map(p => ({ value: p.id.toString(), label: p.name }))
                                        ]}
                                        icon="fat fa-print"
                                    />
                                </div>
                                <div>
                                    <SearchableSelect
                                        value={formData.infoPrinterId || ''}
                                        onChange={(val) => setFormData({ ...formData, infoPrinterId: val ? parseInt(val) : 0 })}
                                        options={[
                                            { value: '', label: 'Yazıcı yok' },
                                            ...printers.map(p => ({ value: p.id.toString(), label: p.name }))
                                        ]}
                                        icon="fat fa-file-invoice"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KOPYA SAYISI</label>
                                    <input type="number" min="1" max="10" value={formData.copyCount} onChange={(e) => setFormData({ ...formData, copyCount: parseInt(e.target.value) || 1 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow text-center" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KDS HEDEFİ</label>
                                    <input type="text" value={formData.kdsTarget || ''} onChange={(e) => setFormData({ ...formData, kdsTarget: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="KDS hedef adı (opsiyonel)" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Toggle label="KDS Aktif" value={formData.kdsEnabled} onChange={(v) => setFormData({ ...formData, kdsEnabled: v })} color="emerald" />
                                <Toggle label="Uyarı Ver" value={formData.warnIfNoPrinter} onChange={(v) => setFormData({ ...formData, warnIfNoPrinter: v })} color="amber" />
                                <Toggle label="Sadece Bilgi Fişi" value={formData.infoOnly} onChange={(v) => setFormData({ ...formData, infoOnly: v, noOutput: v ? false : formData.noOutput })} color="blue" />
                                <Toggle label="Çıktı Yok (Tamamen)" value={formData.noOutput} onChange={(v) => setFormData({ ...formData, noOutput: v, infoOnly: v ? false : formData.infoOnly })} color="red" />
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-[160px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                    <i className="fat fa-xmark text-lg"></i> İptal
                                </button>
                                <button type="submit" className="w-[160px] py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <i className="fat fa-check text-lg"></i> Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
