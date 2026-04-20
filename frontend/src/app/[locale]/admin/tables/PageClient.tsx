'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';

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

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('Tables');
    const tc = useTranslations('Common');
    const tz = useTranslations('Zones');
    const tl = useTranslations('Locations');
    const [tables, setTables] = useState<Table[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [formData, setFormData] = useState({ id: 0, name: '', capacity: 4, status: 'BOŞ', zoneId: 0, isActive: true });
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({ zoneId: 0, count: 10, prefix: 'Masa', capacity: 4 });
    const [filterZoneId, setFilterZoneId] = useState<number>(0);

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [tablesRes, zonesRes, locationsRes] = await Promise.all([
                axios.get((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/tables', config),
                axios.get((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/zones', config),
                axios.get((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/locations', config)
            ]);
            setTables(tablesRes.data);
            setZones(zonesRes.data);
            setLocations(locationsRes.data);
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
                await axios.post((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/tables', payload, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess').replace('silindi', 'eklendi'), icon: 'success' });
            } else {
                await axios.put(`${(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'))}/tables/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess').replace('silindi', 'güncellendi'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving table', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleBulkCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        if (bulkFormData.zoneId === 0) {
            showSwal({ title: tc('error'), text: 'Lütfen bir bölüm seçiniz.', icon: 'error' });
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/tables/bulk', bulkFormData, config);
            toastSwal({ title: tc('success'), text: t('bulkAddSuccess'), icon: 'success' });
            setIsBulkModalOpen(false);
            fetchData();
        } catch (error: any) {
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
                await axios.delete(`${(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'))}/tables/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error: any) {
                const message = error.response?.data?.message || tc('error');
                showSwal({ title: tc('error'), text: message, icon: 'error' });
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
        setSelectedTable(tbl);
        setIsQRModalOpen(true);
    };

    const filteredTables = filterZoneId === 0 ? tables : tables.filter(t => t.zone?.id === filterZoneId);

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-table me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-1 mb-0"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { setFormData({ id: 0, name: '', capacity: 4, status: 'BOŞ', zoneId: zones[0]?.id || 0, isActive: true }); setIsModalOpen(true); }} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newTable')}
                        </button>
                        <button onClick={() => { setBulkFormData({ ...bulkFormData, zoneId: zones[0]?.id || 0 }); setIsBulkModalOpen(true); }} className="px-6 py-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-layer-group text-lg"></i> {t('bulkAddTables')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-shop text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tl('totalLocations')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{locations.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <i className="fat fa-grid-2 text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tz('totalZones')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{zones.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <i className="fat fa-table-cells text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalTables')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{filteredTables.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-[0_8px_30px_-5px_rgba(139,92,246,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <i className="fat fa-circle-check text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('emptyTables')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{filteredTables.filter(tbl => tbl.status === 'BOŞ').length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="fat fa-users-rays text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalCapacity')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{filteredTables.reduce((acc, tbl) => acc + tbl.capacity, 0)}</h3>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setFilterZoneId(0)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${filterZoneId === 0
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl text-slate-500 dark:text-slate-400 border border-white dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                    >
                        Tüm Bölümler
                    </button>
                    {zones.map(z => (
                        <button
                            key={z.id}
                            onClick={() => setFilterZoneId(z.id)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${filterZoneId === z.id
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20'
                                : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl text-slate-500 dark:text-slate-400 border border-white dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                        >
                            {z.name}
                        </button>
                    ))}
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
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tableName')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tableCapacity')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tableStatus')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredTables.map(tbl => (
                                        <tr key={tbl.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                            <td className="px-8 py-2" style={{ width: '40px' }}>
                                                <span className="text-sm font-black text-slate-400">#{tbl.id}</span>
                                            </td>
                                            <td className="px-8 py-2">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-building text-slate-400 text-xs"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {tbl.zone?.name} <span className="text-[10px] opacity-40 ml-1">({tbl.zone?.location?.name})</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-2">
                                                <div className="flex items-center justify-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-table"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{tbl.name}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${tbl.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {tbl.isActive ? t('activeStatus') : tc('passive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                                                    <i className="fat fa-user-group text-slate-300"></i>
                                                    {tbl.capacity} {t('capacitySuffix')}
                                                </p>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${tbl.status === 'BOŞ' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    tbl.status === 'DOLU' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                    }`}>
                                                    {getStatusText(tbl.status)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <div
                                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border ${tbl.isActive
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                                        }`}
                                                    title={tbl.isActive ? 'Aktif' : 'Pasif'}
                                                >
                                                    <i className={`fat ${tbl.isActive ? 'fa-check' : 'fa-power-off'}`}></i>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <div className="flex gap-2 justify-center transition-all">
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
                                    {filteredTables.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center">
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
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-indigo-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                <div className="flex-1 overflow-y-auto p-8 space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                            {t('labelZone')} <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <i className="fat fa-layer-group absolute left-4 top-4 text-indigo-500/50"></i>
                                            <div className="-m-2 w-full">
                                                <SearchableSelect
                                                    value={formData.zoneId}
                                                    onChange={(val) => setFormData({ ...formData, zoneId: parseInt(val.toString()) || 0 })}
                                                    options={[
                                                        { value: 0, label: t('selectZone') },
                                                        ...zones.map(z => ({ value: z.id, label: `${z.name} (${z.location?.name})` }))
                                                    ]}
                                                />
                                            </div>
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

                                </div>

                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" disabled={formData.zoneId === 0} className="w-[200px] py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                                        <i className="fat fa-check text-lg"></i> {tc('save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* QR Modal */}
            {isQRModalOpen && selectedTable && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-qrcode text-indigo-600"></i>
                                    {selectedTable.name}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">QUICK QR MENU</p>
                            </div>
                            <button onClick={() => setIsQRModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        {/* Content */}
                        <div className="p-8 flex flex-col items-center">
                            <div className="bg-white p-6 rounded-[48px] shadow-sm border-[8px] border-slate-50 dark:border-slate-800 inline-block overflow-hidden mb-8">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/${locale}/qr-menu/${selectedTable.id}`)}&margin=10&bgcolor=ffffff&color=000000`}
                                    alt="QR Kod"
                                    className="w-56 h-56 block scale-110"
                                />
                            </div>

                            <div className="w-full space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[24px] border border-slate-100 dark:border-slate-700">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5 text-center">Menü Bağlantısı</p>
                                    <a
                                        href={`${window.location.origin}/${locale}/qr-menu/${selectedTable.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold break-all block text-center hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                    >
                                        {window.location.origin}/{locale}/qr-menu/{selectedTable.id}
                                    </a>
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-[300px] mx-auto text-center font-bold px-4 italic">
                                    Müşterileriniz bu kodu okutarak telefonlarından dijital menünüze anında ulaşabilir.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-center h-[100px] items-center">
                            <button
                                onClick={() => window.print()}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fat fa-print text-lg"></i> Kodu Yazdır
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Creation Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-layer-group text-violet-600"></i>
                                    {t('bulkAddTables')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsBulkModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleBulkCreate} className="flex flex-col h-full w-full">
                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                            {t('labelZone')} <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <i className="fat fa-building absolute left-4 top-4 text-violet-500/50"></i>
                                            <div className="-m-2 w-full">
                                                <SearchableSelect
                                                    value={bulkFormData.zoneId}
                                                    onChange={(val) => setBulkFormData({ ...bulkFormData, zoneId: parseInt(val.toString()) || 0 })}
                                                    options={[
                                                        { value: 0, label: t('selectZone') },
                                                        ...zones.map(z => ({ value: z.id, label: `${z.name} (${z.location?.name})` }))
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                                {t('tableCount')} <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <i className="fat fa-hashtag absolute left-4 top-4 text-violet-500/50"></i>
                                                <input type="number" required min="1" max="50" value={bulkFormData.count} onChange={(e) => setBulkFormData({ ...bulkFormData, count: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-violet-500/10 outline-none transition-shadow" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                                {t('labelCapacity')} <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <i className="fat fa-users absolute left-4 top-4 text-violet-500/50"></i>
                                                <input type="number" required min="1" max="50" value={bulkFormData.capacity} onChange={(e) => setBulkFormData({ ...bulkFormData, capacity: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-violet-500/10 outline-none transition-shadow" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                            {t('namePrefix')} <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <i className="fat fa-tag absolute left-4 top-4 text-violet-500/50"></i>
                                            <input type="text" required value={bulkFormData.prefix} onChange={(e) => setBulkFormData({ ...bulkFormData, prefix: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-violet-500/10 outline-none transition-shadow" placeholder="Örn: Masa" />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 px-1 italic">Not: Masalar "{bulkFormData.prefix} 1", "{bulkFormData.prefix} 2" şeklinde isimlendirilecektir.</p>
                                    </div>
                                </div>

                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsBulkModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" disabled={bulkFormData.zoneId === 0} className="w-[200px] py-4 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                                        <i className="fat fa-plus text-lg"></i> {tc('bulkAdd')}
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
