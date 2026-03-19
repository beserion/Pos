'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { useLocale } from 'next-intl';
import { toastSwal, showSwal } from '../utils/swal';
import { io } from 'socket.io-client';
import { useTheme } from 'next-themes';
import { useParameters } from '../utils/useParameters';

interface OrderItem {
    id: number;
    product: { name: string };
    quantity: number;
    note?: string;
    isWaiting: boolean;
    isMarshed: boolean;
    isReady: boolean;
}

interface OrderTicket {
    id: number;
    table?: { name: string };
    waiter?: { firstName: string, lastName: string };
    items: OrderItem[];
    status: string;
    createdAt: string;
    updatedAt?: string;
}

export function PageClient() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [tickets, setTickets] = useState<OrderTicket[]>([]);
    const [counts, setCounts] = useState({ pending: 0, finished: 0, total: 0 });
    const [activeFilter, setActiveFilter] = useState<'active' | 'finished'>('active');
    const { params, loading: paramsLoading } = useParameters();

    useEffect(() => {
        setMounted(true);
    }, []);

    const API_URL = 'http://localhost:3050';

    const fetchKitchenOrders = async () => {
        try {
            const token = Cookies.get('token');
            const statusParam = activeFilter === 'finished' ? '?status=READY' : '';
            const res = await axios.get(`${API_URL}/sales/kitchen${statusParam}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTickets(res.data);

            const countsRes = await axios.get(`${API_URL}/sales/kitchen/counts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCounts(countsRes.data);
        } catch (error) {
            console.error('Error fetching kitchen orders:', error);
        }
    };

    useEffect(() => {
        fetchKitchenOrders();
    }, [activeFilter]);

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) {
            fetchKitchenOrders();
            const intervalMs = (params.auto_refresh_interval || 10) * 1000;
            const interval = setInterval(fetchKitchenOrders, intervalMs);

            // WebSocket Connection for Real-time alerts
            const socket = io(API_URL);

            socket.on('connect', () => console.log('Connected to Kitchen WebSocket'));

            socket.on('newOrder', (order: any) => {
                console.log('Incoming order via WebSocket:', order);
                fetchKitchenOrders();

                // Play notification sound (parametre kontrol)
                if (params.beep_on_new_order) {
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(e => console.log('Audio autoplay blocked by browser', e));
                    } catch (e) { }
                }

                showSwal({
                    title: 'Yeni Sipariş!',
                    text: `${order?.table?.name || 'Paket'} masasından yeni bir sipariş geldi.`,
                    icon: 'info',
                    timer: 5000,
                    showConfirmButton: false
                });
            });

            socket.on('orderReady', (order: any) => {
                console.log('Order marked as ready via WebSocket:', order);
                fetchKitchenOrders();
            });

            socket.on('orderUpdated', (order: any) => {
                console.log('Order updated via WebSocket:', order);
                fetchKitchenOrders();
            });
            
            socket.on('itemMarshed', (data: any) => {
                console.log('Item Marshed via WebSocket:', data);
                fetchKitchenOrders();
                toastSwal({
                    icon: 'warning',
                    title: 'MARŞ GELDİ!',
                    text: `${data.tableName} masası için MARŞ komutu verildi.`
                });
            });

            socket.on('itemReady', (data: any) => {
                console.log('Item Ready State Changed via WebSocket:', data);
                fetchKitchenOrders();
            });

            return () => {
                clearInterval(interval);
                socket.disconnect();
            };
        }
    }, [user, loading, router]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const toggleItemReady = async (itemId: number) => {
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/sales/items/${itemId}/ready`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchKitchenOrders();
        } catch (error) {
            console.error('Error toggling item ready state:', error);
        }
    };

    const updateTicketStatus = async (id: number, newStatus: string) => {
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/sales/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toastSwal({
                icon: 'success',
                title: 'Durum Güncellendi'
            });
            fetchKitchenOrders();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const formatElapsedTime = (startStr: string) => {
        const start = new Date(startStr);
        const diffInMinutes = Math.floor((currentTime.getTime() - start.getTime()) / 60000);
        if (diffInMinutes < 1) return 'Şimdi';
        return `${diffInMinutes} dk önce`;
    };

    // ── Görsel KDS devre dışıysa yazıcı bilgisi ekranı göster ──────────
    if (!paramsLoading && params.kitchen_display_enabled === false) {
        return (
            <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-8">
                <div className="max-w-lg w-full text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-slate-800 border-2 border-slate-700 rounded-3xl flex items-center justify-center">
                        <i className="fat fa-display-slash text-5xl text-slate-500"></i>
                    </div>
                    <h1 className="text-3xl font-black mb-2 text-slate-200">Mutfak Ekranı Devre Dışı</h1>
                    <p className="text-slate-400 mb-8">
                        Görsel mutfak ekranı (KDS) bu cihazda aktif değil. Sistem yöneticisi tarafından kapatılmıştır.
                    </p>

                    {params.kitchen_printer_only && (
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <i className="fat fa-print text-2xl text-sky-400"></i>
                                <div>
                                    <p className="font-bold text-white">Yazıcıya Yönlendirme Aktif</p>
                                    <p className="text-xs text-slate-400">Siparişler otomatik olarak mutfak yazıcısına iletiliyor</p>
                                </div>
                                <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    Aktif
                                </span>
                            </div>
                            {params.kitchen_printer_name && (
                                <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-4 py-2">
                                    <i className="fat fa-server text-slate-400 text-sm"></i>
                                    <span className="text-sm text-slate-300">
                                        Yazıcı: <strong className="text-white">{params.kitchen_printer_name}</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <p className="text-xs text-slate-600">
                        Bu ayarı değiştirmek için: <span className="text-slate-400 font-mono">Admin → Parametreler → Mutfak Ekranı (KDS Modülü)</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 flex flex-col overflow-hidden transition-colors duration-300">
            <header className="bg-white dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md flex justify-between items-center z-10 flex-none transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">👨‍🍳</span>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-wide uppercase">Mutfak KDS</h1>
                        <p className="text-emerald-500 dark:text-emerald-400 text-sm font-bold animate-pulse">Aktif Siparişler</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm h-11 transition-all duration-300">
                        <button 
                            onClick={() => setActiveFilter('active')}
                            className={`flex items-center justify-between gap-3 px-4 border-r border-slate-200 dark:border-slate-700 w-32 transition-all ${activeFilter === 'active' ? 'bg-amber-500/10 dark:bg-amber-500/20' : 'bg-slate-50 dark:bg-slate-800/80'}`}
                        >
                            <i className={`fat fa-fire ${activeFilter === 'active' ? 'text-amber-600 scale-110' : 'text-amber-500'} text-xl transition-all`}></i>
                            <div className="flex flex-col items-end justify-center text-right">
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold leading-none mb-1">Bekleyen</span>
                                <span className={`text-lg font-black ${activeFilter === 'active' ? 'text-amber-700 dark:text-amber-500' : 'text-amber-600 dark:text-amber-500'} leading-none`}>{counts.pending}</span>
                            </div>
                        </button>
                        <button 
                            onClick={() => setActiveFilter('finished')}
                            className={`flex items-center justify-between gap-3 px-4 border-r border-slate-200 dark:border-slate-700 w-32 transition-all ${activeFilter === 'finished' ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/80'}`}
                        >
                            <i className={`fat fa-check-circle ${activeFilter === 'finished' ? 'text-emerald-600 scale-110' : 'text-emerald-500'} text-xl transition-all`}></i>
                            <div className="flex flex-col items-end justify-center text-right">
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold leading-none mb-1">Biten</span>
                                <span className={`text-lg font-black ${activeFilter === 'finished' ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'} leading-none`}>{counts.finished}</span>
                            </div>
                        </button>
                        <div className="flex items-center justify-between gap-3 px-4 bg-slate-50 dark:bg-slate-800/80 w-32 opacity-70">
                            <i className="fat fa-bars-staggered text-indigo-500 dark:text-indigo-400 text-xl"></i>
                            <div className="flex flex-col items-end justify-center text-right">
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold leading-none mb-1">Toplam</span>
                                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{counts.total}</span>
                            </div>
                        </div>
                    </div>
                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-sm"
                        title={mounted ? (theme === 'dark' ? 'Açık Tema' : 'Koyu Tema') : ''}
                    >
                        <i className={`fat ${mounted && theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
                    </button>
                    <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-4 h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-sm">
                        <i className="fat fa-reply"></i> Çıkış
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
                    {tickets.map(ticket => {
                        const elapsed = Math.floor((currentTime.getTime() - new Date(ticket.createdAt).getTime()) / 60000);
                        const isWarning = elapsed > (params.warning_time || 10);
                        const isSevere = elapsed > (params.critical_time || 20);

                        return (
                            <div
                                key={ticket.id}
                                className={`bg-white dark:bg-slate-800 border border-t-4 rounded-xl shadow-md dark:shadow-xl overflow-hidden flex flex-col transition-all group ${ticket.status === 'READY' ? 'border-emerald-500 opacity-60 scale-95' :
                                    isSevere ? 'border-rose-500 dark:border-rose-600 shadow-rose-200 dark:shadow-rose-900/50' :
                                        isWarning ? 'border-amber-500' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">{ticket.table?.name || 'Paket'}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">#{ticket.id}</p>
                                            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center gap-1">
                                                <i className="fat fa-user text-[10px]"></i>
                                                {ticket.waiter?.firstName ? `${ticket.waiter.firstName} ${ticket.waiter.lastName}` : 'Terminal/POS'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-right ${ticket.status === 'READY' ? 'text-emerald-500' : (isSevere ? 'text-rose-500 dark:text-rose-400 font-bold animate-pulse' : isWarning ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-300')}`}>
                                        {ticket.status === 'READY' ? (
                                            <>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Başlangıç</span>
                                                    <span className="text-sm font-black">{new Date(ticket.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold mt-0.5">Kapanış</span>
                                                    <span className="text-sm font-black text-emerald-600">{new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Başladı</span>
                                                    <span className="text-sm font-black">{new Date(ticket.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className={`text-[9px] uppercase tracking-widest font-bold mt-0.5 ${isSevere ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-400'}`}>Geçen</span>
                                                    <span className={`text-sm font-black ${isSevere ? 'animate-pulse' : ''}`}>{formatElapsedTime(ticket.createdAt)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 flex-1 bg-white dark:bg-slate-800/40">
                                    <ul className="space-y-2">
                                        {ticket.items.map((item, idx) => (
                                            <li 
                                                key={idx} 
                                                onClick={() => !item.isWaiting || item.isMarshed ? toggleItemReady(item.id) : null}
                                                className={`flex gap-2 text-base p-2 rounded-lg -mx-1 cursor-pointer transition-all border ${item.isWaiting && !item.isMarshed ? 'opacity-40 grayscale scale-[0.98] cursor-not-allowed shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent dark:hover:border-slate-600/50'} ${item.isReady ? 'bg-rose-50 dark:bg-rose-950/20' : ''}`}
                                            >
                                                <span className={`font-black text-lg ${item.isReady ? 'text-rose-600' : (item.isWaiting && !item.isMarshed ? 'text-slate-400' : (item.isWaiting && item.isMarshed ? 'text-rose-500 animate-pulse' : 'text-indigo-500 dark:text-indigo-400'))}`}>{item.quantity}x</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                       <span className={`font-bold text-lg ${item.isReady ? 'text-rose-600 line-through decoration-rose-400/50' : (item.isWaiting && !item.isMarshed ? 'text-slate-400' : 'text-slate-800 dark:text-white')}`}>{item.product?.name}</span>
                                                       <div className="flex items-center gap-1">
                                                           {item.isReady && <i className="fat fa-check-double text-rose-500 text-sm"></i>}
                                                           {item.isWaiting && !item.isMarshed && (
                                                               <span className="text-[9px] font-black uppercase text-slate-400 border border-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                   <i className="fat fa-clock"></i> BEKLEMEDE
                                                               </span>
                                                           )}
                                                           {item.isWaiting && item.isMarshed && !item.isReady && (
                                                               <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-500/10 border border-rose-500/50 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse">
                                                                   <i className="fat fa-fire-flame-curved"></i> MARŞ!
                                                               </span>
                                                           )}
                                                       </div>
                                                    </div>
                                                    {item.note && <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5 bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-500/20">Not: {item.note}</span>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                                    {ticket.status === 'NEW' ? (
                                        <button
                                            onClick={() => updateTicketStatus(ticket.id, 'PREPARATION')}
                                            className="w-11/12 mx-auto py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition shadow-sm"
                                        >
                                            <i className="fat fa-fire-burner mr-2"></i> Hazırlamaya Başla
                                        </button>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => {
                                                    const hasWaiting = ticket.items.some(i => i.isWaiting && !i.isMarshed);
                                                    const allActiveReady = ticket.items.filter(i => !i.isWaiting || i.isMarshed).every(i => i.isReady);
                                                    
                                                    if (hasWaiting) {
                                                        showSwal({
                                                            title: 'Bekleyen Ürün Var!',
                                                            text: 'Bu masada henüz Marş verilmemiş ürünler var. Sadece hazırlananlar bitti olarak işaretlenecek.',
                                                            icon: 'warning'
                                                        });
                                                        // Belki burada sadece aktifleri bitti yaparız ama zaten kalem bazlı tıklanabiliyor.
                                                        // Bu yüzden sadece uyarı verip masayı kapatmıyoruz.
                                                    } else if (!allActiveReady) {
                                                        showSwal({
                                                            title: 'Tamamlanmamış Ürünler!',
                                                            text: 'Lütfen tüm ürünleri bitti (kırmızı) olarak işaretleyin.',
                                                            icon: 'info'
                                                        });
                                                    } else {
                                                        updateTicketStatus(ticket.id, 'READY');
                                                    }
                                                }}
                                                className={`py-2.5 font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2 ${ticket.items.every(i => i.isReady) ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-70'}`}
                                            >
                                                <i className="fat fa-check-double"></i> Siparişi Kapat
                                            </button>
                                            <button
                                                onClick={() => updateTicketStatus(ticket.id, 'NEW')}
                                                className="py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition flex items-center justify-center gap-2"
                                            >
                                                <i className="fat fa-rotate-left"></i> Geri
                                            </button>
                                        </div>
                                    )}
                                    {ticket.items.some(i => i.isWaiting && !i.isMarshed) && (
                                        <div className="text-[10px] text-center text-amber-600 dark:text-amber-500 font-bold uppercase tracking-tighter animate-pulse">
                                            <i className="fat fa-triangle-exclamation mr-1"></i> Bekleyen Marş Var - Masa Kapatılamaz
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {tickets.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl transition-all">
                            <span className="text-6xl mb-4 opacity-30">{activeFilter === 'finished' ? '📦' : '🍳'}</span>
                            <p className="text-2xl font-bold">{activeFilter === 'finished' ? 'Henüz biten sipariş yok.' : 'Bekleyen sipariş yok.'}</p>
                            <p className="text-slate-600 mt-2">{activeFilter === 'finished' ? 'Siparişler tamamlandığında burada görünür.' : 'Mutfak sakin.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
