'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { showSwal, toastSwal } from '../utils/swal';
import { useLocale, useTranslations } from 'next-intl';

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
    isQuickSale?: boolean;
}

interface Zone { id: number; name: string; }
interface Table { id: number; name: string; status: string; waiterName?: string; orderStartTime?: string; currentTotal?: number; zone: { id: number } }

export default function PosPage() {
    const { user, loginPin, logout, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');

    const [products, setProducts] = useState<Product[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedZone, setSelectedZone] = useState<number | null>(null);
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [cashiers, setCashiers] = useState<any[]>([]);
    const [pinCashier, setPinCashier] = useState<any | null>(null);
    const [pinCode, setPinCode] = useState('');
    const [isPinRequired, setIsPinRequired] = useState(true);

    const API_URL = 'http://localhost:3050';

    const fetchCashiers = async () => {
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const res = await fetch(`${API_URL}/auth/cashiers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setCashiers(data);
        } catch (e) {
            console.error('Error fetching cashiers:', e);
        }
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            if (!token) return;
            const [productsRes, tablesRes, zonesRes] = await Promise.all([
                fetch(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                fetch(`${API_URL}/tables`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                fetch(`${API_URL}/zones`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
            ]);
            setProducts(productsRes);
            setTables(tablesRes);
            setZones(zonesRes);
            if (zonesRes.length > 0) setSelectedZone(zonesRes[0].id);
        } catch (error) {
            console.error('Error fetching POS data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) {
            fetchData();
            fetchCashiers();
        }
    }, [user, loading, router]);

    const handlePinSubmit = async (val: string) => {
        if (!pinCashier) return;
        try {
            await loginPin(pinCashier.id, val);
            setIsPinRequired(false);
            setPinCode('');
            toastSwal({ icon: 'success', title: `${tc('success')}, ${pinCashier.firstName}` });
        } catch (e) {
            setPinCode('');
            showSwal({ icon: 'error', title: t('invalidPin') || 'Hatalı PIN', text: t('invalidPinDesc') || 'Lütfen tekrar deneyin.' });
        }
    };

    const handlePinClick = (num: string) => {
        const newPin = pinCode + num;
        if (newPin.length <= 4) {
            setPinCode(newPin);
            if (newPin.length === 4) {
                handlePinSubmit(newPin);
            }
        }
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const handleSendToKitchen = async () => {
        if (!selectedTable || cart.length === 0) return;

        try {
            const token = localStorage.getItem('token') || user?.token;
            const waiterId = user?.id || user?.sub;
            console.log('Sending order with waiterId:', waiterId);

            const orderData = {
                table: { id: selectedTable.id },
                waiter: { id: waiterId },
                items: cart.map(item => ({
                    product: { id: item.product.id },
                    quantity: item.quantity,
                    unitPrice: item.product.price
                })),
                totalAmount: totalAmount * 1.1, // Including KDV
                status: 'NEW'
            };

            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                toastSwal({
                    icon: 'success',
                    title: t('orderSentToKitchen') || 'Sipariş Mutfağa Gönderildi',
                });
                setCart([]);
                setSelectedTable(null);
                fetchData(); // Refresh table status
            } else {
                const errorData = await response.json();
                showSwal({
                    title: 'Hata!',
                    text: errorData.message || t('orderSendError') || 'Sipariş gönderilemedi.',
                    icon: 'error',
                });
            }
        } catch (error) {
            console.error('Error sending order to kitchen:', error);
            showSwal({
                title: tc('error'),
                text: tc('systemError') || 'Sistem hatası oluştu.',
                icon: 'error',
            });
        }
    };

    const handleCheckout = async (paymentMethod: 'Nakit' | 'Kart') => {
        if (!selectedTable) return;

        // In a real app, this would create a 'Sale' record and clear the table
        // For now, let's just show success and clear the table locally
        showSwal({
            title: tc('success'),
            text: `${t('paymentCollected')} (${paymentMethod})!`,
            icon: 'success',
        });

        // Reset table status locally for demo purposes (ideally would be an API call)
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            await fetch(`${API_URL}/tables/${selectedTable.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'BOŞ',
                    waiterName: null,
                    orderStartTime: null,
                    currentTotal: 0
                })
            });
        } catch (e) { console.error(e); }

        setCart([]);
        setSelectedTable(null);
        setIsCheckoutOpen(false);
        fetchData();
    };

    const categories = [tc('all'), ...Array.from(new Set(products.filter(p => p.isQuickSale).map(p => p.category)))];
    const filteredProducts = products.filter(p => p.isQuickSale && (selectedCategory === tc('all') || p.category === selectedCategory));

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    if (loading || !user) return null;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-800 font-sans overflow-hidden transition-colors duration-300 relative">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-600/10 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>

            {/* Sol Pane - Ürünler veya Masa Seçimi */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto w-full md:w-auto relative z-10">
                {selectedTable ? (
                    <>
                        {/* Üst Kısım: Başlık & Geri Dön */}
                        <div className="mb-4 flex items-center justify-between">
                            <h1 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{selectedTable.name} {t('order')}</h1>
                            <div className="flex items-center gap-3">
                                <button onClick={() => {
                                    setIsPinRequired(true);
                                    setPinCashier(null);
                                }} className="text-slate-500 hover:text-rose-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm">
                                    <i className="fat fa-reply"></i> Çıkış
                                </button>
                                <button onClick={() => setSelectedTable(null)} className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm">
                                    <i className="fat fa-reply"></i> {t('backToTables') || 'Masalara Dön'}
                                </button>
                            </div>
                        </div>

                        {/* Kategoriler - Alt Satır */}
                        <div className="mb-6">
                            <div className="flex bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-full p-1.5 shadow-sm border border-white/50 dark:border-slate-700/50 overflow-x-auto hide-scrollbar transition-colors">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 block whitespace-nowrap ${selectedCategory === cat ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ürün Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="relative h-40 bg-white dark:bg-slate-800 rounded-3xl cursor-pointer shadow-md hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 overflow-hidden group hover:-translate-y-1"
                                >
                                    {/* Arka Plan Görseli / Emoji Mapped Area */}
                                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-800 dark:text-gray-100 drop-shadow-sm text-5xl opacity-50">
                                                {product.category === 'Kahveler' ? '☕' : product.category === 'Tatlılar' ? '🍰' : '🍹'}
                                            </span>
                                        )}
                                        {/* Karanlık Gradyan Katmanı (Yazıların Okunması İçin) */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
                                    </div>

                                    {/* Ürün Metin ve Fiyat Alanı */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center text-center justify-end z-10">
                                        <h3 className="font-bold text-white mb-0.5 text-sm line-clamp-2 leading-tight drop-shadow-lg">{product.name}</h3>
                                        <span className="font-extrabold text-white bg-indigo-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] shadow-sm shadow-indigo-900/50 mt-1">₺{product.price}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">{t('selectTable') || 'Masa Seçimi'}</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('selectTableDesc') || 'İşlem yapmak istediğiniz masayı seçin'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsPinRequired(true);
                                        setPinCashier(null);
                                    }}
                                    className="text-slate-500 hover:text-rose-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm"
                                >
                                    <i className="fat fa-reply"></i> Çıkış
                                </button>
                                <button
                                    onClick={() => router.push(`/${locale}/dashboard`)}
                                    className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm"
                                >
                                    <i className="fat fa-reply"></i> {tc('back')}
                                </button>
                            </div>
                        </div>

                        {/* Zone Seçimi */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                            {Array.isArray(zones) && zones.map(z => (
                                <button
                                    key={z.id}
                                    onClick={() => setSelectedZone(z.id)}
                                    className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${selectedZone === z.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                                >
                                    {z.name}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.isArray(tables) && tables.filter(t => t.zone?.id === selectedZone).map(table => (
                                <div
                                    key={table.id}
                                    onClick={() => setSelectedTable(table)}
                                    className={`relative p-6 rounded-[32px] cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border flex flex-col items-center justify-center text-center gap-2 group ${table.status === 'BOŞ' ? 'bg-white/60 dark:bg-slate-800/60 border-white dark:border-slate-700' :
                                        table.status === 'REZERVE' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' :
                                            'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}
                                >
                                    <div className="absolute top-4 right-4 animate-pulse">
                                        <div className={`w-2 h-2 rounded-full ${table.status === 'BOŞ' ? 'bg-emerald-500' : table.status === 'REZERVE' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                    </div>

                                    <span className="text-4xl mb-1 group-hover:scale-110 transition-transform">
                                        {table.status === 'BOŞ' ? '🪑' : table.status === 'REZERVE' ? '📅' : '🍽️'}
                                    </span>
                                    <span className="font-extrabold text-slate-800 dark:text-white uppercase tracking-tighter text-lg">{table.name}</span>

                                    {table.status === 'DOLU' ? (
                                        <div className="flex flex-col items-center gap-1 mt-1 border-t border-rose-200 dark:border-rose-500/20 pt-3 w-full">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                                <span className="opacity-70">👤</span>
                                                <span>{table.waiterName || 'Garson'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                <span className="opacity-70">🕒</span>
                                                <span>{formatTime(table.orderStartTime)}</span>
                                            </div>
                                            <div className="mt-2 text-rose-700 dark:text-rose-300 font-extrabold text-sm drop-shadow-sm">
                                                ₺{table.currentTotal || '0.00'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 mt-1 opacity-40">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('emptyTable') || 'BOŞ MASA'}</span>
                                        </div>
                                    )}

                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full mt-2 uppercase tracking-tighter ${table.status === 'BOŞ' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                        table.status === 'REZERVE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                            'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                        {table.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Sağ Pane - Adisyon (Cart) */}
            <div className="w-[400px] min-w-[400px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-l border-white/50 dark:border-slate-700/50 flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20 transition-colors">
                <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        {t('orderDetail') || 'Adisyon'}
                        {selectedTable && (
                            <span className="bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 py-1.5 px-4 rounded-full text-sm font-bold shadow-inner">{selectedTable.name}</span>
                        )}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {!selectedTable ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            <p>{t('pleaseSelectTable') || 'Lütfen masa seçiniz'}</p>
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <p>{t('noProductAdded') || 'Henüz ürün eklenmedi'}</p>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div key={index} className="flex flex-col gap-2 p-3 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-2xl transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 shadow-sm hover:shadow-md">
                                <div className="flex justify-between items-start">
                                    <span className="block font-medium text-slate-800 dark:text-slate-200">{item.product.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-100">₺{item.quantity * item.product.price}</span>
                                        <button
                                            onClick={() => removeFromCart(item.product.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                            title={tc('delete')}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-indigo-500 font-semibold">{t('unit')} ₺{item.product.price}</span>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50">
                                        <button
                                            onClick={() => {
                                                if (item.quantity === 1) removeFromCart(item.product.id);
                                                else {
                                                    setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i));
                                                }
                                            }}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                                        </button>
                                        <span className="w-8 text-center font-bold text-slate-800 dark:text-slate-100">{item.quantity}</span>
                                        <button
                                            onClick={() => addToCart(item.product)}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-500 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Ödeme / Alt Kısım */}
                <div className="p-6 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-xl border-t border-white/50 dark:border-slate-700/50 m-4 rounded-3xl transition-colors shadow-inner">
                    <div className="flex justify-between mb-2 text-slate-500 dark:text-slate-400 text-sm">
                        <span>{t('subtotal') || 'Ara Toplam'}</span>
                        <span>₺{totalAmount}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-slate-500 dark:text-slate-400 text-sm">
                        <span>KDV (%10)</span>
                        <span>₺{(totalAmount * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-6">
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('total') || 'Genel Toplam'}</span>
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">₺{(totalAmount * 1.1).toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        <button
                            onClick={handleSendToKitchen}
                            className="col-span-2 py-4 rounded-2xl bg-white dark:bg-slate-700 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold text-lg shadow-lg hover:bg-indigo-50 dark:hover:bg-slate-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            disabled={cart.length === 0}
                        >
                            {t('toKitchen') || 'Mutfağa'}
                        </button>
                        <button
                            onClick={() => setIsCheckoutOpen(true)}
                            className="col-span-3 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            disabled={cart.length === 0}
                        >
                            {t('collectPayment') || 'Ödeme Al'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 transform transition-all">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">💳</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('paymentMethod') || 'Ödeme Yöntemi'}</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('paymentMethodDesc') || 'Lütfen tahsilat tipini seçiniz.'}</p>

                            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 mb-8 pb-6 border-b border-slate-100 dark:border-slate-700">
                                ₺{(totalAmount * 1.1).toFixed(2)}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleCheckout('Nakit')}
                                    className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl transition-all shadow-sm group"
                                >
                                    <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">💵</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{t('paymentCash') || 'Nakit'}</span>
                                </button>
                                <button
                                    onClick={() => handleCheckout('Kart')}
                                    className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-2xl transition-all shadow-sm group"
                                >
                                    <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">💳</span>
                                    <span className="font-bold text-blue-700 dark:text-blue-400">{t('paymentCreditCard') || 'Kredi Kartı'}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setIsCheckoutOpen(false)}
                                className="mt-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors"
                            >
                                {tc('cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Geri Dön Butonu - Float */}
            {/* <button
                onClick={() => router.push('/dashboard')}
                className="absolute top-6 right-[430px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-all z-30"
                title="Panoya Dön"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button> */}
            {/* PIN Entry Overlay */}
            {isPinRequired && (
                <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl p-8 flex flex-col items-center">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">🔐</span>
                        </div>

                        {!pinCashier ? (
                            <>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">{t('cashierSelection') || 'Kasiyer Seçimi'}</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-8">{t('cashierSelectionDesc') || 'Lütfen giriş yapmak için adınızı seçin.'}</p>
                                <div className="grid grid-cols-2 w-full gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {cashiers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setPinCashier(c)}
                                            className="w-full py-4 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-left font-bold text-slate-800 dark:text-slate-200 transition-all flex items-center justify-between group"
                                        >
                                            <span>{c.firstName} {c.lastName}</span>
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">➡️</span>
                                        </button>
                                    ))}
                                    {cashiers.length === 0 && (
                                        <p className="text-center text-slate-500 italic py-4">{t('noCashierFound') || 'Sistemde kasiyer bulunamadı.'}</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setPinCashier(null)}
                                    className="absolute top-10 left-10 text-slate-400 hover:text-indigo-500 flex items-center gap-2 font-bold"
                                >
                                    {tc('back')}
                                </button>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">{pinCashier.firstName} {pinCashier.lastName}</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-8">{t('enterPin') || '4 haneli PIN kodunuzu girin.'}</p>

                                <div className="flex gap-4 mb-10">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className={`w-4 h-4 rounded-full border-2 border-indigo-400 ${pinCode.length > i ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-transparent'}`}
                                        />
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => handlePinClick(n)}
                                            className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-2xl font-black text-slate-800 dark:text-white transition-all active:scale-90"
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    <div />
                                    <button
                                        onClick={() => handlePinClick('0')}
                                        className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-2xl font-black text-slate-800 dark:text-white transition-all active:scale-90"
                                    >
                                        0
                                    </button>
                                    <button
                                        onClick={() => setPinCode('')}
                                        className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        {tc('delete')}
                                    </button>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => router.push(`/${locale}/dashboard`)}
                            className="mt-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm uppercase tracking-widest"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
