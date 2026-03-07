'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import { showSwal, toastSwal } from '../utils/swal';
import { useLocale } from 'next-intl';

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    roleTitle: string;
    vehicleType?: string;
    courierStatus?: string;
}

export default function DeliveryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const locale = useLocale();

    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [couriers, setCouriers] = useState<Employee[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        saleId: '',
        courierId: '',
        deliveryAddress: '',
        customerPhone: '',
        notes: ''
    });

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
    const [assignCourierId, setAssignCourierId] = useState('');

    // Filtreleme state'i: all, PENDING, IN_TRANSIT, DELIVERED vs.
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const [empRes, delRes] = await Promise.all([
                axios.get('http://localhost:3050/employees', { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get('http://localhost:3050/deliveries', { headers: { Authorization: `Bearer ${user.token}` } })
            ]);

            const fetchedCouriers = empRes.data.filter((e: any) =>
                e.roleTitle.toLowerCase().includes('kurye') ||
                e.roleTitle.toLowerCase().includes('motor')
            );
            setCouriers(fetchedCouriers);

            const mappedDeliveries = delRes.data.map((d: any) => {
                const courier = fetchedCouriers.find((c: any) => c.id === d.courierId);
                return {
                    id: d.id.toString(), // Database ID used for API updates
                    displayId: '#' + (d.saleId ?? d.id),
                    customer: d.customerPhone || 'Müşteri',
                    address: d.deliveryAddress || 'Adres Yok',
                    status: d.status,
                    time: new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    courier: courier ? `${courier.firstName} ${courier.lastName}` : undefined
                };
            });

            setDeliveries(mappedDeliveries.reverse());
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) router.push(`/${locale}/login`);
        if (user?.token) {
            fetchData();
        }
    }, [user, authLoading, router]);

    // İstatistik (KPI) Verileri
    const stats = {
        pending: deliveries.filter(d => d.status === 'PENDING').length,
        inTransit: deliveries.filter(d => d.status === 'IN_TRANSIT').length,
        delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
        avgTime: '24dk' // İstenirse gerçek veriden hesaplanabilir
    };

    // Ekranda gösterilecek filtrelenmiş siparişler
    const filteredDeliveries = selectedStatus === 'all'
        ? deliveries
        : deliveries.filter(d => d.status === selectedStatus);

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

            await fetchData();

            toastSwal({ title: 'Başarılı!', text: 'Teslimat kaydı oluşturuldu.', icon: 'success' });
            setIsModalOpen(false);
            setFormData({ saleId: '', courierId: '', deliveryAddress: '', customerPhone: '', notes: '' });
        } catch (error: any) {
            showSwal({ title: 'Hata', text: error.response?.data?.message || 'Teslimat oluşturulamadı.', icon: 'error' });
        }
    };

    const handleAssignCourier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token || !selectedDeliveryId || !assignCourierId) return;

        try {
            await axios.put(`http://localhost:3050/deliveries/${selectedDeliveryId}`,
                { courierId: parseInt(assignCourierId), status: 'IN_TRANSIT' },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );

            await fetchData();

            toastSwal({ title: 'Başarılı!', text: 'Kurye başarıyla atandı.', icon: 'success' });
            setIsAssignModalOpen(false);
            setAssignCourierId('');
            setSelectedDeliveryId(null);
        } catch (error: any) {
            showSwal({ title: 'Hata', text: error.response?.data?.message || 'Kurye atanamadı.', icon: 'error' });
        }
    };

    const handleCancelDelivery = async (deliveryId: string) => {
        if (!user?.token) return;

        try {
            await axios.put(`http://localhost:3050/deliveries/${deliveryId}`,
                { status: 'CANCELLED' },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );

            await fetchData();
            toastSwal({ title: 'İptal Edildi!', text: 'Sipariş başarıyla iptal edildi.', icon: 'success' });
        } catch (error: any) {
            showSwal({ title: 'Hata', text: error.response?.data?.message || 'Sipariş iptal edilemedi.', icon: 'error' });
        }
    };

    if (authLoading || !user) return null;

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'PENDING':
                return <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-md text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">Hazırlanıyor</span>;
            case 'IN_TRANSIT':
                return <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-amber-100/80 dark:bg-amber-500/20 backdrop-blur-md text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30 shadow-sm animate-pulse">Yolda</span>;
            case 'DELIVERED':
                return <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 backdrop-blur-md text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/30 shadow-sm">Teslim Edildi</span>;
            case 'CANCELLED':
                return <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-red-100/80 dark:bg-red-500/20 backdrop-blur-md text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-500/30 shadow-sm">İptal</span>;
            default:
                return <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-slate-100/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 backdrop-blur-md">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-[150px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] rounded-full bg-orange-500/10 dark:bg-orange-600/10 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header - formtitle rule */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-truck-fast me-3 text-amber-600 dark:text-amber-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-amber-600 dark:text-amber-400 leading-none uppercase tracking-[0.25em]">Paket Servisi</h3>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Aktif ve geçmiş kurye siparişlerini yönetin</h5>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shadow-sm"
                        >
                            <i className="fat fa-plus-circle text-xl"></i>
                            Manuel Sipariş Ekle
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/dashboard`)}
                            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* KPI Bar (Glassmorphism) - Filtreleme İçin Tıklanabilir Yapıldı */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div
                        onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'all' : 'PENDING')}
                        className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] flex items-center justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.3)] hover:scale-[1.02] cursor-pointer border ${selectedStatus === 'PENDING' ? 'border-indigo-500 shadow-[0_8px_30px_-5px_rgba(99,102,241,0.5)] ring-2 ring-indigo-500/20' : 'border-white dark:border-slate-700'}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aktif Sipariş</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.pending}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <i className="fat fa-box-open text-3xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => setSelectedStatus(selectedStatus === 'IN_TRANSIT' ? 'all' : 'IN_TRANSIT')}
                        className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer border ${selectedStatus === 'IN_TRANSIT' ? 'border-amber-500 shadow-[0_8px_30px_-5px_rgba(245,158,11,0.5)] ring-2 ring-amber-500/20' : 'border-white dark:border-slate-700'}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Yoldaki Sipariş</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.inTransit}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="fat fa-moped text-3xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => setSelectedStatus(selectedStatus === 'DELIVERED' ? 'all' : 'DELIVERED')}
                        className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer border ${selectedStatus === 'DELIVERED' ? 'border-emerald-500 shadow-[0_8px_30px_-5px_rgba(16,185,129,0.5)] ring-2 ring-emerald-500/20' : 'border-white dark:border-slate-700'}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teslim Edilen</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.delivered}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-check-double text-3xl"></i>
                        </div>
                    </div>
                    <div
                        onClick={() => setSelectedStatus('all')}
                        className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] flex items-center justify-between transition-all hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-[0_8px_30px_-5px_rgba(249,115,22,0.3)] hover:scale-[1.02] cursor-pointer border ${selectedStatus === 'all' ? 'border-orange-500 shadow-[0_8px_30px_-5px_rgba(249,115,22,0.5)] ring-2 ring-orange-500/20' : 'border-white dark:border-slate-700'}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tüm Siparişler</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{deliveries.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <i className="fat fa-list text-3xl"></i>
                        </div>
                    </div>
                </div>

                {/* Delivery Grid (Glassmorphism) - Eski Tasarım */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDeliveries.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-16 bg-white/40 dark:bg-slate-800/40 rounded-[32px] border border-white dark:border-slate-700/50 backdrop-blur-md">
                            <i className="fat fa-inbox text-5xl text-slate-300 dark:text-slate-600 mb-4"></i>
                            <h4 className="text-xl font-bold text-slate-500 dark:text-slate-400">Sipariş Bulunamadı</h4>
                            <p className="text-sm text-slate-400 mt-1">Bu filtreye uygun kayıt yok.</p>
                        </div>
                    ) : filteredDeliveries.map((delivery, index) => (
                        <div key={index} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden group">
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${delivery.status === 'PENDING' ? 'bg-slate-400' :
                                delivery.status === 'IN_TRANSIT' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                }`}></div>

                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">{delivery.displayId || delivery.id}</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-white/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-lg border border-white/50 dark:border-slate-700/50">
                                        <i className="fat fa-clock text-slate-400"></i>
                                        Saat: {delivery.time}
                                    </p>
                                </div>
                                <StatusBadge status={delivery.status} />
                            </div>

                            <div className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-2xl p-4 mb-4 transition-colors border border-white/30 dark:border-slate-700/30">
                                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1.5 flex items-center gap-2">
                                    <i className="fat fa-user text-slate-400"></i>
                                    {delivery.customer}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2">
                                    <i className="fat fa-location-dot mt-0.5 text-slate-400"></i>
                                    <span className="line-clamp-2">{delivery.address}</span>
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-4 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm transition-colors relative">
                                        {delivery.courier ? delivery.courier.charAt(0) : '?'}
                                        {delivery.status === 'IN_TRANSIT' && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800 shadow-sm"></span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Atanan Kurye</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{delivery.courier || 'Bekliyor'}</p>
                                    </div>
                                </div>

                                {delivery.status === 'PENDING' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedDeliveryId(delivery.id);
                                                setIsAssignModalOpen(true);
                                            }}
                                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 transition-all">
                                            Ata
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const result = await showSwal({
                                                    title: 'Emin misiniz?',
                                                    text: 'Siparişi iptal etmek istediğinize emin misiniz?',
                                                    icon: 'warning',
                                                    showCancelButton: true,
                                                    confirmButtonText: 'Evet, İptal Et',
                                                    cancelButtonText: 'Hayır, Vazgeç',
                                                    confirmButtonColor: '#ef4444'
                                                });
                                                if (result.isConfirmed) {
                                                    handleCancelDelivery(delivery.id);
                                                }
                                            }}
                                            className="px-5 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-100 hover:scale-105 transition-all">
                                            İptal Et
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Manual Order Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter">
                                    <i className="fat fa-clipboard-list-check text-amber-600"></i> MANUEL SİPARİŞ
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Yeni teslimat kaydı oluşturun</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleCreateDelivery} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sipariş No</label>
                                    <div className="relative">
                                        <i className="fat fa-hashtag absolute left-4 top-3.5 text-amber-600/50"></i>
                                        <input type="number" required value={formData.saleId} onChange={(e) => setFormData({ ...formData, saleId: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow" placeholder="1024" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kurye Ata</label>
                                    <div className="relative">
                                        <i className="fat fa-user-helmet-safety absolute left-4 top-3.5 text-amber-600/50"></i>
                                        <select value={formData.courierId} onChange={(e) => setFormData({ ...formData, courierId: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow appearance-none">
                                            <option value="">Seçilmedi</option>
                                            {couriers.map(c => (
                                                <option key={c.id} value={c.id} disabled={c.courierStatus === 'OFF_DUTY'}>
                                                    {c.firstName} {c.lastName} ({c.vehicleType || 'Araçsız'}) - {c.courierStatus === 'AVAILABLE' ? 'MÜSAİT' : c.courierStatus === 'BUSY' ? 'MEŞGUL' : 'MESAİ DIŞI'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Müşteri Telefon</label>
                                <div className="relative">
                                    <i className="fat fa-phone absolute left-4 top-3.5 text-amber-600/50"></i>
                                    <input type="text" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow" placeholder="05xx..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Teslimat Adresi</label>
                                <div className="relative">
                                    <i className="fat fa-map-pin-high absolute left-4 top-4 text-amber-600/50"></i>
                                    <textarea required value={formData.deliveryAddress} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow min-h-[100px]" placeholder="Mahalle, Sokak, No..."></textarea>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button type="submit" className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    Sipariş kaydet
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    İptal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Assign Courier Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter">
                                    <i className="fat fa-user-helmet-safety text-amber-600"></i> KURYE ATA
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Sipariş: {selectedDeliveryId}</p>
                            </div>
                            <button onClick={() => { setIsAssignModalOpen(false); setAssignCourierId(''); setSelectedDeliveryId(null); }} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
                        </div>
                        <form onSubmit={handleAssignCourier} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Müsait Kuryeler</label>
                                <div className="space-y-3">
                                    {couriers.map(c => {
                                        const isAvailable = c.courierStatus === 'AVAILABLE';
                                        return (
                                            <label
                                                key={c.id}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${assignCourierId === c.id.toString()
                                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                                                    : !isAvailable
                                                        ? 'border-slate-100 dark:border-slate-700/50 opacity-50 cursor-not-allowed'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${assignCourierId === c.id.toString() ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-lg ${assignCourierId === c.id.toString() ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {c.firstName} {c.lastName}
                                                        </h4>
                                                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                            <i className={`fat ${c.vehicleType?.toLowerCase() === 'motor' ? 'fa-motorcycle' : 'fa-car'}`}></i>
                                                            {c.vehicleType || 'Araçsız'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="courier"
                                                        value={c.id}
                                                        checked={assignCourierId === c.id.toString()}
                                                        onChange={(e) => setAssignCourierId(e.target.value)}
                                                        disabled={!isAvailable}
                                                        className="w-5 h-5 text-amber-500 focus:ring-amber-500 dark:focus:ring-amber-400 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                                    />
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {couriers.length === 0 && (
                                        <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <i className="fat fa-user-xmark text-3xl text-slate-300 dark:text-slate-600 mb-2"></i>
                                            <p className="text-sm font-medium text-slate-500">Sistemde kurye bulunamadı.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={!assignCourierId}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                >
                                    Seçili Kuryeye Ata
                                </button>
                                <button type="button" onClick={() => { setIsAssignModalOpen(false); setAssignCourierId(''); setSelectedDeliveryId(null); }} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    İptal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
