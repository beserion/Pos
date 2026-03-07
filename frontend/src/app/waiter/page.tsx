'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { showSwal, toastSwal } from '../utils/swal';

interface Product { id: number; name: string; price: number; category: string; imageUrl?: string; }
interface OrderItem { product: Product; quantity: number; }
interface Table {
    id: number;
    name: string;
    status: string;
    zone: { id: number };
    waiterName?: string;
    orderStartTime?: string;
}
interface Zone { id: number; name: string; }

export default function WaiterPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
    const [zones, setZones] = useState<Zone[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedZone, setSelectedZone] = useState<number | null>(null);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');

    const API_URL = 'http://localhost:3050';

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const [zonesRes, tablesRes, productsRes] = await Promise.all([
                axios.get(`${API_URL}/zones`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/tables`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setZones(zonesRes.data);
            setTables(tablesRes.data);
            setProducts(productsRes.data);
            if (zonesRes.data.length > 0) setSelectedZone(zonesRes.data[0].id);
        } catch (error) {
            console.error('Error fetching waiter data:', error);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push('/waiter/login');
        if (user) fetchData();
    }, [user, loading, router]);

    const categories = ['Tümü', ...Array.from(new Set(products.map(p => p.category)))];

    const handleTableClick = (table: Table) => {
        setSelectedTable(table);
        setActiveTab('menu');
        setCart([]);
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing && existing.quantity === 1) return prev.filter(i => i.product.id !== product.id);
            return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity - 1 } : item);
        });
    };

    const sendOrder = async () => {
        if (!selectedTable || cart.length === 0) return;
        try {
            const token = Cookies.get('token');
            const orderPayload = {
                table: { id: selectedTable.id },
                waiter: { id: user?.id },
                totalAmount: cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
                status: 'NEW',
                items: cart.map(item => ({
                    product: { id: item.product.id },
                    quantity: item.quantity,
                    unitPrice: item.product.price
                }))
            };

            await axios.post(`${API_URL}/orders`, orderPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toastSwal({
                icon: 'success',
                title: `${selectedTable.name} Siparişi Mutfaga İletildi!`
            });
            setCart([]);
            setSelectedTable(null);
            setActiveTab('tables');
            fetchData(); // Refresh table status
        } catch (error) {
            showSwal({
                icon: 'error',
                title: 'Hata',
                text: 'Sipariş iletilemedi.'
            });
        }
    };

    const filteredProducts = selectedCategory === 'Tümü' ? products : products.filter(p => p.category === selectedCategory);
    const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col font-sans pb-20 overflow-y-auto">
            <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-20 flex justify-between items-center">
                <div className="font-bold text-xl flex items-center gap-2">
                    <span>📱</span> Garson: {user?.firstName}
                </div>
                {selectedTable && activeTab === 'menu' && (
                    <button onClick={() => setActiveTab('tables')} className="bg-indigo-500/50 hover:bg-indigo-500 px-3 py-1 rounded border border-indigo-400 text-sm font-medium transition">
                        Masalara Dön
                    </button>
                )}
            </header>

            <div className="flex-1 p-4">
                {activeTab === 'tables' ? (
                    <div className="space-y-6">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {zones.map(z => (
                                <button
                                    key={z.id}
                                    onClick={() => setSelectedZone(z.id)}
                                    className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${selectedZone === z.id ? 'bg-indigo-600 text-white border-2 border-indigo-200' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                                >
                                    {z.name}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {tables.filter(t => t.zone?.id === selectedZone).map(table => (
                                <button
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    className={`relative p-6 rounded-3xl shadow-md border flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${table.status === 'BOŞ' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' :
                                        table.status === 'DOLU' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400' :
                                            'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
                                        }`}
                                >
                                    <span className="text-4xl mb-1">🍽️</span>
                                    <span className="font-extrabold text-lg">{table.name}</span>
                                    {table.status === 'DOLU' && (
                                        <div className="flex flex-col items-center gap-0.5 mt-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600/70 dark:text-rose-400/70 bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 rounded-full">
                                                👤 {table.waiterName || 'Bilinmiyor'}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-500">
                                                🕒 {formatTime(table.orderStartTime)}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/50 dark:bg-black/20 mix-blend-multiply dark:mix-blend-normal mt-1">{table.status}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="mb-4">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700 mb-4 inline-block">
                                {selectedTable?.name} Seçiliyor
                            </h2>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {categories.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedCategory(c)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm border ${selectedCategory === c ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {filteredProducts.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => addToCart(p)}
                                    className="relative h-32 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden active:scale-95 transition-all group"
                                >
                                    {/* Arka Plan Görseli / Emoji Mapped Area */}
                                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl mb-1 opacity-50 transition-opacity">
                                                {p.category === 'Kahveler' ? '☕' : p.category === 'Tatlılar' ? '🍰' : '🍹'}
                                            </span>
                                        )}
                                        {/* Karanlık Gradyan Katmanı */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
                                    </div>

                                    {/* Ürün Metin ve Fiyat Alanı */}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col items-center text-center justify-end z-10">
                                        <span className="font-bold text-white text-xs leading-tight mb-0.5 drop-shadow-md line-clamp-2">{p.name}</span>
                                        <span className="font-extrabold text-white bg-indigo-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] shadow-sm mt-1 border border-indigo-400/30">₺{p.price}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'menu' && cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 shadow-2xl rounded-t-3xl z-30 animate-in slide-in-from-bottom">
                    <div className="max-h-48 overflow-y-auto mb-4 space-y-2 pr-2">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm w-1/3 truncate">{item.product.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeFromCart(item.product)} className="w-8 h-8 rounded bg-white dark:bg-slate-700 shadow flex items-center justify-center text-red-500 font-bold">-</button>
                                    <span className="w-5 text-center font-bold text-slate-800 dark:text-slate-200">{item.quantity}</span>
                                    <button onClick={() => addToCart(item.product)} className="w-8 h-8 rounded bg-white dark:bg-slate-700 shadow flex items-center justify-center text-indigo-500 font-bold">+</button>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 w-16 text-right text-sm">₺{item.quantity * item.product.price}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between font-black text-xl mb-4 px-2">
                        <span className="text-slate-600 dark:text-slate-400">Toplam:</span>
                        <span className="text-indigo-600 dark:text-indigo-400">₺{cartTotal.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setCart([])} className="py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300">İptal</button>
                        <button onClick={sendOrder} className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30">Mutfağa İlet</button>
                    </div>
                </div>
            )}
        </div>
    );
}
