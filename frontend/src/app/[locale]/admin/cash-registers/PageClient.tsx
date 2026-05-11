'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';
interface CashRegister {
    id: number;
    name: string;
    isActive: boolean;
    receiptPrinterId: number | null;
    receiptPrinter?: any;
    receiptProfileId: number | null;
    receiptProfile?: any;
    zoneIds?: number[];
    allowedPaymentMethods?: string[];
}

interface Zone {
    id: number;
    name: string;
}


export function PageClient() {
    const router = useRouter();
    const { user } = useAuth();
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [printers, setPrinters] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const tCommon = useTranslations('Common');
    const locale = useLocale();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CashRegister>>({ id: 0, name: '', isActive: true, receiptPrinterId: null, receiptProfileId: null, zoneIds: [], allowedPaymentMethods: [] });

    const PAYMENT_METHODS = ['Nakit', 'Kart', 'Parçalı', 'Cari', 'Yemek Kartı', 'Online', 'KASA'];

    useEffect(() => {
        if (user?.token) {
            fetchRegisters();
            fetchZones();
            fetchPrinters();
            fetchProfiles();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user]);

    const fetchZones = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await axios.get(`${API_URL}/zones`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setZones(res.data);
        } catch (error) {
            console.error('Error fetching zones', error);
        }
    };

    const fetchPrinters = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await axios.get(`${API_URL}/printers`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPrinters(res.data);
        } catch (error) {
            console.error('Error fetching printers', error);
        }
    };

    const fetchProfiles = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await axios.get(`${API_URL}/output-profiles`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setProfiles(res.data);
        } catch (error) {
            console.error('Error fetching profiles', error);
        }
    };

    const fetchRegisters = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await axios.get(`${API_URL}/cash-registers`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setRegisters(res.data);
        } catch (error) {
            console.error('Error fetching registers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            if (formData.id === 0) {
                const { id, ...postData } = formData;
                await axios.post(`${API_URL}/cash-registers`, postData, config);
                toastSwal({ title: tCommon('success'), text: 'Yeni kasa oluşturuldu', icon: 'success' });
            } else {
                await axios.put(`${API_URL}/cash-registers/${formData.id}`, formData, config);
                toastSwal({ title: tCommon('success'), text: 'Kasa güncellendi', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchRegisters();
        } catch (error: any) {
            console.error('Error saving register', error);
            showSwal({ title: tCommon('error'), text: error?.response?.data?.message || tCommon('error'), icon: 'error' });
        }
    };

    const handleToggleStatus = async (reg: CashRegister) => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            await axios.put(`${API_URL}/cash-registers/${reg.id}`, { ...reg, isActive: !reg.isActive }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchRegisters();
        } catch (error) {
            console.error('Error toggling status', error);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: 'Bu kasayı silmek istediğinize emin misiniz?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tCommon('delete'),
            cancelButtonText: tCommon('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
                await axios.delete(`${API_URL}/cash-registers/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tCommon('delete'), text: 'Kasa silindi', icon: 'success' });
                fetchRegisters();
            } catch (error) {
                console.error('Error deleting register', error);
                showSwal({ title: tCommon('error'), text: tCommon('error'), icon: 'error' });
            }
        }
    };

    const openModal = (reg?: CashRegister) => {
        if (reg) {
            const regData = { ...reg };
            if (typeof regData.zoneIds === 'string') {
                regData.zoneIds = (regData.zoneIds as string).split(',').filter(x => x).map(Number);
            } else if (!regData.zoneIds) {
                regData.zoneIds = [];
            }
            if (typeof regData.allowedPaymentMethods === 'string') {
                regData.allowedPaymentMethods = (regData.allowedPaymentMethods as string).split(',').filter(x => x);
            } else if (!regData.allowedPaymentMethods) {
                regData.allowedPaymentMethods = [];
            }
            setFormData(regData);
        } else {
            setFormData({ id: 0, name: '', isActive: true, receiptPrinterId: null, receiptProfileId: null, zoneIds: [], allowedPaymentMethods: [] });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-cash-register me-3 text-emerald-600 dark:text-emerald-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-emerald-600 dark:text-emerald-400 leading-none uppercase tracking-[0.25em]" id="title">KASA YÖNETİMİ</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-emerald-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">POS terminallerini ve kasa yazıcılarını yönetin.</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Kasa
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tCommon('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Kasa</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{registers.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-cash-register text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{tCommon('loading')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>ID</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kasa Bilgisi</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetkili Bölümler</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ödeme Yöntemleri</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Çıktı Profili / Yazıcı</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {registers.map(reg => (
                                        <tr key={reg.id} className="hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{reg.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-cash-register"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{reg.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        onClick={() => handleToggleStatus(reg)}
                                                        className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out flex items-center ${reg.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                    >
                                                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${reg.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${reg.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        {reg.isActive ? 'AKTİF' : 'PASİF'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <i className="fat fa-layer-group text-slate-300"></i>
                                                    <div className="flex flex-wrap gap-1">
                                                        {reg.zoneIds && (typeof reg.zoneIds === 'string' ? (reg.zoneIds as string).split(',').filter(x => x).length > 0 : (reg.zoneIds as any).length > 0) ? (
                                                            (() => {
                                                                const ids = typeof reg.zoneIds === 'string' 
                                                                    ? (reg.zoneIds as string).split(',').filter(x => x).map(Number)
                                                                    : (reg.zoneIds || []);
                                                                return ids.map(zid => {
                                                                    const z = zones.find(curr => curr.id === Number(zid));
                                                                    return z ? (
                                                                        <span key={zid} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold">
                                                                            {z.name}
                                                                        </span>
                                                                    ) : null;
                                                                });
                                                            })()
                                                        ) : <span className="text-slate-300">Bölüm Atanmamış</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <i className="fat fa-credit-card text-slate-300"></i>
                                                    <div className="flex flex-wrap gap-1">
                                                        {reg.allowedPaymentMethods && (typeof reg.allowedPaymentMethods === 'string' ? (reg.allowedPaymentMethods as string).split(',').filter(x => x).length > 0 : (reg.allowedPaymentMethods as any).length > 0) ? (
                                                            (() => {
                                                                const methods = typeof reg.allowedPaymentMethods === 'string' 
                                                                    ? (reg.allowedPaymentMethods as string).split(',').filter(x => x)
                                                                    : (reg.allowedPaymentMethods || []);
                                                                return methods.map(m => (
                                                                    <span key={m} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold">
                                                                        {m}
                                                                    </span>
                                                                ));
                                                            })()
                                                        ) : <span className="text-slate-300">Ödeme Yöntemi Seçilmedi</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {reg.receiptProfile ? (
                                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                            <i className="fat fa-file-invoice text-emerald-300"></i>
                                                            {reg.receiptProfile.name}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                            <i className="fat fa-print text-slate-300"></i>
                                                            {reg.receiptPrinter ? reg.receiptPrinter.name : 'Seçilmedi'}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(reg)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(reg.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {registers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-cash-register text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Kayıtlı Kasa Bulunamadı</p>
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

            {/* Modal - modal-rule */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-emerald-600`}></i>
                                    {formData.id === 0 ? 'YENİ KASA' : 'KASA DÜZENLE'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Terminal bilgilerini eksiksiz doldurun</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                <div className="flex-1 overflow-y-auto w-full p-8 space-y-5">
                                    {/* modal-rule: input-group with wd-130 label */}
                                    <div className="space-y-4">
                                        <div className="input-group flex items-center h-[54px] w-full">
                                            <div className="input-group-text wd-130 font-bold bg-slate-100 dark:bg-slate-900/50 border border-r-0 border-slate-200 dark:border-slate-700 h-full flex items-center px-4 rounded-l-2xl text-[10px] uppercase tracking-widest text-slate-400">
                                                Kasa Adı <span className="text-danger ml-1">*</span>
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name || ''}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="form-control flex-1 h-full px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:ring-0 outline-none"
                                                placeholder="Örn: Ana Kasa"
                                            />
                                            <div className="input-group-text wd-50 bg-slate-100 dark:bg-slate-900/50 border border-l-0 border-slate-200 dark:border-slate-700 h-full flex items-center justify-center px-4 rounded-r-2xl text-emerald-500/50">
                                                <i className="fat fa-cash-register"></i>
                                            </div>
                                        </div>

                                        <div className="space-y-2 w-full pt-2">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">Çıktı Profili</span>
                                                <i className="fat fa-file-invoice text-emerald-500/50"></i>
                                            </div>
                                            <div className="input-group flex items-center h-[54px] w-full">
                                                <SearchableSelect
                                                    value={formData.receiptProfileId?.toString() || ''}
                                                    onChange={(val) => setFormData({ ...formData, receiptProfileId: val ? Number(val) : null, receiptPrinterId: val ? null : formData.receiptPrinterId })}
                                                    options={[
                                                        { value: '', label: '-- Profil Seçilmedi --' },
                                                        ...profiles.map(p => ({ value: p.id.toString(), label: p.name }))
                                                    ]}
                                                    icon="fat fa-file-invoice"
                                                />
                                                <div className="input-group-text wd-50 bg-slate-100 dark:bg-slate-900/50 border border-l-0 border-slate-200 dark:border-slate-700 h-full flex items-center justify-center px-4 rounded-r-2xl text-emerald-500/50">
                                                    <i className="fat fa-file-invoice"></i>
                                                </div>
                                            </div>
                                        </div>

                                        {!formData.receiptProfileId && (
                                            <div className="space-y-2 w-full">
                                                <div className="flex items-center justify-between px-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-slate-400">Fiş Yazıcısı (Profilsiz)</span>
                                                    <i className="fat fa-print text-slate-400/50"></i>
                                                </div>
                                                <div className="input-group flex items-center h-[54px] w-full">
                                                    <SearchableSelect
                                                        value={formData.receiptPrinterId?.toString() || ''}
                                                        onChange={(val) => setFormData({ ...formData, receiptPrinterId: val ? Number(val) : null })}
                                                        options={[
                                                            { value: '', label: '-- Yazıcı Seçilmedi --' },
                                                            ...printers.map(p => ({ value: p.id.toString(), label: p.name }))
                                                        ]}
                                                        icon="fat fa-print"
                                                    />
                                                    <div className="input-group-text wd-50 bg-slate-100 dark:bg-slate-900/50 border border-l-0 border-slate-200 dark:border-slate-700 h-full flex items-center justify-center px-4 rounded-r-2xl text-emerald-500/50">
                                                        <i className="fat fa-print"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-blue-500">Yetkili Bölümler</span>
                                                <i className="fat fa-layer-group text-blue-500/50"></i>
                                            </div>
                                            
                                            <div className="bg-white/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap gap-2">
                                                {zones.length > 0 ? zones.map(z => {
                                                    const isSelected = formData.zoneIds?.includes(z.id) || formData.zoneIds?.includes(String(z.id) as any);
                                                    return (
                                                        <button 
                                                            key={z.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setFormData({ ...formData, zoneIds: formData.zoneIds?.filter(id => Number(id) !== z.id) });
                                                                } else {
                                                                    setFormData({ ...formData, zoneIds: [...(formData.zoneIds || []), z.id] });
                                                                }
                                                            }}
                                                            className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border outline-none active:scale-95 shadow-sm ${
                                                                isSelected 
                                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white ring-2 ring-blue-500/20 translate-y-[-1px]' 
                                                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500 dark:hover:border-blue-500/40 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                                                                <i className={`fas ${isSelected ? 'fa-check' : 'fa-th-large'} text-[9px]`}></i>
                                                            </div>
                                                            {z.name}
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="w-full flex items-center gap-2 opacity-50 p-2">
                                                        <i className="fat fa-info-circle text-lg text-slate-400"></i>
                                                        <span className="text-xs font-bold text-slate-400 tracking-wide">Sistemde kayıtlı bölüm bulunamadı.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">İzin Verilen Ödeme Yöntemleri</span>
                                                <i className="fat fa-credit-card text-emerald-500/50"></i>
                                            </div>
                                            
                                            <div className="bg-white/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                                <div className="flex flex-wrap gap-2 relative z-10">
                                                    {PAYMENT_METHODS.map(method => {
                                                        const isSelected = formData.allowedPaymentMethods?.includes(method);
                                                        
                                                        const getIcon = (m: string) => {
                                                            switch(m.toLowerCase()) {
                                                                case 'nakit': return 'fa-money-bill-wave';
                                                                case 'kart': return 'fa-credit-card';
                                                                case 'parçalı': return 'fa-chart-pie';
                                                                case 'cari': return 'fa-book-open';
                                                                case 'yemek kartı': return 'fa-pizza-slice';
                                                                case 'kasa': return 'fa-cash-register';
                                                                case 'online': return 'fa-globe';
                                                                default: return 'fa-wallet';
                                                            }
                                                        };

                                                        return (
                                                            <button 
                                                                key={method}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setFormData({ ...formData, allowedPaymentMethods: formData.allowedPaymentMethods?.filter(m => m !== method) });
                                                                    } else {
                                                                        setFormData({ ...formData, allowedPaymentMethods: [...(formData.allowedPaymentMethods || []), method] });
                                                                    }
                                                                }}
                                                                className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border outline-none active:scale-95 shadow-sm ${
                                                                    isSelected 
                                                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white ring-2 ring-emerald-500/20 translate-y-[-1px]' 
                                                                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-500/40 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                                                                }`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-white/20 text-white shadow-inner scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                                                                    <i className={`fat ${getIcon(method)} text-[10px]`}></i>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                                                                    {isSelected && <i className="fas fa-check text-[9px] opacity-70"></i>}
                                                                    {method}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {(!formData.allowedPaymentMethods || formData.allowedPaymentMethods.length === 0) && (
                                                    <div className="mt-1 p-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center gap-2 text-blue-600 dark:text-blue-400 relative z-10 transition-all duration-500">
                                                        <i className="fat fa-info-circle text-base shrink-0"></i>
                                                        <p className="text-[10px] font-bold tracking-wide mb-0 leading-tight">
                                                            Hiçbir yöntem seçilmezse, kasiyer bu kasadan <span className="underline decoration-blue-300 dark:decoration-blue-700 underline-offset-2">tüm ödeme yöntemlerini</span> kullanabilir.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="input-group flex items-center h-[54px]">
                                            <div className="input-group-text wd-130 font-bold bg-slate-100 dark:bg-slate-900/50 border border-r-0 border-slate-200 dark:border-slate-700 h-full flex items-center px-4 rounded-l-2xl text-[10px] uppercase tracking-widest text-slate-400">
                                                Durum
                                            </div>
                                            <div className="form-control flex-1 h-full px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center">
                                                <div 
                                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-all duration-300 ease-in-out flex items-center ${formData.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                >
                                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                                <span className={`ml-3 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${formData.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {formData.isActive ? 'AKTİF' : 'PASİF'}
                                                </span>
                                            </div>
                                            <div className="input-group-text wd-50 bg-slate-100 dark:bg-slate-900/50 border border-l-0 border-slate-200 dark:border-slate-700 h-full flex items-center justify-center px-4 rounded-r-2xl text-emerald-500/50">
                                                <i className="fat fa-power-off"></i>
                                            </div>
                                        </div>
                                    </div>

                                <hr className="my-0 border-slate-100 dark:border-slate-700" />

                                <div className="p-8 shrink-0 flex justify-between items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-soft-danger btn-label border-0 bg-red-50 dark:bg-red-500/10 text-red-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center transition-all hover:bg-red-100">
                                        <i className="fas fa-times mr-2"></i> İptal
                                    </button>
                                    <button onClick={() => handleSave()} type="button" className="btn btn-soft-success btn-label border-0 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                                        <i className="fas fa-save mr-2"></i> Kasa Kaydet
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
