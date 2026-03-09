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
    const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ cash: 0, creditCard: 0 });
    const [dataLoading, setDataLoading] = useState(true);
    const [cashiers, setCashiers] = useState<any[]>([]);
    const [pinCashier, setPinCashier] = useState<any | null>(null);
    const [pinCode, setPinCode] = useState('');
    const [isPinRequired, setIsPinRequired] = useState(true);
    const [activeOrderIds, setActiveOrderIds] = useState<number[]>([]);
    const [selectedPosItems, setSelectedPosItems] = useState<number[]>([]);

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

    useEffect(() => {
        const fetchTableOrders = async () => {
            if (!selectedTable || selectedTable.status === 'BOŞ' || selectedTable.status === 'REZERVE') {
                setCart([]);
                setActiveOrderIds([]);
                return;
            }
            try {
                const token = localStorage.getItem('token') || (user as any)?.token;
                const res = await fetch(`${API_URL}/orders/table/${selectedTable.id}/active`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const orders = await res.json();
                    let newCart: { product: Product; quantity: number }[] = [];
                    const orderIds: number[] = [];

                    orders.forEach((order: any) => {
                        orderIds.push(order.id);
                        order.items.forEach((item: any) => {
                            const existing = newCart.find(c => c.product.id === item.product.id);
                            if (existing) {
                                existing.quantity += item.quantity;
                            } else {
                                newCart.push({ product: item.product, quantity: item.quantity });
                            }
                        });
                    });

                    setCart(newCart);
                    setActiveOrderIds(orderIds);
                } else {
                    setCart([]);
                    setActiveOrderIds([]);
                }
            } catch (error) {
                console.error('Error fetching table orders:', error);
                setCart([]);
                setActiveOrderIds([]);
            }
        };
        fetchTableOrders();
    }, [selectedTable]);

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



    const handleCheckout = async (paymentMethod: 'Nakit' | 'Kart' | 'Parçalı', cashAmount: number = 0, creditAmount: number = 0) => {
        if (!selectedTable) return;

        const itemsToPay = cart.filter(item => selectedPosItems.includes(item.product.id));
        if (itemsToPay.length === 0) {
            toastSwal({ icon: 'warning', title: 'Ödenecek ürün seçmediniz!' });
            return;
        }

        const selectedTotalAmount = itemsToPay.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const selectedGrandTotal = Number((selectedTotalAmount * 1.1).toFixed(2));

        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const finalPMethod = paymentMethod === 'Nakit' ? 'CASH' : paymentMethod === 'Kart' ? 'CREDIT_CARD' : 'SPLIT';

            const saleData = {
                userId: user?.id || user?.sub,
                paymentMethod: finalPMethod,
                paidAmountCash: paymentMethod === 'Nakit' ? selectedGrandTotal : cashAmount,
                paidAmountCreditCard: paymentMethod === 'Kart' ? selectedGrandTotal : creditAmount,
                paidItems: itemsToPay.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    total: Number((item.quantity * item.product.price * 1.1).toFixed(2))
                }))
            };

            const saleRes = await fetch(`${API_URL}/orders/table/${selectedTable.id}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(saleData)
            });

            if (saleRes.ok) {
                showSwal({
                    title: tc('success'),
                    text: `${t('paymentCollected')} (${paymentMethod})!`,
                    icon: 'success',
                });

                setCart([]);
                setSelectedTable(null);
                setIsCheckoutOpen(false);
                setIsSplitPaymentOpen(false);
                setActiveOrderIds([]);
                setSelectedPosItems([]);
                setSplitAmounts({ cash: 0, creditCard: 0 });
                fetchData();
            } else {
                const errorData = await saleRes.json();
                showSwal({
                    title: 'Hata Detayı!',
                    text: errorData.errorDetails ? String(errorData.errorDetails) : (errorData.message || 'Ödeme alınamadı.'),
                    icon: 'error'
                });
            }
        } catch (e) {
            console.error(e);
            showSwal({ title: 'Hata!', text: 'Sistem hatası oluştu.', icon: 'error' });
        }
    };



    const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    if (loading || !user) return null;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-800 font-sans overflow-hidden transition-colors duration-300 relative">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-600/10 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>

            {/* Sol Pane - Masa Seçimi */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto w-full md:w-auto relative z-10">
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
                            onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
                            className={`relative p-6 rounded-[32px] cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border flex flex-col items-center justify-center text-center gap-2 group ${selectedTable?.id === table.id ? 'ring-4 ring-indigo-500 scale-105 ' : ''}${table.status === 'BOŞ' ? 'bg-white/60 dark:bg-slate-800/60 border-white dark:border-slate-700' :
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
                            <div key={index} className="flex flex-col gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="block font-medium text-slate-800 dark:text-slate-200">{item.product.name} <span className="text-sm text-indigo-500 font-bold ml-1">x{item.quantity}</span></span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">₺{item.quantity * item.product.price}</span>
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
                    <div className="w-full">
                        <button
                            onClick={() => {
                                setIsCheckoutOpen(true);
                                setSelectedPosItems(cart.map(i => i.product.id));
                            }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            disabled={cart.length === 0}
                        >
                            {t('collectPayment') || 'Ödeme Al'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isCheckoutOpen && !isSplitPaymentOpen && (() => {
                const selectedTotalAmount = cart.filter(i => selectedPosItems.includes(i.product.id)).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                const selectedGrandTotal = Number((selectedTotalAmount * 1.1).toFixed(2));
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 transform transition-all flex flex-col max-h-[90vh]">
                            <div className="p-6 text-center shrink-0 border-b border-slate-100 dark:border-slate-700">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">💳</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('paymentMethod') || 'Ödeme ve Ürün Seçimi'}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Ödemesini alacağınız ürünleri seçin.</p>
                            </div>

                            <div className="overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="space-y-2">
                                    {cart.map(item => (
                                        <div
                                            key={item.product.id}
                                            onClick={() => {
                                                if (selectedPosItems.includes(item.product.id)) {
                                                    setSelectedPosItems(prev => prev.filter(id => id !== item.product.id));
                                                } else {
                                                    setSelectedPosItems(prev => [...prev, item.product.id]);
                                                }
                                            }}
                                            className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all border ${selectedPosItems.includes(item.product.id) ? 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/30' : 'bg-white border-transparent dark:bg-slate-800 opacity-60'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${selectedPosItems.includes(item.product.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'}`}>
                                                    {selectedPosItems.includes(item.product.id) && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{item.product.name} <span className="text-sm font-extrabold text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 px-2 py-0.5 rounded-full ml-1">x{item.quantity}</span></span>
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-slate-100">₺{(item.product.price * item.quantity * 1.1).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 shrink-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-end mb-6">
                                    <span className="text-slate-500 font-medium">Ödenecek Tutar</span>
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">
                                        ₺{selectedGrandTotal.toFixed(2)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        onClick={() => handleCheckout('Nakit')}
                                        className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl transition-all font-bold text-emerald-700 dark:text-emerald-400 active:scale-95"
                                    >
                                        <span className="text-xl">💵</span> {t('paymentCash') || 'Nakit'}
                                    </button>
                                    <button
                                        onClick={() => handleCheckout('Kart')}
                                        className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl transition-all font-bold text-blue-700 dark:text-blue-400 active:scale-95"
                                    >
                                        <span className="text-xl">💳</span> {t('paymentCreditCard') || 'Kart'}
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsSplitPaymentOpen(true);
                                        setSplitAmounts({ cash: 0, creditCard: selectedGrandTotal });
                                    }}
                                    className="w-full py-3 flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl transition-all font-bold text-indigo-700 dark:text-indigo-400 active:scale-[0.98]"
                                >
                                    <span className="text-xl">🔀</span> Tutar Böl (Nakit + Kart)
                                </button>

                                <button
                                    onClick={() => setIsCheckoutOpen(false)}
                                    className="mt-4 w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors p-2"
                                >
                                    {tc('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Split Payment Modal */}
            {isSplitPaymentOpen && (() => {
                const selectedTotalAmount = cart.filter(i => selectedPosItems.includes(i.product.id)).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                const selectedGrandTotal = Number((selectedTotalAmount * 1.1).toFixed(2));
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 transform transition-all">
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🔀</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Tutar Bölme (Müşterek)</h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-4">Seçili Satırlar: ₺{selectedGrandTotal.toFixed(2)}</p>

                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nakit Alınan (₺)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={splitAmounts.cash}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                let newCash = val;
                                                if (newCash > selectedGrandTotal) newCash = selectedGrandTotal;
                                                setSplitAmounts({ cash: newCash, creditCard: Number((selectedGrandTotal - newCash).toFixed(2)) });
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Kredi Kartı Alınan (₺)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={splitAmounts.creditCard}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                let newCC = val;
                                                if (newCC > selectedGrandTotal) newCC = selectedGrandTotal;
                                                setSplitAmounts({ creditCard: newCC, cash: Number((selectedGrandTotal - newCC).toFixed(2)) });
                                            }}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => {
                                            setIsSplitPaymentOpen(false);
                                            setIsCheckoutOpen(true); // Geri dönünce ana checkout açılsın
                                            setSplitAmounts({ cash: 0, creditCard: 0 });
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Geri
                                    </button>
                                    <button
                                        onClick={() => handleCheckout('Parçalı', splitAmounts.cash, splitAmounts.creditCard)}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 transition-all"
                                    >
                                        Tahsili Onayla
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
