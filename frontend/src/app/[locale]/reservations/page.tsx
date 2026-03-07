'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { showSwal } from '../utils/swal';
import { useLocale, useTranslations } from 'next-intl';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@fullcalendar/core/locales/tr';

interface Table {
    // ... existing interfaces ...
    // (I will keep them, but I need to make sure I don't break the existing ones)
    id: number;
    name: string;
    status: string;
    zone?: {
        id: number;
        name: string;
        location?: {
            id: number;
            name: string;
        }
    };
}

interface Location {
    id: number;
    name: string;
}

interface Reservation {
    id: number;
    customerName: string;
    customerPhone: string;
    reservationTime: string;
    guestCount: number;
    table: Table | null;
    location: Location | null;
    notes: string;
    status: string;
    createdAt: string;
}

export default function ReservationsPage() {
    const router = useRouter();
    const locale = useLocale();
    const { user, loading: authLoading } = useAuth();
    const API_URL = 'http://localhost:3050';

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewType, setViewType] = useState<'list' | 'calendar'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: 0,
        customerName: '',
        customerPhone: '',
        reservationTime: '',
        guestCount: 1,
        tableId: 0,
        locationId: 0,
        notes: '',
        status: 'PENDING'
    });

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [resvRes, tableRes, locRes] = await Promise.all([
                axios.get(`${API_URL}/reservations`, { headers }),
                axios.get(`${API_URL}/tables`, { headers }),
                axios.get(`${API_URL}/locations`, { headers })
            ]);
            setReservations(resvRes.data);
            setTables(tableRes.data);
            setLocations(locRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) router.push(`/${locale}/login`);
        if (user) fetchData();
    }, [user, authLoading, locale]);

    const handleSave = async () => {
        try {
            if (!formData.customerName || !formData.customerPhone || !formData.reservationTime) {
                showSwal({ title: 'Hata', text: 'Lütfen zorunlu alanları doldurun.', icon: 'error' });
                return;
            }

            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };

            let payload: any = { ...formData };
            if (formData.id === 0) {
                delete payload.id;
                await axios.post(`${API_URL}/reservations`, payload, { headers });
            } else {
                await axios.put(`${API_URL}/reservations/${formData.id}`, payload, { headers });
            }

            showSwal({ title: 'Başarılı', text: 'Rezervasyon başarıyla kaydedildi.', icon: 'success' });
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            showSwal({ title: 'Hata', text: error.response?.data?.message || 'Bir hata oluştu.', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await axios.delete(`${API_URL}/reservations/${id}`, {
            headers: { Authorization: `Bearer ${Cookies.get('token')}` }
        });
        if (result.status === 200) {
            showSwal({ title: 'Başarılı', text: 'Rezervasyon silindi.', icon: 'success' });
            fetchData();
        }
    };

    const openModal = (res?: Reservation) => {
        if (res) {
            setFormData({
                id: res.id,
                customerName: res.customerName,
                customerPhone: res.customerPhone,
                reservationTime: res.reservationTime.slice(0, 16),
                guestCount: res.guestCount,
                tableId: res.table?.id || 0,
                locationId: res.location?.id || 0,
                notes: res.notes || '',
                status: res.status
            });
        } else {
            setFormData({
                id: 0,
                customerName: '',
                customerPhone: '',
                reservationTime: '',
                guestCount: 1,
                tableId: 0,
                locationId: 0,
                notes: '',
                status: 'PENDING'
            });
        }
        setIsModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
            case 'CANCELLED': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
            case 'ARRIVED': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading || authLoading) return <div className="h-screen flex items-center justify-center text-white">Yükleniyor...</div>;

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <i className="fat fa-calendar-check text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                    <div>
                        <h3 className="text-3xl font-black uppercase tracking-wider mb-0 text-indigo-600 dark:text-indigo-400">Rezervasyonlar</h3>
                        <div className="h-1 w-1/4 bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                        <h5 className="text-slate-400 dark:text-slate-500 font-medium">Müşteri randevu ve masa planlamasını yönetin.</h5>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewType('list')}
                            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${viewType === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <i className="fat fa-list"></i> Liste
                        </button>
                        <button
                            onClick={() => setViewType('calendar')}
                            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${viewType === 'calendar' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <i className="fat fa-calendar-alt"></i> Takvim
                        </button>
                    </div>
                    <button onClick={() => openModal()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition flex items-center gap-2">
                        <i className="fat fa-plus"></i> Yeni Rezervasyon
                    </button>
                    <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition flex items-center gap-2">
                        <i className="fat fa-reply"></i> Geri Dön
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {viewType === 'list' ? (
                    <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700/50 backdrop-blur-md z-10">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-600">
                                        <th className="px-6 py-4">Müşteri</th>
                                        <th className="px-6 py-4">Zaman</th>
                                        <th className="px-6 py-4">Kişi</th>
                                        <th className="px-6 py-4">Masa</th>
                                        <th className="px-6 py-4">Durum</th>
                                        <th className="px-6 py-4 text-center">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {reservations.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Henüz rezervasyon bulunmuyor.</td></tr>
                                    ) : reservations.map(res => (
                                        <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-white uppercase tracking-tight line-clamp-1">{res.customerName}</div>
                                                <div className="text-xs text-slate-400 font-medium tracking-widest">{res.customerPhone}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                {new Date(res.reservationTime).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg font-bold text-slate-500">{res.guestCount} Kişi</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {res.table ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-indigo-500">{res.table.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{res.table.zone?.name} - {res.location?.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-slate-300 uppercase italic">Atanmadı</span>
                                                        {res.location && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{res.location.name}</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusBadge(res.status)}`}>
                                                    {res.status === 'PENDING' ? 'Bekliyor' : res.status === 'CONFIRMED' ? 'Onaylandı' : res.status === 'CANCELLED' ? 'İptal' : 'Giriş Yaptı'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => openModal(res)} className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition">
                                                        <i className="fat fa-edit"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(res.id)} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-600 hover:text-white transition">
                                                        <i className="fat fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl p-6 custom-calendar-wrapper">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            events={reservations.map(res => ({
                                id: res.id.toString(),
                                title: `${res.customerName} (${res.guestCount}p)`,
                                start: res.reservationTime,
                                className: `fc-event-${res.status.toLowerCase()}`,
                                extendedProps: { ...res }
                            }))}
                            eventClick={(info: any) => {
                                const res = info.event.extendedProps as Reservation;
                                openModal(res);
                            }}
                            locale="tr"
                            height="100%"
                            slotMinTime="08:00:00"
                            slotMaxTime="23:59:59"
                            allDaySlot={false}
                            eventTimeFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                    <i className="fat fa-calendar-check text-2xl"></i>
                                </div>
                                <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                    {formData.id === 0 ? 'YENİ REZERVASYON' : 'REZERVASYON DÜZENLE'}
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Müşteri Adı <span className="text-rose-500">*</span></label>
                                    <input value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none" placeholder="Müşteri Ad Soyad" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon <span className="text-rose-500">*</span></label>
                                    <input value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none" placeholder="05XX XXX XX XX" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rezervasyon Zamanı <span className="text-rose-500">*</span></label>
                                    <input type="datetime-local" value={formData.reservationTime} onChange={e => setFormData({ ...formData, reservationTime: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kişi Sayısı</label>
                                    <input type="number" min="1" value={formData.guestCount} onChange={e => setFormData({ ...formData, guestCount: +e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lokasyon</label>
                                    <select value={formData.locationId} onChange={e => setFormData({ ...formData, locationId: +e.target.value, tableId: 0 })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none appearance-none">
                                        <option value="0">Lokasyon Seçin</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Masa Seçimi</label>
                                    <select value={formData.tableId} onChange={e => setFormData({ ...formData, tableId: +e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none appearance-none">
                                        <option value="0">Masa Seçilmedi</option>
                                        {tables.filter(t => !formData.locationId || t.zone?.location?.id === formData.locationId).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.zone?.name})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durum</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none appearance-none">
                                        <option value="PENDING">Bekliyor</option>
                                        <option value="CONFIRMED">Onaylandı</option>
                                        <option value="CANCELLED">İptal Edildi</option>
                                        <option value="ARRIVED">Giriş Yapıldı</option>
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notlar</label>
                                    <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500/20 transition-all outline-none h-24 resize-none" placeholder="Ekstra notlar..." />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-10">
                                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all transition group">
                                    İptal <i className="fat fa-times ml-2 group-hover:rotate-90 transition-transform"></i>
                                </button>
                                <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-emerald-500 transition-all flex items-center gap-2">
                                    Kaydet <i className="fat fa-check"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
