'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/AuthContext';
import { showSwal, toastSwal } from '@/app/utils/swal';
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
    const router = useRouter();
    const { user } = useAuth();
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
            showSwal({ title: 'Hata', text: 'Veriler yüklenirken bir sorun oluştu.', icon: 'error' });
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
                toastSwal({ title: 'Başarılı!', text: 'Depo eklendi.', icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/warehouses/${formData.id}`, payload, config);
                toastSwal({ title: 'Başarılı!', text: 'Depo güncellendi.', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving warehouse', error);
            showSwal({ title: 'Hata', text: error?.response?.data?.message || 'Depo kaydedilemedi.', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: "Bu depoyu silmek istediğinize emin misiniz?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal'
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`http://localhost:3050/warehouses/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: 'Silindi!', text: 'Depo başarıyla silindi.', icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting warehouse', error);
                showSwal({ title: 'Hata', text: 'Depo silinirken bir sorun oluştu.', icon: 'error' });
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
                    <div className="flex items-center">
                        <i className="fat fa-warehouse-full me-3 text-amber-600 dark:text-amber-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-amber-600 dark:text-amber-400 leading-none uppercase tracking-[0.25em]">DEPO YÖNETİMİ</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Stok depolama merkezlerini ve konumlarını yönetin.</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Depo
                        </button>
                        <button onClick={() => router.push('/admin')} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-arrow-left"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>ID</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Depo Bilgisi</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bağlı Şube</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {warehouses.map(w => (
                                        <tr key={w.id} className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{w.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center border border-amber-100/50 dark:border-amber-500/20 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-warehouse text-amber-600 dark:text-amber-400 text-xl"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none text-lg">{w.name}</p>
                                                        <p className="text-[10px] font-mono text-slate-400 mt-1.5 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                                            <i className="fat fa-location-dot"></i> {w.latitude?.toFixed(4)}, {w.longitude?.toFixed(4)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{w.location?.name || 'GENEL MERKEZ'}</span>
                                                    <span className="text-[10px] font-medium text-slate-400 line-clamp-1 max-w-[200px] uppercase tracking-wide">{w.address || 'ADRES BELİRTİLMEMİŞ'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${w.isActive ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-slate-100/50 text-slate-500 border-slate-200/50'}`}>
                                                    {w.isActive ? 'AKTİF' : 'PASİF'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(w)} className="p-2.5 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm">
                                                        <i className="fat fa-pen-to-square"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(w.id)} className="p-2.5 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm">
                                                        <i className="fat fa-trash-can"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {warehouses.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-warehouse text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Depo Verisi Bulunamadı</p>
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
