'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { useLocale, useTranslations } from 'next-intl';
import { showSwal, toastSwal } from '../utils/swal';
import { printReceipt } from '../utils/print';
import { useTheme } from 'next-themes';
import ShiftManager from '@/components/shifts/ShiftManager';

import SetMenuSelectionModal from './SetMenuSelectionModal';

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    imageUrl: string;
    isQuickSale: boolean;
    sku: string;
    barcode?: string;
    isSet?: boolean;
    setMenu?: {
        setType: string;
        groups: {
            id?: number;
            groupName: string;
            minSelect: number;
            maxSelect: number;
            items: {
                productId: number;
                priceDiff: number;
                isDefault: boolean;
            }[];
        }[];
    };
}

interface CartItem {
    product: Product;
    quantity: number;
    subItems?: any[];
    extraPrice?: number;
    uniqueId?: string;
}

export default function QuickSaleView({ onSwitchToPos }: { onSwitchToPos: () => void }) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const { user, loading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) : (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')));

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CREDIT_CARD'>('CASH');

    const [activeShift, setActiveShift] = useState<any | null>(null);
    const [activeCashRegister, setActiveCashRegister] = useState<any | null>(null);
    const [shiftReady, setShiftReady] = useState(false);

    const [selectedSetMenuProduct, setSelectedSetMenuProduct] = useState<Product | null>(null);
    const [isSetMenuModalOpen, setIsSetMenuModalOpen] = useState(false);

    const handleSetMenuConfirm = (subItems: any[], extraPrice: number) => {
        if (!selectedSetMenuProduct) return;
        setCart(prev => [
            ...prev,
            {
                product: selectedSetMenuProduct,
                quantity: 1,
                subItems,
                extraPrice,
                uniqueId: Date.now().toString() + Math.random().toString(36).substring(7)
            }
        ]);
        setIsSetMenuModalOpen(false);
        setSelectedSetMenuProduct(null);
    };

    useEffect(() => {
        if (activeCashRegister?.allowedPaymentMethods?.length > 0) {
            if (!activeCashRegister.allowedPaymentMethods.includes('Nakit') && activeCashRegister.allowedPaymentMethods.includes('Kart')) {
                setSelectedPaymentMethod('CREDIT_CARD');
            } else if (!activeCashRegister.allowedPaymentMethods.includes('Kart') && activeCashRegister.allowedPaymentMethods.includes('Nakit')) {
                setSelectedPaymentMethod('CASH');
            }
        }
    }, [activeCashRegister]);

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`${API_URL}/products/quicksale`, { headers });

            const allProducts = res.data;
            setProducts(allProducts);

            const cats: string[] = ['all', ...Array.from(new Set(allProducts.map((p: any) => p.category).filter(Boolean))) as string[]];
            setCategories(cats);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) router.push(`/${locale}/login`);
        if (user) {
            fetchData();
        }
    }, [user, authLoading, locale]);


    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.includes(searchQuery);
            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    const addToCart = (product: Product) => {
        if (product.isSet && product.setMenu?.setType !== 'FIX') {
            setSelectedSetMenuProduct(product);
            setIsSetMenuModalOpen(true);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id && !item.uniqueId);
            if (existing) {
                return prev.map(item =>
                    (item.product.id === product.id && !item.uniqueId) ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (itemToRemove: CartItem) => {
        setCart(prev => {
            if (itemToRemove.uniqueId) {
                return prev.filter(i => i.uniqueId !== itemToRemove.uniqueId);
            }
            return prev.filter(item => item.product.id !== itemToRemove.product.id || item.uniqueId);
        });
    };

    const updateQuantity = (itemToUpdate: CartItem, delta: number) => {
        setCart(prev => prev.map(item => {
            const isMatch = itemToUpdate.uniqueId
                ? item.uniqueId === itemToUpdate.uniqueId
                : item.product.id === itemToUpdate.product.id && !item.uniqueId;

            if (isMatch) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((sum, item) => sum + ((item.product.price + (item.extraPrice || 0)) * item.quantity), 0);
    }, [cart]);

    const handleCompleteSale = async (paymentMethod: string, shouldPrint: boolean = true) => {
        if (cart.length === 0) {
            showSwal({ title: 'Hata', text: 'Sepetiniz boş.', icon: 'error' });
            return;
        }

        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };

            const saleData = {
                totalAmount,
                paymentMethod,
                cashRegisterId: activeCashRegister?.id || null,
                shiftId: activeShift?.id || null,
                status: 'COMPLETED',
                tableName: 'QUICKSALE',
                description: 'Perakende Müşteri',
                waiterId: activeShift?.user?.id || activeShift?.userId || user?.id || user?.sub,
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price + (item.extraPrice || 0),
                    total: (item.product.price + (item.extraPrice || 0)) * item.quantity,
                    subItems: item.subItems
                }))
            };

            const res = await axios.post(`${API_URL}/sales`, saleData, { headers });

            // Prepare Print Data
            const printData = {
                companyName: 'ANTIGRAVITY POS',
                cashierName: activeShift?.user?.firstName || user?.firstName || user?.name || 'Kasiyer',
                date: new Date(),
                items: cart.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price + (item.extraPrice || 0),
                    total: (item.product.price + (item.extraPrice || 0)) * item.quantity,
                    subItems: item.subItems
                })),
                totalAmount: totalAmount,
                paymentMethod: paymentMethod,
                receiptNumber: res.data?.id?.toString() || Math.floor(100000 + Math.random() * 900000).toString()
            };

            // 1. Attempt Network Printing (Kasa Printer via Backend API) if requested
            if (shouldPrint) {
                try {
                    const printRes = await axios.post(`${API_URL}/printers/print-receipt`, printData, { headers });

                    if (printRes.data.success) {
                        showSwal({
                            title: 'Başarılı',
                            text: 'Satış tamamlandı ve fiş yazıcıya gönderildi.',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    } else {
                        showSwal({
                            title: 'Yazdırma Sorunu',
                            text: 'Satış tamamlandı ancak: ' + printRes.data.message,
                            icon: 'warning'
                        });
                    }
                } catch (printError: any) {
                    showSwal({
                        title: 'Satış Başarılı',
                        text: 'Satış kaydedildi ancak yazıcı bağlantı hatası oluştu: ' + (printError.response?.data?.message || printError.message),
                        icon: 'warning'
                    });
                }
            } else {
                showSwal({
                    title: 'Başarılı',
                    text: 'Satış başarıyla kaydedildi.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }

            setCart([]);
        } catch (error: any) {
            showSwal({
                title: 'Hata',
                text: error.response?.data?.message || 'Satış kaydedilirken bir hata oluştu.',
                icon: 'error'
            });
        }
    };

    if (loading || authLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-white transition-colors">{tc('loading')}</div>;

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex overflow-hidden transition-colors duration-300">

            {/* Shift Manager Overlay moved to right header */}

            {/* Left Side: Product Selection (70%) */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
                            <i className="fat fa-bolt text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-wider text-orange-500">{t('quickSale') || 'Hızlı Satış'}</h3>
                            <h5 className="text-slate-500 text-xs font-medium uppercase tracking-widest">{t('quickSaleDesc') || 'Hızlı perakende ve ödeme'}</h5>
                        </div>
                    </div>

                    <div className="flex gap-3">

                        {/* Barcode Scanner Input */}
                        <div className="relative">
                            <i className="fat fa-barcode absolute left-4 top-1/2 -translate-y-1/2 text-orange-500"></i>
                            <input
                                autoFocus
                                className="bg-white dark:bg-slate-800 border-2 border-orange-500/30 rounded-2xl py-3 pl-12 pr-4 text-sm font-black text-orange-500 placeholder:text-orange-500/50 focus:ring-4 ring-orange-500/20 transition-all outline-none w-48 shadow-lg shadow-orange-500/5 h-12"
                                placeholder="BARKOD"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const barcode = (e.target as HTMLInputElement).value;
                                        if (barcode) {
                                            const product = products.find(p => p.barcode === barcode || p.sku === barcode);
                                            if (product) {
                                                addToCart(product);
                                                toastSwal({ icon: 'success', title: `${product.name} eklendi` });
                                            } else {
                                                toastSwal({ icon: 'error', title: 'Ürün bulunamadı' });
                                            }
                                            (e.target as HTMLInputElement).value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                        {/* Search Input Moved Here */}
                        <div className="relative">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-64 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-4 ring-orange-500/20 transition-all outline-none shadow-sm"
                                placeholder={tc('search')}
                            />
                        </div>
                        {/* Sales Button */}
                        {/* <button onClick={() => router.push(`/${locale}/admin/sales`)} className="h-12 px-6 rounded-2xl bg-orange-500/10 text-orange-500 font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-orange-500/20 transition-all border border-orange-500/20 active:scale-95 shadow-sm">
                            <i className="fat fa-basket-shopping text-orange-500"></i> Satışlar
                        </button> */}

                        {/* Shift Manager Overlay / Vardiya Kapat Butonu */}
                        <ShiftManager
                            user={user}
                            apiUrl={API_URL}
                            onShiftOpen={(shift: any, cashRegister: any) => {
                                setActiveShift(shift);
                                setActiveCashRegister(cashRegister);
                                setShiftReady(true);
                            }}
                            onShiftClose={() => {
                                setActiveShift(null);
                                setActiveCashRegister(null);
                                setShiftReady(false);
                            }}
                        />

                        {/* Theme Toggle */}
                        <button onClick={onSwitchToPos} className="h-12 px-6 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-indigo-500/20 transition-all border border-indigo-500/20 active:scale-95 shadow-sm">
                            <i className="fat fa-cash-register text-indigo-500"></i> Kasa
                        </button>

                        <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition flex items-center gap-2">
                            <i className="fat fa-home"></i> Ana Menü
                        </button>

                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all text-xl"
                            title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                        >
                            <i className={`fat ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-orange-500`}></i>
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 h-12 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center ${selectedCategory === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm'}`}
                            >
                                {cat === 'all' ? tc('all') : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max custom-scrollbar pr-2 pb-6 max-h-[calc(100vh-200px)]">
                    {filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="group relative bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-md dark:shadow-black/20 hover:border-orange-500/50 hover:shadow-orange-500/20 transition-all duration-300 flex flex-col justify-end p-2"
                            style={{ height: '160px', minHeight: '160px', maxHeight: '160px' }}
                        >
                            {/* Background Image or Icon */}
                            <div className="absolute inset-0 z-0 bg-slate-800 flex items-center justify-center">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl.startsWith('http') || product.imageUrl.startsWith('data:') || product.imageUrl.startsWith('/')
                                            ? product.imageUrl
                                            : `/uploads/products/${product.imageUrl}`
                                        }
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <i className="fat fa-box-open text-[40px] text-slate-300 dark:text-slate-700 group-hover:text-orange-500/50 transition-colors duration-500"></i>
                                )}
                            </div>

                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent flex flex-col justify-end p-2">
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>

                            {/* Content Over the Background */}
                            <div className="relative z-20 w-full flex flex-col items-center justify-end text-center h-full">
                                <div className="text-[11px] font-black uppercase tracking-tight text-white line-clamp-2 leading-tight mb-1 group-hover:text-orange-400 transition-colors drop-shadow-md">
                                    {product.name}
                                </div>
                                <div className="bg-slate-900/80 px-3 py-1 rounded-xl backdrop-blur-md border border-white/10 text-orange-400 font-extrabold text-[13px] shadow-lg">
                                    {product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-[10px]">₺</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side: Cart (30%) */}
            <div className="w-[450px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col transition-colors duration-300">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h4 className="font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('orderDetail') || 'Sipariş Detayı'}</h4>
                    <button onClick={() => setCart([])} className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-400 transition">{t('clearCart') || 'Temizle'}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.map((item, idx) => {
                        const uniqueKey = item.uniqueId || `cart-${item.product.id}-${idx}`;
                        return (
                            <div key={uniqueKey} className="flex flex-col gap-1">
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group">
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-slate-800 dark:text-white uppercase line-clamp-1">
                                            {item.product.name}
                                            {item.extraPrice ? <span className="text-indigo-500 ml-1">(+₺{item.extraPrice})</span> : null}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 mt-1">
                                            {(item.product.price + (item.extraPrice || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ x {item.quantity}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                                            <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-orange-500"><i className="fat fa-minus"></i></button>
                                            <span className="w-8 text-center text-xs font-black text-slate-800 dark:text-white">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-orange-500"><i className="fat fa-plus"></i></button>
                                        </div>
                                        <button onClick={() => removeFromCart(item)} className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i className="fat fa-trash"></i></button>
                                    </div>
                                </div>
                                {item.subItems && item.subItems.length > 0 && (
                                    <div className="ml-6 flex flex-col gap-1 mb-2">
                                        {item.subItems.map((sub: any, sIdx: number) => (
                                            <div key={sIdx} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                                <i className="fat fa-caret-right"></i>
                                                <span>{sub.product?.name || `Ürün #${sub.productId}`}</span>
                                                {sub.unitPrice > 0 && <span className="text-indigo-400">(+₺{sub.unitPrice})</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900/80 p-6 rounded-3xl border border-orange-500/20 shadow-lg">
                        <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('total') || 'Toplam'}</span>
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-orange-500 text-lg uppercase tracking-tight">₺</span></span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-2">
                        {(!activeCashRegister?.allowedPaymentMethods || activeCashRegister.allowedPaymentMethods.length === 0 || activeCashRegister.allowedPaymentMethods.includes('Nakit')) && (
                        <button
                            onClick={() => { if(cart.length > 0) setSelectedPaymentMethod('CASH'); }}
                            className={`rounded-2xl py-3 flex flex-col items-center justify-center gap-1 transition-all border-2 ${selectedPaymentMethod === 'CASH' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/80'} ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            <i className="fat fa-money-bill-wave text-xl"></i>
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('paymentCash') || 'Nakit'}</span>
                        </button>
                        )}
                        {(!activeCashRegister?.allowedPaymentMethods || activeCashRegister.allowedPaymentMethods.length === 0 || activeCashRegister.allowedPaymentMethods.includes('Kart')) && (
                        <button
                            onClick={() => { if(cart.length > 0) setSelectedPaymentMethod('CREDIT_CARD'); }}
                            className={`rounded-2xl py-3 flex flex-col items-center justify-center gap-1 transition-all border-2 ${selectedPaymentMethod === 'CREDIT_CARD' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/80'} ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            <i className="fat fa-credit-card text-xl"></i>
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('paymentCreditCard') || 'Kredi Kartı'}</span>
                        </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-4">
                        <button
                            onClick={() => handleCompleteSale(selectedPaymentMethod, false)}
                            disabled={cart.length === 0}
                            className={`rounded-2xl py-4 flex flex-col items-center justify-center gap-1 transition-all border shadow-sm ${cart.length === 0 ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/20 active:scale-95'}`}
                        >
                            <i className={`fat fa-save text-xl ${cart.length === 0 ? 'text-slate-400' : 'text-orange-500'}`}></i>
                            <span className="text-xs font-black uppercase tracking-widest">Kaydet</span>
                        </button>
                        <button
                            onClick={() => handleCompleteSale(selectedPaymentMethod, true)}
                            disabled={cart.length === 0}
                            className={`rounded-2xl py-4 flex flex-col items-center justify-center gap-1 transition-all border shadow-sm ${cart.length === 0 ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/20 active:scale-95'}`}
                        >
                            <div className="flex gap-2 items-center">
                                <i className={`fat fa-save text-xl ${cart.length === 0 ? 'text-slate-400' : 'text-orange-500'}`}></i>
                                <i className={`fat fa-print text-xl ${cart.length === 0 ? 'text-slate-400' : 'text-orange-500'}`}></i>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">Fiş Yazdır</span>
                        </button>
                    </div>
                </div>
            </div>


            {selectedSetMenuProduct && (
                <SetMenuSelectionModal
                    isOpen={isSetMenuModalOpen}
                    product={selectedSetMenuProduct}
                    allProducts={products}
                    onClose={() => setIsSetMenuModalOpen(false)}
                    onConfirm={handleSetMenuConfirm}
                />
            )}
        </div>
    );
}
