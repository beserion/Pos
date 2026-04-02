'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '../AuthContext';
import { useLocale, useTranslations } from 'next-intl';
import { showSwal, toastSwal } from '../utils/swal';
import { printReceipt } from '../utils/print';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import ShiftManager from '@/components/shifts/ShiftManager';
import SetMenuSelectionModal from './SetMenuSelectionModal';

interface Modifier {
    id: number;
    name: string;
    groupName?: string;
}

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
    modifiers?: Modifier[];
    variations?: any[];
}

interface CartItem {
    product: Product;
    quantity: number;
    subItems?: any[];
    extraPrice?: number;
    uniqueId?: string;
    note?: string;
    variationId?: number;
    variationName?: string;
}

export default function QuickSaleView({ onSwitchToPos }: { onSwitchToPos: () => void }) {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const { user, loading: authLoading } = useAuth();
    const { theme, toggleTheme, setTheme } = useThemeTransition();
    const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')) : (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050')));

    const [products, setProducts] = useState<Product[]>([]);
    const [productTypeOptions, setProductTypeOptions] = useState<{ id: string | number; name: string }[]>([]);
    const [selectedProductTypeId, setSelectedProductTypeId] = useState<number | 'all'>('all');
    const [selectedGroupName, setSelectedGroupName] = useState<string>('Tümü');
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Tümü');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CREDIT_CARD'>('CASH');

    const [activeShift, setActiveShift] = useState<any | null>(null);
    const [activeCashRegister, setActiveCashRegister] = useState<any | null>(null);
    const [shiftReady, setShiftReady] = useState(false);

    const [selectedSetMenuProduct, setSelectedSetMenuProduct] = useState<Product | null>(null);
    const [isSetMenuModalOpen, setIsSetMenuModalOpen] = useState(false);

    const [departments, setDepartments] = useState<any[]>([]);
    const [extraPopupOpen, setExtraPopupOpen] = useState(false);
    const [extraPopupProducts, setExtraPopupProducts] = useState<Product[]>([]);
    const [extraPopupParentProduct, setExtraPopupParentProduct] = useState<Product | null>(null);
    const [pendingExtraCartItem, setPendingExtraCartItem] = useState<CartItem | null>(null);

    // --- Variation Modal State ---
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
    const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null);
    const [pendingAddToCartArgs, setPendingAddToCartArgs] = useState<{ skipExtraCheck?: boolean }>({});

    const [noteModalItem, setNoteModalItem] = useState<CartItem | null>(null);
    const [tempNote, setTempNote] = useState('');

    const handleSaveNote = () => {
        if (!noteModalItem) return;
        setCart(prev => prev.map(item => {
            const isMatch = item.uniqueId 
                ? item.uniqueId === noteModalItem.uniqueId
                : (item.product.id === noteModalItem.product.id && !item.uniqueId);
            return isMatch ? { ...item, note: tempNote } : item;
        }));
        setNoteModalItem(null);
    };

    const handleExtraSelect = (extraProduct: Product) => {
        if (!pendingExtraCartItem) return;
        
        const extraItem = {
            productId: extraProduct.id,
            product: extraProduct,
            quantity: 1,
            unitPrice: extraProduct.price,
            isExtra: true
        };

        setCart(prev => prev.map(item => {
            const isMatch = item.uniqueId 
                ? item.uniqueId === pendingExtraCartItem.uniqueId
                : (item.product.id === pendingExtraCartItem.product.id && !item.uniqueId);

            if (isMatch) {
                const subItems = [...(item.subItems || []), extraItem];
                return { ...item, subItems };
            }
            return item;
        }));
    };

    const handleExtraClose = () => {
        setExtraPopupOpen(false);
        setExtraPopupParentProduct(null);
        setPendingExtraCartItem(null);
    };

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
            const [productsRes, departmentsRes, typesRes] = await Promise.all([
                axios.get(`${API_URL}/products/quicksale`, { headers }),
                axios.get(`${API_URL}/departments`, { headers }),
                axios.get(`${API_URL}/product-types`, { headers })
            ]);

            const allProducts = productsRes.data;
            setProducts(allProducts);
            setDepartments(departmentsRes.data);
            
            const types = typesRes.data || [];
            setProductTypeOptions([{ id: 'all', name: tc('all') }, ...types]);
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


    // --- Drill-Down Mantığı (TakeOrderView ile Senkron) ---
    const availableGroups = useMemo(() => {
        const filteredByCins = selectedProductTypeId === 'all' 
            ? products 
            : products.filter(p => (p as any).productTypeId === selectedProductTypeId);
        
        const groups = Array.from(new Set(filteredByCins.map(p => (p as any).stockCard?.stockGroup || 'Diğer').filter(Boolean)));
        return ['Tümü', ...groups.sort()];
    }, [products, selectedProductTypeId]);

    const availableCategories = useMemo(() => {
        const filteredByGroup = products.filter(p => {
            const matchesCins = selectedProductTypeId === 'all' || (p as any).productTypeId === selectedProductTypeId;
            const matchesGroup = selectedGroupName === 'Tümü' || ((p as any).stockCard?.stockGroup || 'Diğer') === selectedGroupName;
            return matchesCins && matchesGroup;
        });
        const cats = Array.from(new Set(filteredByGroup.map(p => (p as any).stockCard?.category || p.category || 'Diğer').filter(Boolean)));
        return ['Tümü', ...cats.sort()];
    }, [products, selectedProductTypeId, selectedGroupName]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCins = selectedProductTypeId === 'all' || (p as any).productTypeId === selectedProductTypeId;
            const matchesGroup = selectedGroupName === 'Tümü' || ((p as any).stockCard?.stockGroup || 'Diğer') === selectedGroupName;
            const matchesCategory = selectedCategoryName === 'Tümü' || ((p as any).stockCard?.category || p.category || 'Diğer') === selectedCategoryName;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.includes(searchQuery);
            return matchesCins && matchesGroup && matchesCategory && matchesSearch;
        });
    }, [products, selectedProductTypeId, selectedGroupName, selectedCategoryName, searchQuery]);

    const addToCart = (product: Product, skipExtraCheck: boolean = false, forceVariationId?: number) => {
        if (!forceVariationId && product.variations && product.variations.filter(v => v.isActive !== false).length > 0) {
            setSelectedProductForVariation(product);
            setPendingAddToCartArgs({ skipExtraCheck });
            setIsVariationModalOpen(true);
            return;
        }

        if (product.isSet && product.setMenu?.setType !== 'FIX') {
            setSelectedSetMenuProduct(product);
            setIsSetMenuModalOpen(true);
            return;
        }

        // --- Ekstra Ürün Popup Mantığı ---
        if (!skipExtraCheck) {
            const dept = departments.find(d => d.name === product.category);
            if (dept && dept.extraDepartmentId) {
                const extraCategory = departments.find(d => d.id === dept.extraDepartmentId)?.name;
                const extraProds = products.filter(p => p.category === extraCategory);
                
                if (extraProds.length > 0) {
                    if (dept.autoOpenExtraPopup) {
                        // Önce ürünü sepete ekle, sonra popup aç
                        let extraPriceFromVariation = 0;
                        let vName: string | undefined;
                        let vId: number | undefined;
                        if (forceVariationId && product.variations) {
                            const varItem = product.variations.find(v => v.id === forceVariationId);
                            if (varItem) {
                                vId = varItem.id;
                                vName = varItem.variationName;
                                if (varItem.fixedPrice !== null && varItem.fixedPrice !== undefined) {
                                    extraPriceFromVariation = varItem.fixedPrice - product.price;
                                }
                            }
                        }
                        const uniqueId = Date.now().toString() + Math.random().toString(36).substring(7);
                        const newItem: CartItem = { product, quantity: 1, uniqueId, variationId: vId, variationName: vName, extraPrice: extraPriceFromVariation };
                        setCart(prev => [...prev, newItem]);
                        setPendingExtraCartItem(newItem);
                        setExtraPopupProducts(extraProds);
                        setExtraPopupParentProduct(product);
                        setExtraPopupOpen(true);
                        return;
                    }
                }
            }
        }

        let extraPriceFromVariation = 0;
        let vName: string | undefined;
        let vId: number | undefined;
        if (forceVariationId && product.variations) {
            const varItem = product.variations.find(v => v.id === forceVariationId);
            if (varItem) {
                vId = varItem.id;
                vName = varItem.variationName;
                if (varItem.fixedPrice !== null && varItem.fixedPrice !== undefined) {
                    extraPriceFromVariation = varItem.fixedPrice - product.price;
                }
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id && item.variationId === vId && !item.uniqueId);
            if (existing) {
                return prev.map(item =>
                    (item.product.id === product.id && item.variationId === vId && !item.uniqueId) ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1, variationId: vId, variationName: vName, extraPrice: extraPriceFromVariation }];
        });
    };

    const removeFromCart = (itemToRemove: CartItem) => {
        setCart(prev => {
            if (itemToRemove.uniqueId) {
                return prev.filter(i => i.uniqueId !== itemToRemove.uniqueId);
            }
            const isMatch = (item: CartItem) => item.product.id === itemToRemove.product.id && item.variationId === itemToRemove.variationId && !item.uniqueId;
            return prev.filter(item => !isMatch(item));
        });
    };

    const updateQuantity = (itemToUpdate: CartItem, delta: number) => {
        setCart(prev => prev.map(item => {
            const isMatch = itemToUpdate.uniqueId
                ? item.uniqueId === itemToUpdate.uniqueId
                : item.product.id === itemToUpdate.product.id && item.variationId === itemToUpdate.variationId && !item.uniqueId;

            if (isMatch) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((sum, item) => {
            const base = (item.product.price + (item.extraPrice || 0)) * item.quantity;
            const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
            return sum + base + extras;
        }, 0);
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
                    subItems: item.subItems,
                    note: item.note,
                    variationId: item.variationId,
                    variationName: item.variationName
                }))
            };

            const res = await axios.post(`${API_URL}/sales`, saleData, { headers });

            // Prepare Print Data
            const printData = {
                companyName: 'ANTIGRAVITY POS',
                cashierName: activeShift?.user?.firstName || user?.firstName || user?.name || 'Kasiyer',
                date: new Date(),
                items: cart.map(item => ({
                    name: item.product.name + (item.variationName ? ` (${item.variationName})` : ''),
                    quantity: item.quantity,
                    price: item.product.price + (item.extraPrice || 0),
                    total: (item.product.price + (item.extraPrice || 0)) * item.quantity,
                    subItems: item.subItems,
                    note: item.note
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
                            onClick={toggleTheme}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all text-xl"
                            title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                        >
                            <i className={`fat ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-orange-500`}></i>
                        </button>
                    </div>
                </div>

                {/* Categories -> Product Types (Cins) Tabları */}
                <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide w-full">
                        {productTypeOptions.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setSelectedProductTypeId(t.id as any);
                                    setSelectedGroupName('Tümü');
                                    setSelectedCategoryName('Tümü');
                                }}
                                className={`px-5 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center ${selectedProductTypeId === t.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm'}`}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Drill-Down Navigasyon (Breadcrumb) */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none min-h-[32px]">
                        {selectedGroupName !== 'Tümü' ? (
                            <>
                                <button 
                                    onClick={() => {
                                        if (selectedCategoryName !== 'Tümü') {
                                            setSelectedCategoryName('Tümü');
                                        } else {
                                            setSelectedGroupName('Tümü');
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 shrink-0"
                                >
                                    <i className="fat fa-arrow-left"></i> Geri
                                </button>
                                <div className="flex items-center gap-1.5 p-1 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                                    <span 
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-sm flex items-center gap-1.5 ${selectedCategoryName === 'Tümü' ? 'bg-amber-500 text-white shadow-amber-500/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                                        onClick={() => setSelectedCategoryName('Tümü')}
                                    >
                                        <i className="fat fa-folder-open"></i>
                                        {selectedGroupName}
                                    </span>
                                    {selectedCategoryName !== 'Tümü' && (
                                        <>
                                            <i className="fat fa-angle-right text-slate-400 text-[10px]"></i>
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 flex items-center gap-1.5">
                                                <i className="fat fa-tags"></i>
                                                {selectedCategoryName}
                                                <button onClick={() => setSelectedCategoryName('Tümü')} className="ml-1 opacity-70 hover:opacity-100"><i className="fat fa-xmark"></i></button>
                                            </span>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                                {availableGroups.filter(g => g !== 'Tümü').length > 0 ? 'Lütfen Grup Seçin' : 'Ürünler Listeleniyor'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Drill-Down Grid (Folder Cards or Products) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 max-h-[calc(100vh-250px)]">
                    {selectedGroupName === 'Tümü' && availableGroups.filter(g => g !== 'Tümü').length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                            {availableGroups.filter(g => g !== 'Tümü').map(g => (
                                <button
                                    key={g}
                                    onClick={() => { setSelectedGroupName(g); setSelectedCategoryName('Tümü'); }}
                                    className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800/70 rounded-2xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <i className="fat fa-folder-open text-2xl text-orange-500"></i>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 text-center uppercase tracking-wider">{g}</span>
                                </button>
                            ))}
                        </div>
                    ) : selectedGroupName !== 'Tümü' && selectedCategoryName === 'Tümü' && availableCategories.filter(c => c !== 'Tümü').length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                            {availableCategories.filter(c => c !== 'Tümü').map(c => (
                                <button
                                    key={c}
                                    onClick={() => setSelectedCategoryName(c)}
                                    className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800/70 rounded-2xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <i className="fat fa-tags text-2xl text-emerald-500"></i>
                                    </div>
                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 text-center uppercase tracking-wider">{c}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-max">
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
                    )}
                </div>
            </div>

            {/* Right Side: Cart (30%) */}
            <div className="w-[450px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col transition-colors duration-300">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h4 className="font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('orderDetail') || 'Sipariş Detayı'}</h4>
                    <button onClick={() => setCart([])} className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-400 transition">{t('clearCart') || 'Temizle'}</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                    {cart.map((item, idx) => {
                        const uniqueKey = item.uniqueId || `cart-${item.product.id}-${idx}`;
                        return (
                            <div key={uniqueKey} className="group relative bg-slate-50/50 dark:bg-slate-900/40 rounded-[20px] p-3.5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md hover:border-orange-500/30 overflow-hidden">
                                {/* Header: Product Info and Actions */}
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-black text-slate-800 dark:text-white uppercase leading-tight truncate tracking-tight mb-0.5">
                                            {item.product.name}
                                            {item.extraPrice ? <span className="text-indigo-500 ml-1">(+₺{item.extraPrice})</span> : null}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-widest opacity-70">
                                            {(item.product.price + (item.extraPrice || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ 
                                            <span className="text-[8px] opacity-40">●</span>
                                            {item.quantity} ADET
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 p-0.5 shadow-sm">
                                            <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors"><i className="fat fa-minus text-[10px]"></i></button>
                                            <span className="w-7 text-center text-[11px] font-black text-slate-800 dark:text-white">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-orange-500 transition-colors"><i className="fat fa-plus text-[10px]"></i></button>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => {
                                                    setNoteModalItem(item);
                                                    setTempNote(item.note || '');
                                                }}
                                                className="w-7 h-7 flex items-center justify-center text-amber-500 hover:text-white hover:bg-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg transition-all border border-amber-200/50 dark:border-amber-500/20 shadow-sm"
                                                title="Not / Özellik Düzenle"
                                            >
                                                <i className="fat fa-pen-to-square text-[10px]"></i>
                                            </button>
                                            {(() => {
                                                const dept = departments.find(d => d.name === item.product.category);
                                                if (!dept?.extraDepartmentId || dept?.autoOpenExtraPopup) return null;
                                                const extraProds = products.filter(p => p.category === departments.find(d => d.id === dept.extraDepartmentId)?.name);
                                                if (extraProds.length === 0) return null;
                                                return (
                                                    <button
                                                        onClick={() => {
                                                            setPendingExtraCartItem(item);
                                                            setExtraPopupProducts(extraProds);
                                                            setExtraPopupParentProduct(item.product);
                                                            setExtraPopupOpen(true);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center text-indigo-500 hover:text-white hover:bg-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg transition-all border border-indigo-200/50 dark:border-indigo-500/20 shadow-sm"
                                                        title="Ekstra Ürün Ekle"
                                                    >
                                                        <i className="fat fa-plus-circle text-[10px]"></i>
                                                    </button>
                                                );
                                            })()}
                                            <button onClick={() => removeFromCart(item)} className="w-7 h-7 flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-lg transition-all border border-rose-200/50 dark:border-rose-500/20 shadow-sm"><i className="fat fa-trash-can text-[10px]"></i></button>
                                        </div>
                                    </div>
                                </div>

                                {/* Body: Notes and SubItems */}
                                {(item.note || (item.subItems && item.subItems.length > 0)) && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/40 space-y-1.5">
                                        {item.note && (
                                            <div className="flex items-start gap-2 bg-amber-500/5 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-500/10 dark:border-amber-500/20">
                                                <i className="fat fa-sticky-note text-amber-500 text-[9px] mt-0.5 shrink-0"></i>
                                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 italic leading-snug">* {item.note}</span>
                                            </div>
                                        )}
                                        {item.subItems && item.subItems.length > 0 && (
                                            <div className="grid grid-cols-1 gap-1 pl-1">
                                                {item.subItems.map((sub: any, sIdx: number) => (
                                                    <div key={sIdx} className={`text-[10px] font-black flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${sub.isExtra ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/30 dark:border-slate-700/30 text-slate-500 dark:text-slate-400'}`}>
                                                        <i className={`fat ${sub.isExtra ? 'fa-square-plus' : 'fa-caret-right'} text-[8px] opacity-70`}></i>
                                                        <span className="truncate flex-1 tracking-tight">{sub.product?.name || sub.name || `Ürün #${sub.productId}`}</span>
                                                        {sub.unitPrice > 0 && <span className="font-black text-slate-800 dark:text-indigo-300">₺{sub.unitPrice}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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


            {isVariationModalOpen && selectedProductForVariation && (
                <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <i className="fat fa-ruler text-white text-lg"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedProductForVariation.name}</h3>
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Boyut / Porsiyon Seç</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsVariationModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 dark:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-600 transition-all text-sm font-bold">&times;</button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {selectedProductForVariation.variations?.filter(v => v.isActive !== false).map((v: any) => (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            setIsVariationModalOpen(false);
                                            addToCart(selectedProductForVariation, pendingAddToCartArgs.skipExtraCheck, v.id);
                                        }}
                                        className="p-4 flex flex-col justify-between rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 active:scale-95 transition-all"
                                    >
                                        <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight mb-2">{v.variationName}</span>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full mt-auto self-start">
                                            {v.fixedPrice !== null && v.fixedPrice !== undefined ? `₺${v.fixedPrice}` : `₺${selectedProductForVariation.price} (Baz)`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ekstra Ürün Popup Modal */}
            {/* Note & Modifier Selection Modal (TakeOrderView stili) */}
            {noteModalItem && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">Özellik Ekle</h3>
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg inline-block mt-2">
                                        {noteModalItem?.product?.name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setNoteModalItem(null)}
                                    className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/20 transition-colors flex items-center justify-center border border-emerald-500/20"
                                >
                                    <i className="fat fa-xmark text-xl"></i>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="mb-6 space-y-4">
                                <div>
                                    {(!noteModalItem?.product?.modifiers || noteModalItem.product.modifiers.length === 0) ? (
                                        <div className="text-xs text-slate-400 font-bold italic py-2">Bu ürün için tanımlı hızlı özellik bulunmamaktadır.</div>
                                    ) : (
                                        <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {Object.entries(
                                                (noteModalItem?.product?.modifiers || []).reduce((acc: any, mod: Modifier) => {
                                                    const group = mod.groupName || 'Diğer Özellikler';
                                                    if (!acc[group]) acc[group] = [];
                                                    acc[group].push(mod);
                                                    return acc;
                                                }, {} as Record<string, Modifier[]>)
                                            ).map(([groupName, mods]) => (
                                                <div key={groupName} className="bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                                        <i className="fat fa-layer-group text-slate-300 dark:text-slate-600"></i> {groupName}
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(mods as Modifier[]).map((mod: Modifier) => (
                                                            <button
                                                                key={mod.id}
                                                                onClick={() => {
                                                                    const currentNotes = tempNote.split(',').map(n => n.trim()).filter(n => n);
                                                                    if (currentNotes.includes(mod.name)) {
                                                                        setTempNote(currentNotes.filter(n => n !== mod.name).join(', '));
                                                                    } else {
                                                                        setTempNote([...currentNotes, mod.name].join(', '));
                                                                    }
                                                                }}
                                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${tempNote.split(',').map(n => n.trim()).includes(mod.name) ? 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-500/50' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-200 dark:hover:border-amber-500/30'}`}
                                                            >
                                                                {mod.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-1">Özel Not</label>
                                    <textarea
                                        value={tempNote}
                                        onChange={(e) => setTempNote(e.target.value)}
                                        placeholder="Ekstra isteklerinizi yazın..."
                                        className="w-full bg-slate-50 dark:bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none h-24 text-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setTempNote('')}
                                    className="w-1/3 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                                >
                                    Temizle
                                </button>
                                <button
                                    onClick={handleSaveNote}
                                    className="w-2/3 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-teal-500/40 transition hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <i className="fat fa-check"></i> Kaydet ve Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {extraPopupOpen && extraPopupParentProduct && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                        <i className="fat fa-plus-circle text-white text-lg"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{extraPopupParentProduct.name}</h3>
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Ekstra Ürün Seç</p>
                                    </div>
                                </div>
                                <button onClick={handleExtraClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 dark:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-600 transition-all text-sm font-bold">&times;</button>
                            </div>
                        </div>

                        {/* Mevcut Ekstralar */}
                        <div className="px-6 pt-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seçili Ekstralar</p>
                            <div className="flex flex-wrap gap-2 mb-1 min-h-[40px]">
                                {(cart.find(c => (c.uniqueId && pendingExtraCartItem?.uniqueId) ? c.uniqueId === pendingExtraCartItem.uniqueId : (c.product.id === pendingExtraCartItem?.product.id && !c.uniqueId))?.subItems || []).filter((s: any) => s.isExtra).map((sub: any, i: number) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-full text-xs font-bold text-amber-700 dark:text-amber-400">
                                        <i className="fat fa-plus text-[10px]"></i>
                                        {sub.product?.name || `Ürün #${sub.productId}`}
                                        <span className="opacity-60 ml-0.5">₺{sub.unitPrice}</span>
                                    </span>
                                ))}
                                {(!pendingExtraCartItem?.subItems || pendingExtraCartItem.subItems.filter((s: any) => s.isExtra).length === 0) && (
                                    <span className="text-[11px] text-slate-400 italic">Henüz ekstra seçilmedi...</span>
                                )}
                            </div>
                        </div>

                        {/* Ürün Grid */}
                        <div className="p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Eklenebilecek Ekstralar</p>
                            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                {extraPopupProducts.map(ep => {
                                    const currentCartItem = cart.find(c => (c.uniqueId && pendingExtraCartItem?.uniqueId) ? c.uniqueId === pendingExtraCartItem.uniqueId : (c.product.id === pendingExtraCartItem?.product.id && !c.uniqueId));
                                    const alreadyAdded = currentCartItem?.subItems?.some((s: any) => s.productId === ep.id && s.isExtra);
                                    return (
                                        <button
                                            key={ep.id}
                                            onClick={() => handleExtraSelect(ep)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${alreadyAdded
                                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/50'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-500/5'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{ep.name}</span>
                                                {alreadyAdded && <i className="fat fa-check-circle text-amber-500 shrink-0"></i>}
                                            </div>
                                            <span className="inline-flex items-center mt-2 gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">
                                                <i className="fat fa-plus text-[9px]"></i>₺{ep.price}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={handleExtraClose}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:scale-[1.01] active:scale-95 transition-all"
                            >
                                Tamamla
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
