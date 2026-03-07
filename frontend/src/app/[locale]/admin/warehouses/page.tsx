'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import WarehouseUpsert from './_WarehouseUpsert';

interface Location {
    id: number;
    name: string;
}

interface Warehouse {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
    location: Location;
}

export default function WarehousesAdminPage() {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const router = useRouter();
    const { user } = useAuth();
    const locale = useLocale();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', address: '', latitude: 0, longitude: 0, locationId: 0, isActive: true });

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [wareRes, locsRes] = await Promise.all([
                axios.get('http://localhost:3050/warehouses', config),
                axios.get('http://localhost:3050/locations', config)
            ]);
            setWarehouses(wareRes.data);
            setLocations(locsRes.data);
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
                ...formData,
                location: formData.locationId !== 0 ? { id: formData.locationId } : null
            };

            if (formData.id === 0) {
                await axios.post('http://localhost:3050/warehouses', payload, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/warehouses/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving warehouse', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: tc('confirmDelete'),
            text: tc('confirmDelete'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`http://localhost:3050/warehouses/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: t('warehouseDeleted') || 'Depo başarıyla silindi.', icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting warehouse', error);
                showSwal({ title: tc('error'), text: t('warehouseDeleteError') || 'Depo silinirken bir sorun oluştu.', icon: 'error' });
            }
        }
    };

    const openModal = (ware?: Warehouse) => {
        if (ware) {
            setFormData({
                id: ware.id,
                name: ware.name,
                address: ware.address || '',
                latitude: ware.latitude,
                longitude: ware.longitude,
                locationId: ware.location?.id || 0,
                isActive: ware.isActive
            });
        } else {
            setFormData({ id: 0, name: '', address: '', latitude: 40.7663, longitude: 29.9175, locationId: locations.length > 0 ? locations[0].id : 0, isActive: true });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="d-flex align-items-center">
                        <i className="fat fa-warehouse me-3 text-sky-600 dark:text-sky-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 fw-bold text-sky-600 dark:text-sky-400 uppercase tracking-[0.25em]" id="title">{t('warehouses')}</h3>
                            <h5 className="text-muted mb-0 font-medium text-slate-400 dark:text-slate-500">{t('warehousesDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newWarehouse')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Veriler Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>ID</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Depo Bilgisi</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konum Detayı</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {warehouses.map(warehouse => (
                                        <tr key={warehouse.id} className="hover:bg-sky-500/5 dark:hover:bg-sky-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{warehouse.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-warehouse"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{warehouse.name}</p>
                                                        <p className="text-xs font-bold text-slate-500 mt-1">{warehouse.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                <i className="fat fa-location-dot me-2 text-red-400"></i>
                                                {warehouse.address || '-'}
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(warehouse)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(warehouse.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {warehouses.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-warehouse text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Kayıtlı Depo Bulunamadı</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {isModalOpen && (
                    <WarehouseUpsert
                        formData={formData}
                        setFormData={setFormData}
                        locations={locations}
                        onSave={handleSave}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}
