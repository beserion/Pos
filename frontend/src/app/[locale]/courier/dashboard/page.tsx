'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';

interface Delivery {
    id: number;
    saleId: number;
    status: string;
    deliveryAddress: string;
    customerPhone: string;
    notes: string;
}

export default function CourierDashboardPage() {
    const { user } = useAuth();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id && user?.token) {
            fetchAssignedDeliveries();
            const interval = setInterval(updateLocation, 30000); // Send location every 30s
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchAssignedDeliveries = async () => {
        if (!user?.id || !user?.token) return;
        try {
            const res = await axios.get(`http://localhost:3050/deliveries/courier/${user.id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setDeliveries(res.data);
        } catch (error) {
            console.error('Error fetching assigned deliveries', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = () => {
        if (!navigator.geolocation || !user?.token) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            // Update location for all active deliveries
            for (const d of deliveries) {
                if (d.status === 'IN_TRANSIT') {
                    try {
                        await axios.put(`http://localhost:3050/deliveries/${d.id}/location`,
                            { lat: latitude, lng: longitude },
                            { headers: { Authorization: `Bearer ${user.token}` } }
                        );
                    } catch (e) {
                        console.error('Failed to update location for delivery', d.id);
                    }
                }
            }
        });
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        if (!user?.token) return;
        try {
            const payload = { status: newStatus };
            if (newStatus === 'DELIVERED') {
                (payload as any).actualDeliveryTime = new Date();
            }

            await axios.put(`http://localhost:3050/deliveries/${id}`, payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            toastSwal({ title: 'Güncellendi!', text: `Teslimat durumu: ${newStatus}`, icon: 'success' });
            fetchAssignedDeliveries();
        } catch (error) {
            showSwal({ title: 'Hata', text: 'Durum güncellenemedi.', icon: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 font-sans text-white p-4">
            <header className="mb-8 pt-4">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <i className="fat fa-moped text-2xl"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight underline decoration-indigo-500 decoration-4 underline-offset-4">Kurye Paneli</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Hoş geldin, {user?.username}</p>
                    </div>
                </div>
            </header>

            <main className="space-y-4">
                <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest px-1">Aktif Görevler ({deliveries.length})</h3>

                {loading ? (
                    <div className="py-20 text-center text-slate-500 font-bold italic animate-pulse">Görevler yükleniyor...</div>
                ) : (
                    <>
                        {deliveries.map(d => (
                            <div key={d.id} className="bg-slate-800 border-2 border-slate-700/50 rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-500/30">
                                        {d.status}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Teslimat Adresi</p>
                                    <h4 className="text-lg font-bold leading-tight group-hover:text-indigo-400 transition-colors uppercase">
                                        {d.deliveryAddress}
                                    </h4>
                                </div>

                                {d.notes && (
                                    <div className="mb-6 p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 italic text-sm text-slate-300">
                                        <i className="fat fa-comment-dots me-2 text-indigo-500"></i>
                                        {d.notes}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => window.open(`tel:${d.customerPhone}`, '_self')}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-2xl font-black text-xs transition active:scale-95"
                                    >
                                        <i className="fat fa-phone"></i> ARA
                                    </button>
                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.deliveryAddress)}`, '_blank')}
                                        className="flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-xs transition shadow-lg shadow-indigo-500/20 active:scale-95"
                                    >
                                        <i className="fat fa-map-location-dot"></i> YOL TARİFİ
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleStatusChange(d.id, 'DELIVERED')}
                                    className="w-full mt-3 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-sm tracking-widest transition shadow-lg shadow-emerald-900/40 active:scale-[0.98]"
                                >
                                    TESLİM EDİLDİ OLARAK İŞARETLE
                                </button>
                            </div>
                        ))}

                        {deliveries.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4 border-2 border-dashed border-slate-700">
                                    <i className="fat fa-check-double text-slate-600 text-3xl"></i>
                                </div>
                                <h4 className="font-bold text-slate-400">Tüm görevler tamamlandı!</h4>
                                <p className="text-xs text-slate-600 mt-1">Yeni görevler için bekleyin.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            <footer className="mt-12 text-center pb-8 border-t border-slate-800 pt-8">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                    Konumunuz anlık olarak sisteme iletilmektedir.
                </p>
            </footer>
        </div>
    );
}
