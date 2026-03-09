'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Zone {
    id: number;
    name: string;
    location: {
        id: number;
        name: string;
    }
}

interface Table {
    id: number;
    name: string;
    capacity: number;
    status: string;
    isActive: boolean;
    zone: Zone;
}

export default function TablesAdminPage() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('Tables');
    const tc = useTranslations('Common');
    const [tables, setTables] = useState<Table[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', capacity: 4, status: 'BOŞ', zoneId: 0, isActive: true });

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [tablesRes, zonesRes] = await Promise.all([
                axios.get('http://localhost:3050/tables', config),
                axios.get('http://localhost:3050/zones', config)
            ]);
            setTables(tablesRes.data);
            setZones(zonesRes.data);
        } catch (error) {
            console.error('Error fetching data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = {
                name: formData.name,
                capacity: formData.capacity,
                status: formData.status,
                isActive: formData.isActive,
                zone: { id: formData.zoneId }
            };

            if (formData.id === 0) {
                await axios.post('http://localhost:3050/tables', payload, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess').replace('silindi', 'eklendi'), icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/tables/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess').replace('silindi', 'güncellendi'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving table', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: t('deleteConfirmTitle'),
            text: t('deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`http://localhost:3050/tables/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting table', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    const openModal = (tbl?: Table) => {
        if (tbl) setFormData({ id: tbl.id, name: tbl.name, capacity: tbl.capacity, status: tbl.status, zoneId: tbl.zone?.id || 0, isActive: tbl.isActive });
        else setFormData({ id: 0, name: '', capacity: 4, status: 'BOŞ', zoneId: zones[0]?.id || 0, isActive: true });
        setIsModalOpen(true);
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'BOŞ': return t('statusEmpty');
            case 'DOLU': return t('statusFull');
            case 'REZERVE': return t('statusReserved');
            default: return status;
        }
    };

    const handlePrintQR = (tbl: Table) => {
        const qrUrl = `${window.location.origin}/qr-menu/${tbl.id}`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}&margin=10`;

        showSwal({
            title: `${tbl.name} - QR Menü`,
            html: `
                <div class="flex flex-col items-center justify-center p-2">
                    <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-4 inline-block">
                        <img src="${qrApiUrl}" alt="QR Kod" class="w-48 h-48 rounded-xl" />
                    </div>
                    <a href="${qrUrl}" target="_blank" class="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors break-all underline-offset-4 decoration-indigo-200 decoration-2">${qrUrl}</a>
                    <p class="text-xs font-medium text-slate-400 mt-3 max-w-[250px] mx-auto leading-relaxed">Müşteriler telefonlarının kamerasıyla bu kodu okutarak adisyon oluşturmadan dijital menünüze ulaşabilir.</p>
                </div>
            `,
            confirmButtonText: 'Tamam',
            customClass: {
                popup: 'rounded-[32px]'
            }
        });
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-table-layout me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newTable')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalTables')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{tables.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <i className="fat fa-table-cells text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('emptyTables')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{tables.filter(tbl => tbl.status === 'BOŞ').length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-circle-check text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalCapacity')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{tables.reduce((acc, tbl) => acc + tbl.capacity, 0)}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="fat fa-users text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{tc('loading')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableZone')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableName')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableCapacity')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableStatus')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {tables.map(tbl => (
                                        <tr key={tbl.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                            <td className="px-8 py-3" style={{ width: '40px' }}>
                                                <span className="text-sm font-black text-slate-400">#{tbl.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-building text-slate-400 text-xs"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {tbl.zone?.name} <span className="text-[10px] opacity-40 ml-1">({tbl.zone?.location?.name})</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-table-layout"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{tbl.name}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${tbl.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {tbl.isActive ? t('activeStatus') : tc('passive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <i className="fat fa-user-group text-slate-300"></i>
                                                    {tbl.capacity} {t('capacitySuffix')}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${tbl.status === 'BOŞ' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    tbl.status === 'DOLU' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                    }`}>
                                                    {getStatusText(tbl.status)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => handlePrintQR(tbl)} className="w-10 h-10 bg-white dark:bg-slate-800 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center" title="QR Menü">
                                                        <i className="fat fa-qrcode text-lg"></i>
                                                    </button>
                                                    <button onClick={() => openModal(tbl)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(tbl.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {tables.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-table-slash text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('notFound')}</p>
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
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-indigo-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    {t('labelZone')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <i className="fat fa-layer-group absolute left-4 top-4 text-indigo-500/50"></i>
                                    <select required value={formData.zoneId} onChange={(e) => setFormData({ ...formData, zoneId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                        <option value={0} disabled>{t('selectZone')}</option>
                                        {zones.map(z => (
                                            <option key={z.id} value={z.id}>{z.name} ({z.location?.name})</option>
                                        ))}
                                    </select>
                                    <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    {t('labelName')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <i className="fat fa-tag absolute left-4 top-4 text-indigo-500/50"></i>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" placeholder={t('placeholderName')} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelCapacity')}</label>
                                    <div className="relative">
                                        <i className="fat fa-users absolute left-4 top-4 text-indigo-500/50"></i>
                                        <input type="number" required min="1" max="50" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{tc('active')}</label>
                                    <div className="h-[54px] px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
                                        <i className="fat fa-toggle-on text-indigo-500/50"></i>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{formData.isActive ? tc('active') : tc('passive')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                    <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                </button>
                                <button type="submit" disabled={formData.zoneId === 0} className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                                    <i className="fat fa-check text-lg"></i> {tc('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
