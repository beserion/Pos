'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useLocale, useTranslations } from 'next-intl';
import { showSwal, toastSwal } from '../../utils/swal';

interface Product {
    id: number;
    name: string;
    sku: string;
    costPrice: number;
    unit: string;
    currentStock?: number;
    minStockLevel?: number;
}

interface Supplier {
    id: number;
    name: string;
}

interface PurchaseOrderItem {
    id?: number;
    productId: number;
    productName?: string;
    product?: { name: string };
    quantity: number;
    unitPrice: number;
    unit: string;
}

interface PurchaseOrder {
    id: number;
    supplierId: number;
    supplier?: Supplier;
    status: string;
    totalAmount: number;
    note: string;
    items: PurchaseOrderItem[];
    createdAt: string;
    invoiceNumber?: string;
}

interface LowStockItem {
    productId: number;
    productName: string;
    currentStock: number;
    minStockLevel: number;
    costPrice: number;
    unit: string;
}

export function PageClient() {
    const { user, loading, hasPermission } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

    const [activeTab, setActiveTab] = useState<'LIST' | 'LOW_STOCK'>('LIST');
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [lowStocks, setLowStocks] = useState<LowStockItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    // Pagination & Filters
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal State
    const [isUpsertOpen, setIsUpsertOpen] = useState(false);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

    // Filter for Product Picker
    const [pickerSearch, setPickerSearch] = useState('');

    // Form States
    const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
        supplierId: 0,
        note: '',
        status: 'DRAFT',
        items: []
    });

    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        invoiceAmount: 0,
        paymentMethod: 'KASA',
        paymentStatus: 'PAID'
    });

    const fetchData = useCallback(async (page = 1) => {
        setDataLoading(true);
        try {
            const token = Cookies.get('token') || localStorage.getItem('token');
            const headers = { Authorization: 'Bearer ' + token };

            const params: any = { page, limit: 12 };
            if (searchTerm) params.search = searchTerm;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const [ordersRes, lowStockRes, suppliersRes, productsRes] = await Promise.all([
                axios.get(`${API_URL}/purchase-orders`, { headers, params }).catch(err => { console.error('Orders API Fail:', err); return { data: { data: [], total: 0 } }; }),
                axios.get(`${API_URL}/stocks/low-stock`, { headers }).catch(err => { console.error('LowStock API Fail:', err); return { data: [] }; }),
                axios.get(`${API_URL}/partners?type=SUPPLIER&limit=500`, { headers }).catch(err => { console.error('Suppliers API Fail:', err); return { data: { data: [] } }; }),
                axios.get(`${API_URL}/products`, { headers }).catch(err => { console.error('Products API Fail:', err); return { data: [] }; })
            ]);

            // Handling variations in API response structures (Array vs Object with data property)
            const ordersData = ordersRes?.data?.data || (Array.isArray(ordersRes?.data) ? ordersRes.data : []);
            setOrders(ordersData);
            setTotalOrders(ordersRes?.data?.total || ordersData.length || 0);
            setLastPage(ordersRes?.data?.lastPage || 1);
            setCurrentPage(ordersRes?.data?.page || 1);

            const lowStockData = lowStockRes?.data || [];
            setLowStocks(lowStockData);
            
            const supplierList = suppliersRes?.data?.data || (Array.isArray(suppliersRes?.data) ? suppliersRes.data : []);
            setSuppliers(supplierList);

            // Merge stock info into products for the picker modal
            const rawProducts = Array.isArray(productsRes?.data) ? productsRes.data : (productsRes?.data?.data || []);
            const enrichedProducts = rawProducts.map((p: any) => {
                const lowInfo = lowStockData.find((ls: any) => ls.productId === p.id);
                return {
                    ...p,
                    currentStock: lowInfo ? lowInfo.currentStock : (p.currentStock || 0),
                    minStockLevel: lowInfo ? lowInfo.minStockLevel : (p.minStockLevel || 0)
                };
            });
            setProducts(enrichedProducts);

            console.log('Fetch DB Trace:', { orders: ordersData.length, suppliers: supplierList.length, products: enrichedProducts.length });
        } catch (e: any) {
            console.error('Fetch Error Detail:', e);
            toastSwal({ icon: 'error', title: 'Veri yükleme hatası oluştu.' });
        } finally {
            setDataLoading(false);
        }
    }, [searchTerm, startDate, endDate]);

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${locale}/login`);
        } else if (!loading && user && !hasPermission('ORDERS:VIEW')) {
            router.push(`/${locale}/dashboard`);
        } else if (user) {
            fetchData(1);
        }
    }, [user, loading, router, fetchData, locale, hasPermission]);

    const handleOpenUpsert = (order: PurchaseOrder | null = null) => {
        if (order) {
            setFormData({
                id: order.id,
                supplierId: order.supplierId,
                note: order.note,
                status: order.status,
                items: order.items.map(i => ({ 
                    ...i, 
                    productName: i.productName || i.product?.name || '---' 
                }))
            });
        } else {
            setFormData({
                supplierId: 0,
                note: '',
                status: 'DRAFT',
                items: []
            });
        }
        setIsUpsertOpen(true);
    };

    const handleAddProductToOrder = (prod: Product) => {
        const existing = formData.items?.find(i => i.productId === prod.id);
        if (existing) {
            setFormData({
                ...formData,
                items: formData.items?.map(i => i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
            });
        } else {
            setFormData({
                ...formData,
                items: [...(formData.items || []), {
                    productId: prod.id,
                    productName: prod.name,
                    quantity: 1,
                    unitPrice: prod.costPrice || 0,
                    unit: prod.unit || 'adet'
                }]
            });
        }
        toastSwal({ icon: 'success', title: `${prod.name} siparişe eklendi.` });
    };

    const handleRemoveProductFromOrder = (idx: number) => {
        setFormData({
            ...formData,
            items: formData.items?.filter((_, i) => i !== idx)
        });
    };

    const handleItemChange = (idx: number, field: string, value: any) => {
        setFormData({
            ...formData,
            items: formData.items?.map((item, i) => i === idx ? { ...item, [field]: value } : item)
        });
    };

    const calculateTotal = () => {
        return formData.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
    };

    const saveOrder = async () => {
        if (!formData.supplierId) return toastSwal({ icon: 'warning', title: 'Lütfen tedarikçi seçiniz.' });
        if (!formData.items || formData.items.length === 0) return toastSwal({ icon: 'warning', title: 'Lütfen en az bir ürün ekleyiniz.' });

        try {
            const token = Cookies.get('token');
            const total = calculateTotal();
            const payload = { ...formData, totalAmount: total };

            if (formData.id) {
                await axios.put(`${API_URL}/purchase-orders/${formData.id}/status`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/purchase-orders`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            toastSwal({ icon: 'success', title: 'Sipariş başarıyla kaydedildi.' });
            setIsUpsertOpen(false);
            fetchData(currentPage);
        } catch (e: any) {
            showSwal({ icon: 'error', title: 'Hata', text: e.response?.data?.message || 'İşlem başarısız.' });
        }
    };

    const deleteOrder = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: 'Bu siparişi silmek istediğinize emin misiniz?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'İptal'
        });

        if (result.isConfirmed) {
            try {
                const token = Cookies.get('token');
                await axios.delete(`${API_URL}/purchase-orders/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSwal({ icon: 'success', title: 'Sipariş silindi.' });
                fetchData(currentPage);
            } catch (e: any) {
                showSwal({ icon: 'error', title: 'Hata', text: e.response?.data?.message || 'Silinemedi.' });
            }
        }
    };

    const autoGenerateOrder = async () => {
        if (lowStocks.length === 0) return toastSwal({ icon: 'info', title: 'Eksik ürün bulunamadı.' });

        const result = await showSwal({
            title: 'Otomatik Sipariş',
            text: 'Tüm eksik ve tükenen ürünler için taslak sipariş oluşturulsun mu?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Evet, Oluştur',
            cancelButtonText: 'Vazgeç'
        });

        if (result.isConfirmed) {
            try {
                const token = Cookies.get('token');
                await axios.post(`${API_URL}/purchase-orders/auto-generate`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSwal({ icon: 'success', title: 'Sipariş taslağı oluşturuldu.' });
                setActiveTab('LIST');
                fetchData(1);
            } catch (e: any) {
                showSwal({ icon: 'error', title: 'Hata', text: e.response?.data?.message || 'Hata oluştu.' });
            }
        }
    };

    const openInvoiceModal = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setInvoiceForm({
            invoiceNumber: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceAmount: Number(order.totalAmount),
            paymentMethod: 'KASA',
            paymentStatus: 'PAID'
        });
        setIsInvoiceOpen(true);
    };

    const handleSaveInvoice = async () => {
        if (!selectedOrder) return;
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/purchase-orders/${selectedOrder.id}/receive-invoice`, invoiceForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toastSwal({ icon: 'success', title: 'Sipariş teslim alındı ve stoklar güncellendi.' });
            setIsInvoiceOpen(false);
            fetchData(currentPage);
        } catch (e: any) {
            showSwal({ icon: 'error', title: 'Hata', text: e.response?.data?.message || 'İşlem başarısız.' });
        }
    };

    const filteredPickerProducts = useMemo(() => {
        return products
            .filter(p =>
                p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                p.sku?.toLowerCase().includes(pickerSearch.toLowerCase())
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }, [products, pickerSearch]);

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-300">
            {/* Minimal Background Pattern */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/[0.03] blur-[80px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 w-full px-6 md:px-12 py-8">
                {/* Minimal Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center shadow-sm">
                            <i className="fat fa-truck-ramp-box text-3xl"></i>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tight text-amber-500 leading-none">SATIN ALMA YÖNETİMİ</h3>
                            <h5 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mt-1.5">Tedarikçi siparişleri ve stok ikmali</h5>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => handleOpenUpsert()} className="px-8 py-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Sipariş Oluştur
                        </button>
                        <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                            <i className="fat fa-home text-lg"></i> ANA MENU
                        </button>
                    </div>
                </div>

                {/* Tabs, Search & Filters Bar - Perfectly Centered Layout */}
                <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
                    {/* section 1: Left - Tabs */}
                    <div className="flex lg:w-1/4 items-center justify-start shrink-0">
                        <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl">
                            <button onClick={() => setActiveTab('LIST')} className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'LIST' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Tüm Siparişler</button>
                            <button onClick={() => setActiveTab('LOW_STOCK')} className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOW_STOCK' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Kritik Stoklar
                                {lowStocks.length > 0 && <span className="ml-2 bg-black/10 px-1.5 py-0.5 rounded text-[9px]">{lowStocks.length}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Center - Search (Taking flexible center) */}
                    <div className="flex-1 max-w-xl flex justify-center px-4">
                        <div className="relative w-full max-w-[450px]">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Sipariş, Tedarikçi veya Not Ara..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-amber-500/20 transition-all placeholder:text-slate-300 shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Section 3: Right - Date Filters */}
                    <div className="lg:w-1/4 flex items-center justify-end gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-xl px-2 border border-slate-100 dark:border-slate-700">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-500 p-2 outline-none cursor-pointer" />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-500 p-2 outline-none cursor-pointer" />
                        </div>
                        <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }} className="w-10 h-10 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-xl hover:text-rose-500 transition-all flex items-center justify-center shrink-0 shadow-sm active:scale-95" title="Filtreleri Temizle">
                            <i className="fat fa-filter-circle-xmark text-lg"></i>
                        </button>
                    </div>
                </div>

                {activeTab === 'LIST' ? (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden h-[calc(100vh-240px)] flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş No</th>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tedarikçi</th>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                                        <th className="px-6 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {dataLoading ? (
                                        <tr><td colSpan={6} className="py-20 text-center text-slate-400 text-[10px] font-black uppercase animate-pulse">Veriler yükleniyor...</td></tr>
                                    ) : orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-24 text-center">
                                                <div className="flex flex-col items-center justify-center opacity-20 dark:opacity-40">
                                                    <i className="fat fa-folder-open text-7xl mb-4 text-slate-300 dark:text-slate-500"></i>
                                                    <p className="text-xl font-black uppercase tracking-tight text-slate-400 dark:text-slate-500">Kayıt bulunamadı</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : orders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                                            <td className="px-6 py-2.5 font-black text-slate-800 dark:text-white text-xs">#PO-{order.id}</td>
                                            <td className="px-6 py-2.5 font-black text-slate-800 dark:text-white uppercase text-xs">{order.supplier?.name || '---'}</td>
                                            <td className="px-6 py-2.5 text-slate-400 font-bold text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-2.5 truncate max-w-[200px] text-slate-400 font-medium text-[11px]" title={order.note}>
                                                {order.note || '---'}
                                            </td>
                                            <td className="px-6 py-2.5">
                                                <span className={`w-[100px] inline-flex justify-center py-1 text-[9px] font-black uppercase rounded-lg border ${order.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    order.status === 'SENT' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-slate-500/10 text-slate-600 border-slate-500/20'}`}>
                                                    {order.status === 'RECEIVED' ? 'Teslim' : order.status === 'SENT' ? 'Gönderildi' : 'Taslak'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 text-right font-black text-slate-800 dark:text-white text-xs">₺{Number(order.totalAmount).toLocaleString()}</td>
                                            <td className="px-6 py-2.5 text-right space-x-1.5 transition-all">
                                                {order.status !== 'RECEIVED' ? (
                                                    <>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); openInvoiceModal(order); }} 
                                                            className="px-4 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black uppercase rounded-xl hover:bg-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            Teslim Al
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenUpsert(order); }} 
                                                            className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center justify-center text-xs hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                                                            title="Düzenle"
                                                        >
                                                            <i className="fat fa-edit"></i>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }} 
                                                            className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 inline-flex items-center justify-center text-xs hover:bg-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                                                            title="Sil"
                                                        >
                                                            <i className="fat fa-trash"></i>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2 pr-2">
                                                        <i className="fat fa-check-double text-emerald-500 text-sm"></i>
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">İşlem Tamamlandı</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Compact Pagination */}
                        <div className="px-6 py-4 bg-slate-100/30 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <span className="text-slate-800 dark:text-slate-200">{totalOrders}</span>
                                <span>Kayıt Bulundu</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchData(1)}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-20 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-sm"
                                    title="İlk Sayfa"
                                >
                                    <i className="fat fa-angles-left"></i>
                                </button>
                                <button
                                    onClick={() => fetchData(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-20 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-sm"
                                    title="Geri"
                                >
                                    <i className="fat fa-angle-left"></i>
                                </button>

                                <div className="h-10 px-5 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600">
                                    <span className="text-xs font-black text-amber-600 dark:text-amber-500">{currentPage}</span>
                                    <span className="mx-3 text-slate-400 dark:text-slate-500 font-bold">/</span>
                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">{lastPage}</span>
                                </div>

                                <button
                                    onClick={() => fetchData(currentPage + 1)}
                                    disabled={currentPage === lastPage}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-20 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-sm"
                                    title="İleri"
                                >
                                    <i className="fat fa-angle-right"></i>
                                </button>
                                <button
                                    onClick={() => fetchData(lastPage)}
                                    disabled={currentPage === lastPage}
                                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center disabled:opacity-20 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-sm"
                                    title="Son Sayfa"
                                >
                                    <i className="fat fa-angles-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden h-[calc(100vh-240px)] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-amber-50/30 dark:bg-amber-900/10">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Eksik ve Azalan Stoklar</h2>
                                <p className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Kritik seviyedeki {lowStocks.length} materyal</p>
                            </div>
                            <button onClick={autoGenerateOrder} className="px-5 py-2 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                <i className="fat fa-magic text-amber-500"></i> Toplu Sipariş Taslağı Oluştur
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 custom-scrollbar">
                            {lowStocks.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-emerald-500 font-black text-lg uppercase tracking-widest opacity-30">Tüm stok seviyeleri uygun!</div>
                            ) : lowStocks.map((item, idx) => (
                                <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col relative group hover:border-rose-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">Kritik</div>
                                        <div className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">#{item.productId}</div>
                                    </div>
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4 h-8 line-clamp-2">{item.productName}</h4>
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-[8px] font-bold text-slate-400 uppercase text-center">Stok</div>
                                            <div className="text-sm font-black text-rose-500 text-center">{item.currentStock} <span className="text-[9px] text-slate-400">{item.unit}</span></div>
                                        </div>
                                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-[8px] font-bold text-slate-400 uppercase text-center">Min</div>
                                            <div className="text-sm font-black text-slate-400 text-center">{item.minStockLevel} <span className="text-[9px] text-slate-400">{item.unit}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50 dark:border-slate-800">
                                        <div className="text-[10px] font-black text-slate-800 dark:text-white">₺{Number(item.costPrice).toLocaleString()}</div>
                                        <button
                                            onClick={() => {
                                                handleOpenUpsert();
                                                handleAddProductToOrder({ id: item.productId, name: item.productName, sku: '', costPrice: item.costPrice, unit: item.unit });
                                            }}
                                            className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:scale-110 shadow-sm transition-all" title="Siparişe Ekle">
                                            <i className="fat fa-cart-plus text-sm"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* UPSET MODAL - Minimal Theme */}
            {isUpsertOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsUpsertOpen(false)}></div>
                    <div className="relative bg-[#FDFDFD] dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in duration-300">
                        {/* Header Minimal */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm"><i className="fat fa-truck-container text-lg"></i></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{formData.id ? 'Sipariş Düzenle' : 'Yeni Satın Alma Siparişi'}</h2>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tedarikçi sipariş formu</p>
                                </div>
                            </div>
                            <button onClick={() => setIsUpsertOpen(false)} className="w-8 h-8 rounded-full text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all text-xl">&times;</button>
                        </div>

                        {/* Minimal Content */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Left: Supplier & Note */}
                            <div className="w-64 p-5 border-r border-slate-100 dark:border-slate-800 space-y-4 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tedarikçi Seçimi *</label>
                                    <select
                                        value={formData.supplierId}
                                        onChange={e => setFormData({ ...formData, supplierId: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-all shadow-sm"
                                    >
                                        <option value="0">Tedarikçi Seçiniz...</option>
                                        {suppliers.length > 0 ? (
                                            suppliers.map(s => <option key={s.id} value={s.id}>{s.name || 'İsimsiz'}</option>)
                                        ) : (
                                            <option disabled>Tedarikçi Bulunamadı</option>
                                        )}
                                    </select>
                                    <p className="text-[8px] text-indigo-500 mt-1 font-bold italic uppercase tracking-widest">({suppliers.length} tedarikçi yüklendi)</p>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notlar</label>
                                    <textarea
                                        rows={4}
                                        value={formData.note}
                                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-all resize-none shadow-sm"
                                        placeholder="..."
                                    ></textarea>
                                </div>
                                <div className="p-5 bg-slate-900 rounded-2xl text-center shadow-lg">
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Toplam Tutar</div>
                                    <div className="text-2xl font-black text-white">₺{calculateTotal().toLocaleString()}</div>
                                    <div className="mt-3 text-[9px] font-bold text-slate-600 uppercase italic border-t border-white/5 pt-3">
                                        {formData.items?.length || 0} Çeşit Ürün
                                    </div>
                                </div>
                            </div>

                            {/* Right: Items Minimal Table */}
                            <div className="flex-1 p-5 flex flex-col bg-white dark:bg-slate-900">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Sipariş Kalemleri</h3>
                                    <button
                                        onClick={() => setIsProductPickerOpen(true)}
                                        className="px-3 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-xl shadow-lg shadow-amber-500/10 hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <i className="fat fa-plus text-[10px]"></i> Ürün Ekle
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-slate-50 dark:border-slate-800 rounded-2xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Ürün Adı</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-center w-32">Miktar</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right w-32">Birim Fiyat</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right w-24">Toplam</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {formData.items?.length === 0 ? (
                                                <tr><td colSpan={5} className="py-20 text-center text-slate-300 text-[10px] font-black uppercase italic">Henüz ürün eklenmedi.</td></tr>
                                            ) : formData.items?.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                    <td className="px-4 py-2">
                                                        <div className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight truncate max-w-[200px]">{item.productName}</div>
                                                        <div className="text-[9px] text-amber-500 font-bold uppercase">{item.unit}</div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800 w-fit mx-auto">
                                                            <button onClick={() => handleItemChange(idx, 'quantity', Math.max(1, item.quantity - 1))} className="w-6 h-6 rounded bg-white dark:bg-slate-900 text-xs font-black text-slate-400 hover:text-rose-500 shadow-sm">-</button>
                                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-10 bg-transparent text-center font-black text-xs outline-none" />
                                                            <button onClick={() => handleItemChange(idx, 'quantity', item.quantity + 1)} className="w-6 h-6 rounded bg-white dark:bg-slate-900 text-xs font-black text-slate-400 hover:text-emerald-500 shadow-sm">+</button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="relative w-full">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 font-black">₺</span>
                                                            <input type="number" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full pl-5 pr-2 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black outline-none focus:border-amber-500 transition-all text-right" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-black text-slate-800 dark:text-white text-xs">₺{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button onClick={() => handleRemoveProductFromOrder(idx)} className="text-slate-200 hover:text-rose-500 transition-colors"><i className="fat fa-trash-can text-sm"></i></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Minimal Footer */}
                        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex justify-between items-center">
                            <button onClick={() => setIsUpsertOpen(false)} className="px-6 py-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 font-black text-[9px] uppercase tracking-widest rounded-2xl hover:bg-rose-500/20 hover:scale-105 active:scale-95 transition-all">
                                <i className="fat fa-times mr-2"></i> İptal
                            </button>
                            <button onClick={saveOrder} className="px-10 py-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 font-black text-[9px] uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/5 hover:bg-amber-500/20 hover:scale-105 active:scale-95 transition-all">
                                <i className="fat fa-save mr-2"></i> Siparişi Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT PICKER MODAL - New Minimal Structure */}
            {isProductPickerOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsProductPickerOpen(false)}></div>
                    <div className="relative bg-[#FAFAFA] dark:bg-slate-900 w-full max-w-2xl h-[70vh] rounded-[32px] shadow-2xl overflow-hidden border border-white dark:border-slate-800 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-sm"><i className="fat fa-box-open"></i></div>
                                <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase">Ürün Seçimi</h2>
                            </div>
                            <div className="relative w-64">
                                <i className="fat fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                <input
                                    type="text"
                                    placeholder="Ürün Ara..."
                                    value={pickerSearch}
                                    onChange={e => setPickerSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-bold outline-none focus:ring-2 ring-indigo-500/20 shadow-sm"
                                />
                            </div>
                            <button 
                                onClick={() => setIsProductPickerOpen(false)} 
                                className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 active:scale-90 transition-all flex items-center justify-center"
                            >
                                <i className="fat fa-times text-sm"></i>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-12 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-2 content-start items-start">
                            {filteredPickerProducts.length === 0 ? (
                                <div className="col-span-full py-10 text-center text-xs font-bold text-slate-300 italic">Ürün bulunamadı.</div>
                            ) : filteredPickerProducts.map(p => {
                                const isCritical = (p.currentStock || 0) <= (p.minStockLevel || 0);
                                return (
                                        <div
                                            key={p.id}
                                            className={`p-3 h-[65px] rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group relative overflow-hidden shrink-0 ${isCritical ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 hover:border-emerald-500'}`}
                                            onClick={() => handleAddProductToOrder(p)}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0 ${isCritical ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-900 dark:text-slate-400'}`}>
                                                {p.name.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight truncate pr-4">{p.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[9px] font-black uppercase ${isCritical ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                                                        Stok: {p.currentStock} {p.unit}
                                                    </span>
                                                    <span className="text-[9px] text-slate-300">|</span>
                                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">₺{Number(p.costPrice).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="absolute right-3 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-all shadow-sm">
                                                <i className="fat fa-plus text-xs"></i>
                                            </div>
                                        </div>
                                        </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICE MODAL - Minimal Theme */}
            {isInvoiceOpen && selectedOrder && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setIsInvoiceOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-5 duration-400">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg mb-4 text-3xl"><i className="fat fa-file-invoice-dollar"></i></div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Fatura Kaydı</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Siparişi teslim alıp stokları güncelle</p>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Firma:</span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase">{selectedOrder.supplier?.name}</span>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Fatura No *</label>
                                <input type="text" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold shadow-sm" placeholder="..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Tarih</label>
                                    <input type="date" value={invoiceForm.invoiceDate} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-[10px] font-bold shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Ödenen (₺)</label>
                                    <input type="number" value={invoiceForm.invoiceAmount} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceAmount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-black text-emerald-600 shadow-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Ödeme</label>
                                    <select value={invoiceForm.paymentMethod} onChange={e => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold shadow-sm">
                                        <option value="KASA">KASA</option>
                                        <option value="BANKA">BANKA</option>
                                        <option value="KREDI_KARTI">KREDİ KARTI</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Durum</label>
                                    <select value={invoiceForm.paymentStatus} onChange={e => setInvoiceForm({ ...invoiceForm, [e.target.name]: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold shadow-sm">
                                        <option value="PAID">ÖDENDİ</option>
                                        <option value="UNPAID">ÖDENMEDİ</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
                            <button onClick={() => setIsInvoiceOpen(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-400 font-black rounded-[14px] text-[10px] uppercase shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all">Vazgeç</button>
                            <button onClick={handleSaveInvoice} className="flex-[2] py-3 bg-emerald-500 text-white font-black rounded-[14px] text-[10px] uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Stoka İşle & Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
}
