'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Printer {
    id: number;
    name: string;
    location?: string;
    printerName?: string;
    ipAddress: string;
    isActive: boolean;
}

export function PageClient() {
    const t = useTranslations('Printers');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedPrinters, setScannedPrinters] = useState<any[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', location: '', printerName: '', ipAddress: '', isActive: true });

    useEffect(() => {
        if (user?.token) {
            fetchPrinters();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user]);

    const fetchPrinters = async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/printers', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPrinters(res.data);
        } catch (error) {
            console.error('Error fetching printers', error);
            showSwal({ title: tc('error'), text: t('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const scanPrinters = async () => {
        setIsScannerOpen(true);
        setIsScanning(true);
        try {
            const res = await axios.get(`${(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'))}/printers/discover`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            if (res.data?.success) {
                setScannedPrinters(res.data.printers);
            } else {
                showSwal({ title: tc('error'), text: res.data?.message || tc('error'), icon: 'error' });
            }
        } catch (error) {
           console.error(error);
           showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
        } finally {
            setIsScanning(false);
        }
    };

    const selectScannedPrinter = (p: any) => {
        setIsScannerOpen(false);
        // Try to extract IP if port looks like an IP or starts with IP_ (Standard TCP/IP Port)
        const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        const match = p.port && p.port.match(ipRegex);
        const ipAddr = match ? match[0] : '';
        const isUsb = p.port && (p.port.toLowerCase().includes('usb') || !ipAddr);

        setFormData({
            id: 0,
            name: p.name,
            location: '',
            printerName: p.name, 
            ipAddress: isUsb ? p.name : ipAddr,
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (formData.id === 0) {
                const { id, ...postData } = formData;
                await axios.post((typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) + '/printers', postData, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess'), icon: 'success' });
            } else {
                const { id, ...putData } = formData;
                await axios.put(`${(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'))}/printers/${id}`, putData, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchPrinters();
        } catch (error: any) {
            console.error('Error saving printer', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: t('deleteConfirmTitle'),
            text: t('deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('delete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`${(typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'))}/printers/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('delete'), text: t('deleteSuccess'), icon: 'success' });
                fetchPrinters();
            } catch (error) {
                console.error('Error deleting printer', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    const openModal = (printer?: Printer) => {
        if (printer) setFormData({ ...printer, location: printer.location || '', printerName: printer.printerName || '' });
        else setFormData({ id: 0, name: '', location: '', printerName: '', ipAddress: '', isActive: true });
        setIsModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-print me-3 text-sky-600 dark:text-sky-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-sky-600 dark:text-sky-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-sky-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={scanPrinters} className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-radar text-lg"></i> OTOMATİK TARA
                        </button>
                        <button onClick={() => openModal()} className="px-6 py-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newPrinter')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar - cardrighticon */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('activePrinters')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{printers.filter(p => p.isActive).length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-circle-check text-3xl"></i>
                        </div>
                    </div>
                    
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-[0_8px_30px_-5px_rgba(244,63,94,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('passivePrinters') || 'Pasif Yazıcılar'}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{printers.filter(p => !p.isActive).length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <i className="fat fa-circle-xmark text-3xl"></i>
                        </div>
                    </div>

                    {/* Empty Space for 3rd Column */}
                    <div className="hidden md:block"></div>

                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-sky-300 dark:hover:border-sky-500/40 hover:shadow-[0_8px_30px_-5px_rgba(14,165,233,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalPrinters')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{printers.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                            <i className="fat fa-print text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loading')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableInfo')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('labelLocation')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableSystemName')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableIp')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {printers.map(printer => (
                                        <tr key={printer.id} className="hover:bg-sky-500/5 dark:hover:bg-sky-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{printer.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-print"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{printer.name}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${printer.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {printer.isActive ? t('statusActive') : t('statusPassive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <i className="fat fa-map-pin text-slate-300"></i>
                                                    {printer.location || '-'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {printer.printerName || '-'}
                                            </td>
                                            <td className="px-8 py-3">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <i className="fat fa-network-wired text-slate-300"></i>
                                                    {printer.ipAddress || 'USB/Local'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(printer)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(printer.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {printers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-print text-6xl mb-4 text-slate-300"></i>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-sky-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                <div className="flex-1 overflow-y-auto w-full p-8 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                        <div className="relative">
                                            <i className="fat fa-tag absolute left-4 top-4 text-sky-500/50"></i>
                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow" placeholder={t('labelName')} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelLocation')}</label>
                                            <div className="relative">
                                                <i className="fat fa-map-pin absolute left-4 top-4 text-sky-500/50"></i>
                                                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow" placeholder={t('labelLocation')} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelSystemName')}</label>
                                            <div className="relative">
                                                <i className="fat fa-desktop absolute left-4 top-4 text-sky-500/50"></i>
                                                <input type="text" value={formData.printerName} onChange={(e) => setFormData({ ...formData, printerName: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow" placeholder={t('labelSystemName')} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelIp')}</label>
                                            <div className="relative">
                                                <i className="fat fa-network-wired absolute left-4 top-4 text-sky-500/50"></i>
                                                <input type="text" value={formData.ipAddress} onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-sky-500/10 outline-none transition-shadow" placeholder={t('labelIp')} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{tc('active')}</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                                className={`w-full h-[52px] px-4 rounded-2xl flex items-center justify-between transition-all border outline-none ${
                                                    formData.isActive 
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-500'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${formData.isActive ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                        <i className={`fat fa-power-off ${formData.isActive ? 'text-emerald-500' : 'text-slate-400'}`}></i>
                                                    </div>
                                                    <span className="font-bold text-sm tracking-wide">{formData.isActive ? t('statusActive') : t('statusPassive')}</span>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-300 ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 flex-shrink-0 ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <i className="fat fa-check text-lg"></i> {tc('save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${isScanning ? 'fa-radar animate-pulse text-emerald-500' : 'fa-list-check text-sky-600'}`}></i>
                                    Yazıcı Tarayıcı
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">
                                    {isScanning ? 'Sistem taranıyor...' : 'Sistemde Kurulu Yazıcılar'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setIsScannerOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                            {isScanning ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-70">
                                    <i className="fat fa-spinner-third animate-spin text-5xl text-emerald-500 mb-4"></i>
                                    <p className="font-bold text-slate-500 uppercase tracking-widest">Yazıcılar Aranıyor...</p>
                                </div>
                            ) : scannedPrinters.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <i className="fat fa-triangle-exclamation text-6xl text-amber-500 mb-4"></i>
                                    <p className="font-bold text-slate-500 uppercase tracking-widest text-center px-4">Sistemde kaydedilmiş bir yazıcı bulunamadı.<br/> Lütfen Windows/Linux Ayarlarında yazıcı ekleyin.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {scannedPrinters.map((p, idx) => (
                                        <button key={idx} onClick={() => selectScannedPrinter(p)} className="flex items-center gap-4 text-left w-full bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg transition-all group">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-2xl text-slate-500 group-hover:text-emerald-500 transition-colors shrink-0">
                                                <i className="fat fa-print"></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-base truncate">{p.name || 'Bilinmeyen'}</h4>
                                                <div className="flex items-center gap-3 mt-1.5 opacity-70 text-xs">
                                                    <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                                                        <i className="fat fa-plug"></i> {p.port || 'Port Yok'}
                                                    </span>
                                                    {p.shared && (
                                                        <span className="flex items-center gap-1 font-bold text-blue-500">
                                                            <i className="fat fa-share-nodes"></i> Paylaşılan
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 group-hover:border-emerald-500 text-transparent group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 rounded-full flex items-center justify-center transition-all shrink-0">
                                                <i className="fat fa-arrow-right"></i>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
