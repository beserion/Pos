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

interface OrderItem {
    id: number;
    product: { name: string };
    quantity: number;
    note?: string;
}

interface OrderTicket {
    id: number;
    table?: { name: string };
    waiter?: { firstName: string, lastName: string };
    items: OrderItem[];
    status: string;
    createdAt: string;
}

export default function KitchenDisplayPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const { theme, setTheme } = useTheme();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [tickets, setTickets] = useState<OrderTicket[]>([]);
    const [counts, setCounts] = useState({ pending: 0, finished: 0, total: 0 });

    const API_URL = 'http://localhost:3050';

    const fetchKitchenOrders = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/orders/kitchen`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTickets(res.data);

            const countsRes = await axios.get(`${API_URL}/orders/kitchen/counts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCounts(countsRes.data);
        } catch (error) {
            console.error('Error fetching kitchen orders:', error);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) {
            fetchKitchenOrders();
            const interval = setInterval(fetchKitchenOrders, 10000); // Poll every 10s

            // WebSocket Connection for Real-time alerts
            const socket = io(API_URL);

            socket.on('connect', () => console.log('Connected to Kitchen WebSocket'));

            socket.on('newOrder', (order: any) => {
                console.log('Incoming order via WebSocket:', order);
                // Immediately refresh list
                fetchKitchenOrders();

                // Play notification sound
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(e => console.log('Audio autoplay blocked by browser', e));
                } catch (e) { }

                showSwal({
                    title: 'Yeni Sipariş!',
                    text: `${order?.table?.name || 'Paket'} masasından yeni bir sipariş geldi.`,
                    icon: 'info',
                    timer: 5000,
                    showConfirmButton: false
                });
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

    const updateTicketStatus = async (id: number, newStatus: string) => {
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/orders/${id}/status`, { status: newStatus }, {
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
                    <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm h-11 transition-colors duration-300">
                        <div className="flex items-center justify-between gap-3 px-4 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 w-32">
                            <i className="fat fa-fire text-amber-500 text-xl"></i>
                            <div className="flex flex-col items-end justify-center text-right">
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold leading-none mb-1">Bekleyen</span>
                                <span className="text-lg font-black text-amber-600 dark:text-amber-500 leading-none">{counts.pending}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 w-32">
                            <i className="fat fa-check-circle text-emerald-500 dark:text-emerald-400 text-xl"></i>
                            <div className="flex flex-col items-end justify-center text-right">
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold leading-none mb-1">Biten</span>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{counts.finished}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 bg-slate-50 dark:bg-slate-800/80 w-32">
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
                        title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                    >
                        <i className={`fat ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
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
                        const isWarning = elapsed > 10;
                        const isSevere = elapsed > 20;

                        return (
                            <div
                                key={ticket.id}
                                className={`bg-white dark:bg-slate-800 border-t-4 rounded-xl shadow-md dark:shadow-xl overflow-hidden flex flex-col transition-all group ${ticket.status === 'READY' ? 'border-emerald-500 opacity-60 scale-95' :
                                    isSevere ? 'border-rose-500 dark:border-rose-600 shadow-rose-200 dark:shadow-rose-900/50' :
                                        isWarning ? 'border-amber-500' : 'border-slate-300 dark:border-slate-600'
                                    }`}
                            >
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 dark:text-white">{ticket.table?.name || 'Paket'}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">#{ticket.id}</p>
                                            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center gap-1">
                                                <i className="fat fa-user text-[10px]"></i>
                                                {ticket.waiter?.firstName ? `${ticket.waiter.firstName} ${ticket.waiter.lastName}` : 'Terminal/POS'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-right ${isSevere ? 'text-rose-500 dark:text-rose-400 font-bold animate-pulse' : isWarning ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-300'}`}>
                                        <span className="block text-xs uppercase tracking-wider mb-1">Süre</span>
                                        <span className="text-xl">{formatElapsedTime(ticket.createdAt)}</span>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 bg-white dark:bg-slate-800/40">
                                    <ul className="space-y-5">
                                        {ticket.items.map((item, idx) => (
                                            <li key={idx} className="flex gap-4 text-lg group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 p-3 rounded-lg -mx-2 transition-colors border border-transparent dark:hover:border-slate-600/50">
                                                <span className="font-black text-indigo-500 dark:text-indigo-400 text-xl">{item.quantity}x</span>
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-white block text-xl">{item.product?.name}</span>
                                                    {item.note && <span className="text-sm text-amber-600 dark:text-amber-400 font-medium block mt-1 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20">Not: {item.note}</span>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                                    {ticket.status === 'NEW' ? (
                                        <button
                                            onClick={() => updateTicketStatus(ticket.id, 'IN_PREPARATION')}
                                            className="col-span-2 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition shadow-sm"
                                        >
                                            <i className="fat fa-fire-burner mr-2"></i> Hazırlamaya Başla
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => updateTicketStatus(ticket.id, 'READY')}
                                                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <i className="fat fa-bell-concierge"></i> Bitti
                                            </button>
                                            <button
                                                onClick={() => updateTicketStatus(ticket.id, 'NEW')}
                                                className="py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition flex items-center justify-center gap-2"
                                            >
                                                <i className="fat fa-rotate-left"></i> Geri
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {tickets.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-3xl">
                            <span className="text-6xl mb-4 opacity-30">🍳</span>
                            <p className="text-2xl font-bold">Bekleyen sipariş yok.</p>
                            <p className="text-slate-600 mt-2">Mutfak sakin.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
