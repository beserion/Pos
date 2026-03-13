'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { showSwal, toastSwal } from '../utils/swal';
import { useLocale, useTranslations } from 'next-intl';
import Cookies from 'js-cookie';

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
    imageUrl?: string;
    printerId?: number;
    modifiers?: Modifier[];
}
interface OrderItem { product: Product; quantity: number; note?: string; }
interface ExistingOrder {
    id: number;
    totalAmount: number;
    items: { id: number; product: { id: number; name: string; price: number }; quantity: number; unitPrice: number; isPaid: boolean; }[];
}
interface Zone { id: number; name: string; }
interface Table { id: number; name: string; status: string; waiterName?: string; orderStartTime?: string; currentTotal?: number; zone: { id: number } }

export default function TakeOrderView({ onSwitchToPos }: { onSwitchToPos: () => void }) {
    const { user, loginPinOnly, logout, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');

    const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
    const [products, setProducts] = useState<Product[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedZone, setSelectedZone] = useState<number | null>(null);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [searchQuery, setSearchQuery] = useState('');
    const [dataLoading, setDataLoading] = useState(true);

    const [waiters, setWaiters] = useState<any[]>([]);
    const [pinWaiter, setPinWaiter] = useState<any | null>(null);
    const [pinCode, setPinCode] = useState('');
    const [isPinRequired, setIsPinRequired] = useState(true);

    const [noteModalItem, setNoteModalItem] = useState<OrderItem | null>(null);
    const [tempNote, setTempNote] = useState('');

    const API_URL = 'http://localhost:3050';

    const fetchData = async () => {
        try {
            const token = Cookies.get('token') || (user as any)?.token;
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
        }
    }, [user, loading, router]);

    const handlePinSubmit = async (val: string) => {
        try {
            const loggedInUser = await loginPinOnly(val);
            if (loggedInUser) {
                setPinWaiter(loggedInUser);
                setIsPinRequired(false);
                setPinCode('');
                toastSwal({ icon: 'success', title: `${tc('success')}, ${loggedInUser.firstName}` });
            } else {
                setPinCode('');
                showSwal({ icon: 'error', title: t('invalidPin') || 'Hatalı PIN', text: t('invalidPinDesc') || 'Lütfen tekrar deneyin.' });
            }
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

    const categories = ['Tümü', ...Array.from(new Set(products.map(p => p.category)))];

    const handleTableClick = async (table: Table) => {
        setSelectedTable(table);
        setActiveTab('menu');
        setCart([]);

        if (table.status === 'DOLU' || table.status === 'REZERVE' || table.currentTotal) {
            try {
                const token = localStorage.getItem('token') || (user as any)?.token;
                const res = await fetch(`${API_URL}/orders/table/${table.id}/active`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setExistingOrders(data);
                } else {
                    setExistingOrders([]);
                }
            } catch (err) {
                console.error("Failed to fetch existing orders", err);
                setExistingOrders([]);
            }
        } else {
            setExistingOrders([]);
        }
    };

    const addToCart = (product: Product, note?: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id && item.note === note);
            if (existing) {
                return prev.map(item => (item.product.id === product.id && item.note === note) ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1, note }];
        });
    };

    const removeFromCart = (itemToRemove: OrderItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === itemToRemove.product.id && item.note === itemToRemove.note);
            if (existing && existing.quantity === 1) return prev.filter(i => !(i.product.id === itemToRemove.product.id && i.note === itemToRemove.note));
            return prev.map(item => (item.product.id === itemToRemove.product.id && item.note === itemToRemove.note) ? { ...item, quantity: item.quantity - 1 } : item);
        });
    };

    const removeEntireItem = (itemToRemove: OrderItem) => {
        setCart(prev => prev.filter(i => !(i.product.id === itemToRemove.product.id && i.note === itemToRemove.note)));
    };

    const handleSaveNote = () => {
        if (!noteModalItem) return;

        // Remove the old item
        const updatedCart = cart.filter(i => !(i.product.id === noteModalItem.product.id && i.note === noteModalItem.note));

        // Add it back with the new note
        const existingWithNewNote = updatedCart.find(i => i.product.id === noteModalItem.product.id && i.note === tempNote.trim());
        if (existingWithNewNote) {
            existingWithNewNote.quantity += noteModalItem.quantity;
            setCart([...updatedCart]);
        } else {
            setCart([...updatedCart, { ...noteModalItem, note: tempNote.trim() || undefined }]);
        }
        setNoteModalItem(null);
    };

    const sendOrder = async () => {
        if (!selectedTable || cart.length === 0) return;
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const orderPayload = {
                table: { id: selectedTable.id },
                waiter: { id: pinWaiter?.id || user?.id },
                totalAmount: cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
                status: 'NEW',
                items: cart.map(item => ({
                    product: { id: item.product.id },
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                    note: item.note
                }))
            };

            const orderRes = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(orderPayload)
            });

            if (!orderRes.ok) {
                throw new Error("Failed to send order");
            }

            const orderData = await orderRes.json();

            // Trigger kitchen printing for items that have a printer assigned
            const kitchenItems = cart.filter(item => item.product.printerId);
            if (kitchenItems.length > 0) {
                const kitchenPrintData = {
                    orderType: 'MASA SİPARİŞİ',
                    receiptNumber: `SİP-${orderData?.id || '00'}`,
                    date: new Date(),
                    items: kitchenItems.map(item => ({
                        name: item.product.name,
                        quantity: item.quantity,
                        printerId: item.product.printerId
                    }))
                };

                try {
                    await fetch(`${API_URL}/printers/print-kitchen`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(kitchenPrintData)
                    });
                } catch (printErr: any) {
                    console.error('Mutfak yazıcı hatası:', printErr);
                }
            }

            toastSwal({
                icon: 'success',
                title: `${selectedTable.name} Siparişi İşleme Alındı!`
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
            console.error(error);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'Tümü' || p.category === selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
    const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const allExistingItems = existingOrders.flatMap(o => o.items);
    const paidItems = allExistingItems.filter(i => i.isPaid);
    const unpaidItems = allExistingItems.filter(i => !i.isPaid);
    const paidTotal = paidItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const remainingTotal = unpaidItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) + cartTotal;

    const payItem = async (itemId: number) => {
        const token = localStorage.getItem('token') || (user as any)?.token;

        // Fetch partners first
        let partners: any[] = [];
        try {
            const pRes = await fetch(`${API_URL}/partners`, { headers: { Authorization: `Bearer ${token}` } });
            if (pRes.ok) partners = await pRes.json();
        } catch (e) { console.error("Partners fetch failed", e); }

        const customerOptions = partners
            .filter(p => p.type === 'CUSTOMER')
            .reduce((acc, p) => ({ ...acc, [p.id]: p.name }), { '0': '-- Cari Seçilmedi --' });

        // Ask payment method and partner
        const Swal = (await import('sweetalert2')).default;
        const { value: formValues } = await Swal.fire({
            title: 'Ödeme Detayları',
            html:
                '<label class="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest text-left">Ödeme Yöntemi</label>' +
                '<select id="swal-payment-method" class="swal2-input !mt-0 !mb-4 !w-full">' +
                '<option value="KASA">Nakit (Kasa)</option>' +
                '<option value="KREDI_KARTI">Kredi Kartı</option>' +
                '<option value="BANKA">Banka</option>' +
                '</select>' +
                '<label class="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest text-left">İlgili Cari (Müşteri)</label>' +
                '<select id="swal-partner-id" class="swal2-input !mt-0 !w-full">' +
                Object.entries(customerOptions).map(([id, name]) => `<option value="${id}">${name}</option>`).join('') +
                '</select>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Ödendi İşaretle',
            cancelButtonText: 'İptal',
            preConfirm: () => {
                return {
                    paymentMethod: (document.getElementById('swal-payment-method') as HTMLSelectElement).value,
                    partnerId: (document.getElementById('swal-partner-id') as HTMLSelectElement).value
                };
            }
        });

        if (!formValues) return;
        const { paymentMethod, partnerId } = formValues;

        try {
            const res = await fetch(`${API_URL}/orders/items/${itemId}/pay`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod,
                    partnerId: partnerId === '0' ? undefined : parseInt(partnerId)
                }),
            });
            if (!res.ok) throw new Error('Pay failed');
            await handleTableClick(selectedTable!);
        } catch (err) {
            showSwal({ icon: 'error', title: 'Hata', text: 'Ödeme işaretlenemedi.' });
        }
    };

    if (loading || !user) return null;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-800 font-sans overflow-hidden transition-colors duration-300 relative">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-teal-500/10 dark:bg-teal-600/10 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>

            <div className="flex-1 flex flex-col p-6 overflow-y-auto w-full md:w-auto relative z-10 transition-all">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">POS PC (Masa)</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Sipariş eklemek istediğiniz masayı ve ürünleri seçin.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'menu' && (
                            <button
                                onClick={() => {
                                    setActiveTab('tables');
                                    setSelectedTable(null);
                                }}
                                className="text-slate-500 hover:text-emerald-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm">
                                <i className="fat fa-reply"></i> Masalara Dön
                            </button>
                        )}

                        <button
                            onClick={onSwitchToPos}
                            className="text-emerald-500 hover:text-emerald-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm">
                            <i className="fat fa-reply"></i> Geri Dön (POS)
                        </button>

                        <button
                            onClick={() => {
                                setIsPinRequired(true);
                                setPinWaiter(null);
                            }}
                            className="text-slate-500 hover:text-emerald-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm">
                            <i className="fat fa-reply"></i> Çıkış
                        </button>

                    </div>
                </div>

                {activeTab === 'tables' ? (
                    <>
                        {/* Zone Seçimi */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                            {Array.isArray(zones) && zones.map(z => (
                                <button
                                    key={z.id}
                                    onClick={() => setSelectedZone(z.id)}
                                    className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${selectedZone === z.id ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                                >
                                    {z.name}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.isArray(tables) && tables.filter(t => t.zone?.id === selectedZone).map(table => (
                                <div
                                    key={table.id}
                                    onClick={() => handleTableClick(table)}
                                    className={`relative p-6 rounded-[32px] cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border flex flex-col items-center justify-center text-center gap-2 group ${selectedTable?.id === table.id ? 'ring-4 ring-emerald-500 scale-105 ' : ''}${table.status === 'BOŞ' ? 'bg-white/60 dark:bg-slate-800/60 border-white dark:border-slate-700' :
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
                                                <span>{table.waiterName || 'POS / Garson'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                <span className="opacity-70">🕒</span>
                                                <span>{formatTime(table.orderStartTime)}</span>
                                            </div>
                                            <div className="mt-2 text-rose-700 dark:text-rose-300 font-extrabold text-sm drop-shadow-sm">
                                                ₺{(Number(table.currentTotal || 0) * 1.1).toFixed(2)}
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
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="mb-4">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700 mb-4 inline-block">
                                {selectedTable?.name} Seçiliyor
                            </h2>

                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fat fa-magnifying-glass text-slate-400"></i>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ürün Ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                        <i className="fat fa-circle-xmark"></i>
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {categories.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedCategory(c)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm border ${selectedCategory === c ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                            {filteredProducts.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => addToCart(p)}
                                    className="relative h-40 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden active:scale-95 transition-all group"
                                >
                                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl mb-1 opacity-50 transition-opacity">
                                                {p.category === 'Kahveler' ? '☕' : p.category === 'Tatlılar' ? '🍰' : '🍹'}
                                            </span>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col items-center text-center justify-end z-10">
                                        <span className="font-bold text-white text-xs leading-tight mb-0.5 drop-shadow-md line-clamp-2">{p.name}</span>
                                        <span className="font-extrabold text-white bg-emerald-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] shadow-sm mt-1 border border-emerald-400/30">₺{p.price}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sağ Pane - Adisyon (Cart) */}
            {activeTab === 'menu' && (
                <div className="w-[450px] min-w-[450px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-l border-white/50 dark:border-slate-700/50 flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20 transition-colors">
                    <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                            Sipariş Özeti
                            {selectedTable && (
                                <span className="bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 py-1.5 px-4 rounded-full text-sm font-bold shadow-inner">{selectedTable.name}</span>
                            )}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {existingOrders.map(order =>
                            order.items.map((item, idx) => (
                                <div key={`ex-${order.id}-${idx}`} className={`flex flex-col gap-2 p-3 rounded-2xl border shadow-sm transition-all ${item.isPaid ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-500/20 opacity-70' : 'bg-slate-100/50 dark:bg-slate-700/30 border-slate-200/50 dark:border-slate-700/50'}`}>
                                    <div className="flex justify-between items-start">
                                        <span className="block font-medium text-slate-600 dark:text-slate-400">
                                            {item.product.name}
                                            {item.isPaid ? (
                                                <span className="text-[10px] ml-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 inline-flex items-center gap-1">
                                                    <i className="fat fa-check text-[8px]"></i> Ödendi
                                                </span>
                                            ) : (
                                                <span className="text-[10px] ml-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">Bekliyor</span>
                                            )}
                                        </span>
                                        <span className={`font-bold ${item.isPaid ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                                            ₺{(item.quantity * item.unitPrice).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs font-bold text-slate-400">Birim: ₺{item.unitPrice} &nbsp;·&nbsp; {item.quantity} Adet</span>
                                        {!item.isPaid && (
                                            <button
                                                onClick={() => payItem(item.id)}
                                                className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1 rounded-full transition-all flex items-center gap-1"
                                            >
                                                <i className="fat fa-circle-check text-[10px]"></i> Ödendi İşaretle
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {cart.length === 0 && existingOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                <p>Henüz ürün eklenmedi</p>
                            </div>
                        ) : (
                            cart.map((item, index) => (
                                <div key={`new-${index}`} className="flex flex-col gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <span className="block font-medium text-slate-800 dark:text-slate-200">
                                            {item.product.name}
                                            {existingOrders.length > 0 && <span className="text-[10px] ml-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full animate-pulse border border-teal-200 inline-block">Yeni Eklendi</span>}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-100">₺{(item.quantity * item.product.price).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                            <span className="text-xs font-bold text-slate-400">Birim: ₺{item.product.price}</span>
                                            {item.note && (
                                                <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-md truncate font-bold" title={item.note}>
                                                    Not: {item.note}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setNoteModalItem(item);
                                                    setTempNote(item.note || '');
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-md transition-colors" title="Not / Özellik Ekle"
                                            >
                                                <i className="fat fa-pen-to-square"></i>
                                            </button>
                                            <button onClick={() => removeEntireItem(item)} className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-md transition-colors" title="Ürünü İptal Et">
                                                <i className="fat fa-trash"></i>
                                            </button>
                                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1">
                                                <button onClick={() => removeFromCart(item)} className="w-7 h-7 flex items-center justify-center text-red-500 font-bold hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">-</button>
                                                <span className="font-bold text-sm min-w-[1rem] text-center dark:text-white">{item.quantity}</span>
                                                <button onClick={() => addToCart(item.product, item.note)} className="w-7 h-7 flex items-center justify-center text-emerald-500 font-bold hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-xl border-t border-white/50 dark:border-slate-700/50 m-4 rounded-3xl transition-colors shadow-inner">
                        {/* Paid vs Remaining totals */}
                        {existingOrders.length > 0 && (
                            <div className="mb-3 space-y-2">
                                {paidTotal > 0 && (
                                    <div className="flex justify-between items-center py-1.5 px-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                            <i className="fat fa-check-circle"></i> Ödenen
                                        </span>
                                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">₺{paidTotal.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                        <i className="fat fa-clock"></i> Kalan (Ödenmemiş)
                                    </span>
                                    <span className="text-sm font-black text-amber-700 dark:text-amber-400">₺{remainingTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between mb-4">
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{existingOrders.length > 0 ? 'Yeni Eklenecek' : 'Toplam Tutar'}</span>
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">₺{cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => setCart([])}
                                disabled={cart.length === 0}
                                className="w-1/3 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={sendOrder}
                                disabled={cart.length === 0}
                                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                <i className="fat fa-paper-plane"></i> Mutfağa İlet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Entry Overlay */}
            {isPinRequired && (
                <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl p-8 flex flex-col items-center relative overflow-hidden">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">🔐</span>
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Garson Girişi</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 text-center px-4">Lütfen işleme devam etmek için 4 haneli PIN kodunuzu girin.</p>

                        <div className="flex gap-4 mb-10">
                            {[0, 1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full border-2 border-emerald-400 transition-all duration-300 ${pinCode.length > i ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' : 'bg-transparent'}`}
                                />
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                                <button
                                    key={n}
                                    onClick={() => handlePinClick(n)}
                                    className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-2xl font-black text-slate-800 dark:text-white transition-all active:scale-90 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-md"
                                >
                                    {n}
                                </button>
                            ))}
                            <div />
                            <button
                                onClick={() => handlePinClick('0')}
                                className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-2xl font-black text-slate-800 dark:text-white transition-all active:scale-90 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 shadow-sm hover:shadow-md"
                            >
                                0
                            </button>
                            <button
                                onClick={() => setPinCode('')}
                                className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors bg-slate-50/50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 012.828 0L21 16.414A2 2 0 0119.586 21H7.414a2 2 0 01-1.414-.586L3 12z" />
                                </svg>
                            </button>
                        </div>

                        <button
                            onClick={onSwitchToPos}
                            className="mt-10 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-colors py-2 px-4 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                        >
                            <i className="fat fa-reply"></i> İptal - POS'a Dön
                        </button>
                    </div>
                </div>
            )}

            {/* Note & Modifier Modal */}
            {noteModalItem && (
                <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">Özellik Ekle</h3>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg inline-block mt-2">
                                    {noteModalItem.product.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setNoteModalItem(null)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 transition-colors flex items-center justify-center"
                            >
                                <i className="fat fa-xmark text-xl"></i>
                            </button>
                        </div>

                        <div className="mb-6 space-y-4">
                            <div>
                                {(!noteModalItem.product.modifiers || noteModalItem.product.modifiers.length === 0) ? (
                                    <div className="text-xs text-slate-400 font-bold italic py-2">Bu ürün için tanımlı hızlı özellik bulunmamaktadır.</div>
                                ) : (
                                    <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(
                                            noteModalItem.product.modifiers.reduce((acc, mod) => {
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
                                                    {mods.map(mod => (
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
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Özel Not</label>
                                <textarea
                                    value={tempNote}
                                    onChange={(e) => setTempNote(e.target.value)}
                                    placeholder="Ekstra isteklerinizi yazın..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-amber-500/50 outline-none transition-all resize-none h-24 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setTempNote('')}
                                className="w-1/3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={handleSaveNote}
                                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-amber-500/30 hover:shadow-orange-500/40 transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i className="fat fa-check"></i> Kaydet ve Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
