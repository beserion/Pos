'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { toastSwal } from '../utils/swal';

interface OrderItem {
    id: number;
    product: { name: string };
    quantity: number;
    note?: string;
}

interface OrderTicket {
    id: number;
    table?: { name: string };
    items: OrderItem[];
    status: string;
    createdAt: string;
}

export default function KitchenDisplayPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [tickets, setTickets] = useState<OrderTicket[]>([]);

    const API_URL = 'http://localhost:3050';

    const fetchKitchenOrders = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/orders/kitchen`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTickets(res.data);
        } catch (error) {
            console.error('Error fetching kitchen orders:', error);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (user) {
            fetchKitchenOrders();
            const interval = setInterval(fetchKitchenOrders, 10000); // Poll every 10s
            return () => clearInterval(interval);
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
        <div className="min-h-screen bg-slate-900 font-sans text-slate-200 overflow-y-auto">
            <header className="bg-slate-950 p-4 border-b border-slate-800 shadow-md flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">👨‍🍳</span>
                    <div>
                        <h1 className="text-xl font-extrabold text-white tracking-wide uppercase">Mutfak KDS</h1>
                        <p className="text-emerald-400 text-sm font-bold animate-pulse">Aktif Siparişler</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-center">
                        <span className="block text-xs text-slate-400 uppercase tracking-widest font-bold">Bekleyen</span>
                        <span className="text-xl font-black text-rose-400">{tickets.filter(t => t.status === 'NEW').length}</span>
                    </div>
                    <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition">Çıkış</button>
                </div>
            </header>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
                    {tickets.map(ticket => {
                        const elapsed = Math.floor((currentTime.getTime() - new Date(ticket.createdAt).getTime()) / 60000);
                        const isWarning = elapsed > 10;
                        const isSevere = elapsed > 20;

                        return (
                            <div
                                key={ticket.id}
                                className={`bg-slate-800 border-t-4 rounded-xl shadow-xl overflow-hidden flex flex-col transition-all group ${ticket.status === 'READY' ? 'border-emerald-500 opacity-60 scale-95' :
                                    isSevere ? 'border-rose-600 shadow-rose-900/50' :
                                        isWarning ? 'border-amber-500' : 'border-slate-600'
                                    }`}
                            >
                                <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-black text-white">{ticket.table?.name || 'Paket'}</h2>
                                        <p className="text-slate-400 text-sm mt-1">Sipariş No: #{ticket.id}</p>
                                    </div>
                                    <div className={`text-right ${isSevere ? 'text-rose-400 font-bold animate-pulse' : isWarning ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                                        <span className="block text-xs uppercase tracking-wider mb-1">Süre</span>
                                        <span className="text-xl">{formatElapsedTime(ticket.createdAt)}</span>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 bg-slate-800/40">
                                    <ul className="space-y-3">
                                        {ticket.items.map((item, idx) => (
                                            <li key={idx} className="flex gap-3 text-lg group-hover:bg-slate-700/50 p-2 rounded -mx-2 transition-colors">
                                                <span className="font-black text-indigo-400">{item.quantity}x</span>
                                                <div>
                                                    <span className="font-bold text-white block">{item.product?.name}</span>
                                                    {item.note && <span className="text-sm text-amber-400 font-medium block mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Not: {item.note}</span>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-3 bg-slate-900/50 border-t border-slate-800 grid grid-cols-2 gap-2">
                                    {ticket.status === 'NEW' ? (
                                        <button
                                            onClick={() => updateTicketStatus(ticket.id, 'IN_PREPARATION')}
                                            className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl shadow-lg transition-transform active:scale-95"
                                        >
                                            Hazırlanıyor (Başla)
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => updateTicketStatus(ticket.id, 'READY')}
                                            className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <span>✅</span> Hazır (Bitti)
                                        </button>
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
