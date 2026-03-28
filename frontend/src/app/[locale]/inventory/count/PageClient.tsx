'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface InventorySession {
    id: number;
    sessionDate: string;
    warehouseId: number | null;
    warehouse?: { id: number; name: string };
    countType: string;
    scope: string | null;
    status: string;
    isBlindCount: boolean;
    note: string | null;
    createdByUserId: number | null;
    approvedByUserId: number | null;
    approvedAt: string | null;
    createdAt: string;
    lines?: any[];
}

export function PageClient() {
    const t = useTranslations('InventoryCount');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    
    const [sessions, setSessions] = useState<InventorySession[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        sessionDate: new Date().toISOString().split('T')[0],
        warehouseId: 0,
        countType: 'FULL',
        isBlindCount: false,
        note: ''
    });

    useEffect(() => {
        if (user?.token) {
            fetchData();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [sessionsRes, whRes] = await Promise.all([
                axios.get(`${API_URL}/inventory-sessions?limit=100`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/warehouses`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] }))
            ]);
            
            setSessions(sessionsRes.data.data || []);
            setWarehouses(whRes.data || []);
        } catch (error) {
            console.error('Error fetching inventory sessions', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const payload = { 
                ...formData, 
                warehouseId: formData.warehouseId > 0 ? formData.warehouseId : null 
            };
            
            const res = await axios.post(`${API_URL}/inventory-sessions`, payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            
            toastSwal({ title: tc('success'), text: 'Sayım fişi başarıyla oluşturuldu.', icon: 'success' });
            setIsModalOpen(false);
            
            // Redirect to the session detail page
            router.push(`/${locale}/inventory/count/${res.data.id}`);
        } catch (error: any) {
            console.error('Error creating session', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Sayım oluşturulamadı.', icon: 'error' });
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
            case 'IN_PROGRESS': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'Taslak';
            case 'IN_PROGRESS': return 'Devam Ediyor';
            case 'COMPLETED': return 'Onaylandı';
            case 'CANCELLED': return 'İptal Edildi';
            default: return status;
        }
    };

    // KPIs
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const activeSessions = sessions.filter(s => s.status === 'DRAFT' || s.status === 'IN_PROGRESS').length;

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-clipboard-check me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]">SAYIM OTURUMLARI</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Envanter Sayım Fişleri</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Sayım Başlat
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Pano'ya Dön
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Sayım</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalSessions}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <i className="fat fa-boxes-stacked text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Onaylanmış (Uygulanan)</p>
                            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{completedSessions}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-check-double text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40">
                        <div>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Aktif Bekleyen</p>
                            <h3 className="text-3xl font-black text-amber-500">{activeSessions}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <i className="fat fa-hourglass-half text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-[40px] w-16">FİŞ NO</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TARİH</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">DEPO & KAPSAM</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TİP</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">DURUM</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-[40px]">İŞLEM</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {sessions.map(session => (
                                        <tr key={session.id} 
                                            onClick={() => router.push(`/${locale}/inventory/count/${session.id}`)}
                                            className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group cursor-pointer"
                                        >
                                            <td className="px-8 py-4">
                                                <span className="text-xs font-mono font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                    #{session.id}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="font-bold text-slate-800 dark:text-white">
                                                    {new Date(session.sessionDate).toLocaleDateString('tr-TR')}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                    Oluşturma: {new Date(session.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 mb-1">
                                                    <i className="fat fa-building text-slate-400 text-[10px]"></i>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        {session.warehouse?.name || 'Tüm Depolar (Genel)'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${session.countType === 'FULL' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                        {session.countType === 'FULL' ? 'TAM SAYIM' : 'KISMİ SAYIM'}
                                                    </span>
                                                    {session.isBlindCount && (
                                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                                            <i className="fat fa-eye-slash"></i> Kör Sayım
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center w-max gap-1.5 ${getStatusStyles(session.status)}`}>
                                                    <i className={`fat ${session.status === 'COMPLETED' ? 'fa-check' : session.status === 'DRAFT' || session.status === 'IN_PROGRESS' ? 'fa-spinner fa-spin-pulse' : 'fa-ban'}`}></i>
                                                    {getStatusLabel(session.status)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <div className="w-10 h-10 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center ml-auto">
                                                        <i className="fat fa-arrow-right text-lg"></i>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {sessions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-clipboard-list text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">HİÇ SAYIM BULUNAMADI, YENİ BİR SAYIM BAŞLATIN</p>
                                                </div>
                                            </td>
                                        </tr>
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
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-plus-circle text-indigo-600"></i>
                                    YENİ SAYIM BAŞLAT
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Sistemdeki stokların fiili durumunu belirleyin</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-auto p-8">
                            <form id="sessionForm" onSubmit={handleCreateSession} className="space-y-6">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sayım Tarihi</label>
                                        <div className="relative">
                                            <i className="fat fa-calendar absolute left-4 top-3.5 text-indigo-500/50"></i>
                                            <input type="date" required value={formData.sessionDate} onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sayılacak Depo / Konum</label>
                                        <div className="relative">
                                            <i className="fat fa-building absolute left-4 top-3.5 text-indigo-500/50"></i>
                                            <select value={formData.warehouseId} onChange={(e) => setFormData({ ...formData, warehouseId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                <option value={0}>Tüm Depolar (Genel)</option>
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                            <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sayım Tipi</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div 
                                            onClick={() => setFormData({ ...formData, countType: 'FULL' })}
                                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center ${formData.countType === 'FULL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                        >
                                            <i className={`fat fa-layer-group text-2xl mb-2 ${formData.countType === 'FULL' ? 'text-indigo-600' : 'text-slate-400'}`}></i>
                                            <h6 className={`text-sm font-black mb-1 ${formData.countType === 'FULL' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>Tam Sayım</h6>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest m-0 leading-tight">Tüm stok kartları listeye eklenir</p>
                                        </div>
                                        <div 
                                            onClick={() => setFormData({ ...formData, countType: 'PARTIAL' })}
                                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center ${formData.countType === 'PARTIAL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                                        >
                                            <i className={`fat fa-list-check text-2xl mb-2 ${formData.countType === 'PARTIAL' ? 'text-indigo-600' : 'text-slate-400'}`}></i>
                                            <h6 className={`text-sm font-black mb-1 ${formData.countType === 'PARTIAL' ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}>Kısmi Sayım</h6>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest m-0 leading-tight">Sadece belirlediğiniz stoklar için</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                <i className="fat fa-eye-slash"></i>
                                            </div>
                                            <div>
                                                <h6 className="text-sm font-black text-amber-900 dark:text-amber-400 mb-0.5">Kör Sayım Modu <span className="px-2 py-0.5 text-[9px] bg-red-100 text-red-600 uppercase tracking-widest rounded ml-1">Önerilen</span></h6>
                                                <p className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest m-0">Sayan kişi sistemdeki mevcut (teorik) stoğu göremez</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={formData.isBlindCount} onChange={(e) => setFormData({ ...formData, isBlindCount: e.target.checked })} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sayım Açıklaması (Opsiyonel)</label>
                                    <textarea 
                                        value={formData.note || ''} 
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })} 
                                        rows={2}
                                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow resize-none" 
                                        placeholder="Gerekirse not ekleyin..."
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        
                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex gap-3 justify-end items-center">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 rounded-2xl font-black text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-all">
                                {tc('cancel')}
                            </button>
                            <button type="submit" form="sessionForm" className="px-10 py-3.5 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2">
                                <i className="fat fa-play"></i> SAYIMI BAŞLAT (FİŞ OLUŞTUR)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
