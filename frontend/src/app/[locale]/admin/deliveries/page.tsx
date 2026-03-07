'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const SetMapCenter = dynamic(() => import('@/components/SetMapCenter'), { ssr: false });

interface Delivery {
    id: number;
    saleId: number;
    courierId: number;
    status: string;
    deliveryAddress: string;
    currentLat: number;
    currentLng: number;
    customerPhone: string;
    notes: string;
    updatedAt: string;
}

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    roleTitle: string;
}

export default function AdminDeliveriesPage() {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [couriers, setCouriers] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        saleId: '',
        courierId: '',
        deliveryAddress: '',
        customerPhone: '',
        notes: ''
    });

    useEffect(() => {
        if (user?.token) {
            fetchInitialData();
            const interval = setInterval(fetchDeliveries, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchInitialData = async () => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [delRes, empRes] = await Promise.all([
                axios.get('http://localhost:3050/deliveries', config),
                axios.get('http://localhost:3050/employees', config)
            ]);
            setDeliveries(delRes.data);
            // Simple filter for couriers based on roleTitle
            setCouriers(empRes.data.filter((e: any) =>
                e.roleTitle.toLowerCase().includes('kurye') ||
                e.roleTitle.toLowerCase().includes('motor')
            ));
        } catch (error) {
            console.error('Error fetching initial data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveries = async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get('http://localhost:3050/deliveries', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setDeliveries(res.data);
        } catch (error) {
            console.error('Error fetching deliveries', error);
        }
    };

    const handleCreateDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;

        try {
            const payload = {
                saleId: parseInt(formData.saleId),
                courierId: formData.courierId ? parseInt(formData.courierId) : null,
                deliveryAddress: formData.deliveryAddress,
                customerPhone: formData.customerPhone,
                notes: formData.notes,
                status: formData.courierId ? 'IN_TRANSIT' : 'PENDING'
            };

            await axios.post('http://localhost:3050/deliveries', payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            toastSwal({ title: tc('success'), text: t('deliveryCreated') || 'Teslimat kaydı oluşturuldu.', icon: 'success' });
            setIsModalOpen(false);
            setFormData({ saleId: '', courierId: '', deliveryAddress: '', customerPhone: '', notes: '' });
            fetchDeliveries();
        } catch (error: any) {
            showSwal({ title: tc('error'), text: error.response?.data?.message || t('deliveryCreateError') || 'Teslimat oluşturulamadı.', icon: 'error' });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700';
            case 'IN_TRANSIT': return 'bg-blue-100 text-blue-700';
            case 'DELIVERED': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden flex flex-col relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none z-0"></div>

            <div className="w-full px-[50px] py-8 relative z-10 flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Header Section - Standardized */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
                    <div className="flex items-center">
                        <i className="fat fa-truck-fast me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]" id="title">{t('deliveries')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('deliveriesDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2">
                            <i className="fat fa-plus-circle"></i> {t('addManualOrder') || 'Manuel Sipariş Ekle'}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
                    {/* List Section */}
                    <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar h-full pb-8">
                        {deliveries.map(d => {
                            const isSelected = selectedCoords?.[0] === d.currentLat && selectedCoords?.[1] === d.currentLng;
                            return (
                                <div key={d.id}
                                    onClick={() => { if (d.currentLat && d.currentLng) setSelectedCoords([d.currentLat, d.currentLng]) }}
                                    className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border transition-all cursor-pointer group ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'border-white dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">{t('order') || 'Sipariş'} #{d.saleId}</span>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${getStatusColor(d.status)}`}>
                                            {d.status}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2 text-lg">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <i className="fat fa-location-dot text-indigo-500"></i>
                                        </div>
                                        <span className="truncate">{d.deliveryAddress || t('noAddress') || 'Adres Belirtilmemiş'}</span>
                                    </h4>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 pl-10 border-l-2 border-indigo-100 dark:border-indigo-900/30 ml-4 py-1">{d.notes || t('noNote') || 'Not yok'}</p>
                                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-2 mb-3">
                                        <span className="text-slate-400 flex items-center gap-1.5"><i className="fat fa-user-helmet-safety"></i> {t('courier') || 'Kurye'}: {d.courierId || t('unknown') || 'BİLİNMİYOR'}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><i className="fat fa-clock-rotate-left"></i> {new Date(d.updatedAt).toLocaleTimeString()}</span>
                                    </div>
                                    {(d.currentLat && d.currentLng) ? (
                                        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 mt-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-wider"><i className="fat fa-location-crosshairs text-indigo-400"></i> EN: <span className="text-slate-800 dark:text-slate-200">{d.currentLat.toFixed(5)}</span></div>
                                            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 tracking-wider">BOY: <span className="text-slate-800 dark:text-slate-200">{d.currentLng.toFixed(5)}</span></div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30 text-[10px] font-black text-amber-600 dark:text-amber-500 tracking-wider mt-1">
                                            <i className="fat fa-triangle-exclamation text-amber-500"></i> {t('noLocationInfo') || 'KONUM BİLGİSİ HENÜZ YOK'}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {deliveries.length === 0 && (
                            <div className="text-center p-12 bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-300">
                                <p className="text-slate-500 italic">{t('noActiveDelivery') || 'Aktif teslimat bulunamadı.'}</p>
                            </div>
                        )}
                    </div>

                    {/* Map Section */}
                    <div className="lg:col-span-2 h-full rounded-[40px] overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg relative z-0">
                        <MapContainer center={[40.7663, 29.9175]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <SetMapCenter coords={selectedCoords} />
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {deliveries.filter(d => d.currentLat && d.currentLng).map(d => (
                                <Marker key={d.id} position={[d.currentLat, d.currentLng]}>
                                    <Popup className="custom-popup">
                                        <div className="p-2">
                                            <p className="font-bold text-indigo-600 mb-1">{t('delivery') || 'Teslimat'} #{d.id}</p>
                                            <p className="text-xs text-slate-600 mb-1"><b>{t('address') || 'Adres'}:</b> {d.deliveryAddress}</p>
                                            <p className="text-xs text-slate-600"><b>{tc('status') || 'Durum'}:</b> {d.status}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>

            {/* Manual Order Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-lg shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 my-auto">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-extralight text-indigo-600 dark:text-indigo-400 flex items-center gap-3 tracking-tighter uppercase">
                                    <i className="fat fa-clipboard-list-check text-indigo-600 dark:text-indigo-400"></i> {t('manualOrder') || 'MANUEL SİPARİŞ'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('manualOrderDesc') || 'Harici teslimat kaydı oluşturun'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleCreateDelivery} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('orderNo') || 'Sipariş No'} (Sale ID)</label>
                                    <div className="relative">
                                        <i className="fat fa-hashtag absolute left-4 top-3.5 text-indigo-500/50"></i>
                                        <input type="number" required value={formData.saleId} onChange={(e) => setFormData({ ...formData, saleId: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" placeholder="1024" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('assignCourier') || 'Kurye Ata'}</label>
                                    <div className="relative">
                                        <i className="fat fa-user-helmet-safety absolute left-4 top-4 text-indigo-500/50"></i>
                                        <select value={formData.courierId} onChange={(e) => setFormData({ ...formData, courierId: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                            <option value="">{t('waitingAssignment') || 'Atama Bekliyor'}</option>
                                            {couriers.map(c => (
                                                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                                            ))}
                                        </select>
                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('customerPhone') || 'Müşteri Telefon'}</label>
                                <div className="relative">
                                    <i className="fat fa-phone absolute left-4 top-3.5 text-indigo-500/50"></i>
                                    <input type="text" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" placeholder="05xx..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('deliveryAddress') || 'Teslimat Adresi'}</label>
                                <div className="relative">
                                    <i className="fat fa-map-pin-high absolute left-4 top-4 text-indigo-500/50"></i>
                                    <textarea required value={formData.deliveryAddress} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow resize-none" rows={2} placeholder={t('addressPlaceholder') || "Mahalle, Sokak, No..."}></textarea>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{tc('notes') || 'Notlar'}</label>
                                <div className="relative">
                                    <i className="fat fa-sticky-note absolute left-4 top-4 text-indigo-500/50"></i>
                                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow resize-none" rows={2} placeholder={t('notesPlaceholder') || "Kapı otomatiği bozuk vb..."}></textarea>
                                </div>
                            </div>

                            <div className="pt-6 flex flex-col gap-3">
                                <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    {tc('save')}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    {tc('cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
