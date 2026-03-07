'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { useLocale, useTranslations } from 'next-intl';
import { showSwal } from '../utils/swal';
import { printReceipt } from '../utils/print';

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    imageUrl: string;
    isQuickSale: boolean;
    sku: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

export default function QuickSalePage() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const { user, loading: authLoading } = useAuth();
    const API_URL = 'http://localhost:3050';

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`${API_URL}/products`, { headers });

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
        if (user) fetchData();
    }, [user, authLoading, locale]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.includes(searchQuery);
            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    }, [cart]);

    const handleCompleteSale = async (paymentMethod: string) => {
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
                status: 'COMPLETED',
                items: cart.map(item => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    total: item.product.price * item.quantity
                }))
            };

            const res = await axios.post(`${API_URL}/sales`, saleData, { headers });

            // Prepare Print Data
            const printData = {
                companyName: 'ANTIGRAVITY POS',
                cashierName: user?.name || 'Kasiyer',
                date: new Date(),
                items: cart.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price,
                    total: item.product.price * item.quantity
                })),
                totalAmount: totalAmount,
                paymentMethod: paymentMethod,
                receiptNumber: res.data?.id?.toString() || Math.floor(100000 + Math.random() * 900000).toString()
            };

            // 1. Attempt Network Printing (Kasa Printer via Backend API)
            try {
                const printRes = await axios.post(`${API_URL}/printers/print-receipt`, printData, { headers });

                if (printRes.data.success) {
                    showSwal({
                        title: 'Başarılı',
                        text: 'Satış tamamlandı ve fiy Kasa yazıcısından yazdırılıyor.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    // 2. Fallback to Browser Print if Kasa Printer fails or isn't found
                    printReceipt(printData);

                    showSwal({
                        title: 'Başarılı (Alternatif Yazdırma)',
                        text: 'Satış tamamlandı. ' + printRes.data.message + ' Tarayıcıdan yazdırılıyor.',
                        icon: 'warning',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            } catch (printError) {
                // Fallback to browser print if API request totally fails
                printReceipt(printData);
                showSwal({
                    title: 'Satış Başarılı',
                    text: 'Satış kaydedildi ancak ağ yazıcısına ulaşılamadı. Tarayıcıdan yazdırılıyor.',
                    icon: 'warning',
                    timer: 2000,
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

    if (loading || authLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">{tc('loading')}</div>;

    return (
        <div className="h-screen bg-slate-900 text-slate-100 flex overflow-hidden">
            {/* Left Side: Product Selection (70%) */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
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
                        <div className="relative">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 ring-orange-500/50 transition-all outline-none w-64"
                                placeholder={tc('search')}
                            />
                        </div>
                        <button onClick={() => router.push(`/${locale}/dashboard`)} className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 transition">
                            <i className="fat fa-reply"></i>
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 h-12 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center ${selectedCategory === cat ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            {cat === 'all' ? tc('all') : cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max custom-scrollbar pr-2 pb-6">
                    {filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="group relative bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg shadow-black/20 hover:border-orange-500/50 hover:shadow-orange-500/20 transition-all duration-300 flex flex-col justify-end p-2"
                            style={{ height: '160px', minHeight: '160px', maxHeight: '160px' }}
                        >
                            {/* Background Image or Icon */}
                            <div className="absolute inset-0 z-0 bg-slate-800 flex items-center justify-center">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <i className="fat fa-box-open text-[40px] text-slate-700 group-hover:text-orange-500/50 transition-colors duration-500"></i>
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
            <div className="w-[400px] bg-slate-800 border-l border-slate-700 flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h4 className="font-black uppercase tracking-widest text-slate-400">{t('orderDetail') || 'Sipariş Detayı'}</h4>
                    <button onClick={() => setCart([])} className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-400 transition">{t('clearCart') || 'Temizle'}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.map(item => (
                        <div key={item.product.id} className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700 shadow-sm flex items-center justify-between group">
                            <div className="flex-1">
                                <div className="text-xs font-black text-white uppercase line-clamp-1">{item.product.name}</div>
                                <div className="text-[10px] font-bold text-slate-500 mt-1">
                                    {item.product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ x {item.quantity}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700 p-1">
                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-orange-500"><i className="fat fa-minus"></i></button>
                                    <span className="w-8 text-center text-xs font-black text-white">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-orange-500"><i className="fat fa-plus"></i></button>
                                </div>
                                <button onClick={() => removeFromCart(item.product.id)} className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i className="fat fa-trash"></i></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-700 space-y-4">
                    <div className="flex justify-between items-center bg-slate-900/80 p-6 rounded-3xl border border-orange-500/20 shadow-2xl">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{t('total') || 'Toplam'}</span>
                        <span className="text-3xl font-black text-white">{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-orange-500 text-lg uppercase tracking-tight">₺</span></span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-4">
                        <button
                            onClick={() => handleCompleteSale('CASH')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                            <i className="fat fa-money-bill-wave text-2xl"></i>
                            <span className="text-xs font-black uppercase tracking-widest">{t('paymentCash') || 'Nakit'}</span>
                        </button>
                        <button
                            onClick={() => handleCompleteSale('CREDIT_CARD')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-4 flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <i className="fat fa-credit-card text-2xl"></i>
                            <span className="text-xs font-black uppercase tracking-widest">{t('paymentCreditCard') || 'Kredi Kartı'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
