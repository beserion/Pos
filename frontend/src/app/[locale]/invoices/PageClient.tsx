'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';

const API = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InvoiceItem {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    vatAmount?: number;
    lineTotal?: number;
    lineTotalWithVat?: number;
    description?: string;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    invoiceType: string;
    partnerId?: number;
    partner?: { id: number; name: string; taxNumber?: string; phone?: string };
    description?: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    discountRate: number;
    discountAmount: number;
    grandTotal: number;
    issueDate: string;
    dueDate?: string;
    status: string;
    paymentMethod: string;
    warehouseLocation?: string;
    items: InvoiceItem[];
    createdAt: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    costPrice: number;
    unit: string;
    category: string;
    isActive: boolean;
}

interface Partner {
    id: number;
    name: string;
    type: string;
    phone?: string;
    taxNumber?: string;
    taxOffice?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    DRAFT: { label: 'Taslak', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700', icon: 'fa-file-pen' },
    ISSUED: { label: 'Kesildi', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: 'fa-file-check' },
    PAID: { label: 'Ödendi', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: 'fa-circle-check' },
    CANCELLED: { label: 'İptal', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/30', icon: 'fa-circle-xmark' },
};

const INVOICE_TYPES: Record<string, { label: string; icon: string; color: string }> = {
    PURCHASE: { label: 'Alış Faturası', icon: 'fa-cart-arrow-down', color: 'text-indigo-600' },
    SALE: { label: 'Satış Faturası', icon: 'fa-cart-shopping', color: 'text-emerald-600' },
};

const VAT_RATES = [0, 1, 10, 20];

// ─── Component ─────────────────────────────────────────────────────────────────

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const { user: currentUser } = useAuth();

    const getConfig = () => ({ headers: { Authorization: `Bearer ${currentUser?.token}` } });

    // State
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState<any>({});

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterType, startDate, endDate]);

    // Form state
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        invoiceType: 'PURCHASE',
        partnerId: 0,
        description: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'ISSUED',
        paymentMethod: 'CASH',
        warehouseLocation: 'default',
        discountRate: 0,
    });
    const [formItems, setFormItems] = useState<InvoiceItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // ── Load Data ────────────────────────────────────────────────────────────────
    const loadInvoices = useCallback(async () => {
        if (!currentUser?.token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                ...(searchTerm && { search: searchTerm }),
                ...(filterStatus !== 'ALL' && { status: filterStatus }),
                ...(filterType !== 'ALL' && { type: filterType }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
            });
            const res = await axios.get(`${API}/invoices?${params.toString()}`, getConfig());
            setInvoices(res.data.data);
            setTotalItems(res.data.total);
            setStats(res.data.stats);
        } catch {
            showSwal({ title: 'Hata', text: 'Faturalar yüklenemedi.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    }, [currentUser?.token, currentPage, searchTerm, filterStatus, filterType, startDate, endDate]);

    const loadDependencies = useCallback(async () => {
        if (!currentUser?.token) return;
        const config = getConfig();

        // Separate calls for clearer error tracking
        try {
            const prodRes = await axios.get<Product[]>(`${API}/products`, config);
            const prodData = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data as any)?.data || [];
            setProducts(prodData.filter((p: Product) => p.isActive));
        } catch (err: any) {
            console.error("Products load failed:", err.response?.data || err.message);
        }

        try {
            const partRes = await axios.get(`${API}/partners`, config);
            const partnerData = Array.isArray(partRes.data) ? partRes.data : (partRes.data as any)?.data || [];
            setPartners(partnerData.filter((p: Partner) => p.type === 'SUPPLIER' || p.type === 'CUSTOMER'));
        } catch (err: any) {
            console.error("Partners load failed:", err.response?.data || err.message);
        }
    }, [currentUser?.token]);

    useEffect(() => { loadInvoices(); }, [loadInvoices]);
    useEffect(() => { loadDependencies(); }, [loadDependencies]);


    // ── New Invoice ──────────────────────────────────────────────────────────────
    const openNewInvoice = async () => {
        try {
            const res = await axios.get(`${API}/invoices/generate-number`, getConfig());
            setEditingId(null);
            setFormData({
                invoiceNumber: typeof res.data === 'string' ? res.data : res.data?.invoiceNumber || '',
                invoiceType: 'PURCHASE',
                partnerId: 0,
                description: '',
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                status: 'ISSUED',
                paymentMethod: 'CASH',
                warehouseLocation: 'default',
                discountRate: 0,
            });
            setFormItems([]);
            setView('form');
        } catch {
            showSwal({ title: 'Hata', text: 'Fatura numarası alınamadı.', icon: 'error' });
        }
    };

    // ── Edit Invoice ─────────────────────────────────────────────────────────────
    const openEditInvoice = async (inv: Invoice) => {
        try {
            const res = await axios.get<Invoice>(`${API}/invoices/${inv.id}`, getConfig());
            const data = res.data;
            setEditingId(data.id);
            setFormData({
                invoiceNumber: data.invoiceNumber,
                invoiceType: data.invoiceType || 'PURCHASE',
                partnerId: data.partnerId || 0,
                description: data.description || '',
                issueDate: data.issueDate ? new Date(data.issueDate).toISOString().split('T')[0] : '',
                dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
                status: data.status || 'ISSUED',
                paymentMethod: data.paymentMethod || 'CASH',
                warehouseLocation: data.warehouseLocation || 'default',
                discountRate: Number(data.discountRate) || 0,
            });
            setFormItems((data.items || []).map(item => ({
                productId: item.productId,
                productName: item.productName || '',
                quantity: Number(item.quantity),
                unit: item.unit || 'adet',
                unitPrice: Number(item.unitPrice),
                vatRate: Number(item.vatRate) || 0,
                description: item.description || '',
            })));
            setView('form');
        } catch {
            showSwal({ title: 'Hata', text: 'Fatura detayı yüklenemedi.', icon: 'error' });
        }
    };

    // ── Add Item Row ─────────────────────────────────────────────────────────────
    const addItemRow = () => {
        setFormItems(prev => [...prev, {
            productId: 0, productName: '', quantity: 1, unit: 'adet',
            unitPrice: 0, vatRate: 20, description: '',
        }]);
    };

    const removeItemRow = (idx: number) => {
        setFormItems(prev => prev.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: string, value: any) => {
        setFormItems(prev => {
            const updated = [...prev];
            (updated[idx] as any)[field] = value;

            // auto-fill product info
            if (field === 'productId') {
                const prod = products.find(p => p.id === Number(value));
                if (prod) {
                    updated[idx].productName = prod.name;
                    updated[idx].unitPrice = prod.costPrice || prod.price;
                    updated[idx].unit = prod.unit || 'adet';
                }
            }
            return updated;
        });
    };

    // ── Calculate ────────────────────────────────────────────────────────────────
    const subtotal = formItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
    const discountAmount = subtotal * (Number(formData.discountRate) / 100);

    const calcLineTotal = (item: InvoiceItem) => Number(item.quantity) * Number(item.unitPrice);
    const calcLineDiscount = (item: InvoiceItem) => calcLineTotal(item) * (Number(formData.discountRate) / 100);
    const calcLineTotalDiscounted = (item: InvoiceItem) => calcLineTotal(item) - calcLineDiscount(item);
    const calcLineVat = (item: InvoiceItem) => calcLineTotalDiscounted(item) * (Number(item.vatRate) / 100);
    const calcLineTotalWithVat = (item: InvoiceItem) => calcLineTotalDiscounted(item) + calcLineVat(item);

    const totalVat = formItems.reduce((s, i) => s + calcLineVat(i), 0);
    const grandTotal = subtotal - discountAmount + totalVat;

    // ── Save ─────────────────────────────────────────────────────────────────────
    const saveInvoice = async () => {
        if (!formData.invoiceNumber.trim()) {
            showSwal({ title: 'Uyarı', text: 'Fatura numarası zorunludur.', icon: 'warning' });
            return;
        }
        if (formItems.length === 0) {
            showSwal({ title: 'Uyarı', text: 'En az bir kalem eklemelisiniz.', icon: 'warning' });
            return;
        }
        const invalidItems = formItems.filter(i => !i.productId || i.quantity <= 0 || i.unitPrice <= 0);
        if (invalidItems.length > 0) {
            showSwal({ title: 'Uyarı', text: 'Tüm kalemlerde ürün, miktar ve birim fiyat girilmelidir.', icon: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                partnerId: formData.partnerId || undefined,
                items: formItems.map(i => ({
                    productId: Number(i.productId),
                    productName: i.productName,
                    quantity: Number(i.quantity),
                    unit: i.unit,
                    unitPrice: Number(i.unitPrice),
                    vatRate: Number(i.vatRate),
                    description: i.description,
                })),
            };

            if (editingId) {
                await axios.put(`${API}/invoices/${editingId}`, payload, getConfig());
                toastSwal({ icon: 'success', title: 'Fatura güncellendi ve stoklar yeniden hesaplandı' });
            } else {
                await axios.post(`${API}/invoices`, payload, getConfig());
                toastSwal({ icon: 'success', title: 'Fatura kaydedildi ve stoklara işlendi' });
            }

            setEditingId(null);
            setView('list');
            loadInvoices();
        } catch (err: any) {
            showSwal({ title: 'Hata', text: err?.response?.data?.message || 'Kayıt hatası.', icon: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ───────────────────────────────────────────────────────────────────
    const deleteInvoice = async (inv: Invoice) => {
        const result = await showSwal({
            title: `"${inv.invoiceNumber}" silinsin mi?`,
            text: 'Fatura silinecek ve stok hareketleri geri alınacak.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sil', cancelButtonText: 'İptal',
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API}/invoices/${inv.id}`, getConfig());
                toastSwal({ icon: 'success', title: 'Fatura silindi' });
                loadInvoices();
            } catch {
                showSwal({ title: 'Hata', text: 'Silme başarısız.', icon: 'error' });
            }
        }
    };

    // ── Stats ────────────────────────────────────────────────────────────────────
    const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const totalPurchase = stats?.purchaseTotal || 0;
    const totalSale = stats?.saleTotal || 0;
    const purchaseCount = stats?.purchaseCount || 0;
    const saleCount = stats?.saleCount || 0;

    const totalPurchaseVat = stats?.purchaseVat || 0;
    const totalSaleVat = stats?.saleVat || 0;

    const statsData = [
        {
            label: 'Alış Toplamı',
            value: `₺${fmt(totalPurchase)}`,
            subLabel: `${purchaseCount} Adet Fatura`,
            icon: 'fa-cart-arrow-down',
            color: 'text-indigo-600',
            bg: 'bg-indigo-500/10'
        },
        {
            label: 'Alış KDV Toplamı',
            value: `₺${fmt(totalPurchaseVat)}`,
            icon: 'fa-calculator',
            color: 'text-blue-600',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Satış Toplamı',
            value: `₺${fmt(totalSale)}`,
            subLabel: `${saleCount} Adet Fatura`,
            icon: 'fa-cart-shopping',
            color: 'text-emerald-600',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Satış KDV Toplamı',
            value: `₺${fmt(totalSaleVat)}`,
            icon: 'fa-calculator',
            color: 'text-teal-600',
            bg: 'bg-teal-500/10'
        },
    ];

    const paginated = invoices; // Invoices are directly managed by server pagination
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // ─── RENDER ──────────────────────────────────────────────────────────────────
    if (view === 'form') return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 flex flex-col overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-6 pt-6 pb-4 relative z-10 flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <i className="fat fa-file-invoice me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '40px' }}></i>
                        <div>
                            <h3 className="mb-0 text-2xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]">{editingId ? 'Fatura Düzenle' : 'Yeni Fatura'}</h3>
                            <div className="h-0.5 w-full bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-1.5 mb-0.5"></div>
                            <h5 className="mb-0 text-sm font-medium text-slate-400 dark:text-slate-500 mt-0.5">{editingId ? 'Fatura detaylarını ve kalemlerini düzenleyin' : 'Detaylı fatura girişi ve stok hareketi'}</h5>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setView('list')} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Listeye Dön
                        </button>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[20px] border border-white dark:border-slate-700 shadow-lg p-5 flex-1 flex flex-col min-h-0 overflow-hidden">

                    {/* Top Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura No *</label>
                            <div className="relative">
                                <i className="fat fa-hashtag absolute left-3 top-2.5 text-indigo-400 text-xs"></i>
                                <input type="text" value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none tracking-widest" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura Tipi *</label>
                            <select value={formData.invoiceType} onChange={e => setFormData({ ...formData, invoiceType: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none">
                                <option value="PURCHASE" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Alış Faturası</option>
                                <option value="SALE" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Satış Faturası</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fatura Tarihi *</label>
                            <input type="date" value={formData.issueDate} onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vade Tarihi</label>
                            <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </div>
                    </div>

                    {/* Partner + Payment Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tedarikçi / Cari</label>
                            <select value={formData.partnerId} onChange={e => setFormData({ ...formData, partnerId: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none">
                                <option value={0} className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Seçiniz...</option>
                                {partners.map(p => <option key={p.id} value={p.id} className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">{p.name} {p.taxNumber ? `(${p.taxNumber})` : ''}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ödeme Yöntemi</label>
                            <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none">
                                <option value="CASH" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Nakit</option>
                                <option value="BANK" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Havale/EFT</option>
                                <option value="CARD" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">Kredi Kartı</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Depo / Lokasyon</label>
                            <input type="text" value={formData.warehouseLocation} onChange={e => setFormData({ ...formData, warehouseLocation: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Açıklama</label>
                            <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Fatura açıklaması..."
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-xs focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </div>
                    </div>

                    <hr className="border-slate-200 dark:border-slate-700 my-4" />

                    {/* Items Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <i className="fat fa-list text-indigo-500 text-lg"></i>
                            <h4 className="text-sm font-black text-slate-700 dark:text-white uppercase tracking-widest">Fatura Kalemleri</h4>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{formItems.length} kalem</span>
                        </div>
                        <button onClick={addItemRow} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-2">
                            <i className="fat fa-plus"></i> Kalem Ekle
                        </button>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 overflow-auto min-h-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-20 backdrop-blur-sm">
                                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-10">#</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Miktar</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Birim</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Birim Fiyat</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">KDV %</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Tutar</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">KDV Dahil</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formItems.map((item, idx) => (
                                    <tr key={idx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-2 text-slate-400 font-bold">{idx + 1}</td>
                                        <td className="px-4 py-2">
                                            <select value={item.productId} onChange={e => updateItem(idx, 'productId', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                <option value={0} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">Ürün seçin...</option>
                                                {products.map(p => <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">{p.name} ({p.sku})</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="number" value={item.quantity} min={0.01} step={0.01} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                className="w-full px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                {['adet', 'kg', 'gr', 'lt', 'ml', 'porsiyon'].map(u => <option key={u} value={u} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">{u}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="number" value={item.unitPrice} min={0} step={0.01} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select value={item.vatRate} onChange={e => updateItem(idx, 'vatRate', Number(e.target.value))}
                                                className="w-full px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                {VAT_RATES.map(r => <option key={r} value={r} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">%{r}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200">₺{fmt(calcLineTotal(item))}</td>
                                        <td className="px-4 py-2 text-right font-black text-slate-800 dark:text-white">₺{fmt(calcLineTotalWithVat(item))}</td>
                                        <td className="px-2 py-2">
                                            <button onClick={() => removeItemRow(idx)} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 transition-colors flex items-center justify-center">
                                                <i className="fat fa-trash text-xs"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {formItems.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                                            <i className="fat fa-box-open text-3xl mb-2 block opacity-30"></i>
                                            <p className="text-sm font-bold">&quot;Kalem Ekle&quot; butonuyla ürün ekleyin</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mt-4">
                        <div className="w-full max-w-sm space-y-1.5">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Ara Toplam</span>
                                <span className="font-bold">₺{fmt(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>KDV Toplam</span>
                                <span className="font-bold">₺{fmt(totalVat)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span>İskonto</span>
                                    <input type="number" value={formData.discountRate} min={0} max={100} step={0.5}
                                        onChange={e => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                                        className="w-14 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-[10px] outline-none" />
                                    <span className="text-[10px]">%</span>
                                </div>
                                <span className="font-bold text-rose-500">-₺{fmt(discountAmount)}</span>
                            </div>
                            <hr className="border-slate-200 dark:border-slate-700 my-1" />
                            <div className="flex justify-between items-center">
                                <span className="font-black text-slate-700 dark:text-white uppercase tracking-widest text-[11px]">Genel Toplam</span>
                                <span className="font-black text-indigo-600 dark:text-indigo-400 text-lg">₺{fmt(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setView('list')} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">İptal</button>
                        <button onClick={saveInvoice} disabled={saving}
                            className="px-10 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100 flex items-center gap-2">
                            {saving ? <><i className="fat fa-spinner animate-spin"></i> Kaydediliyor...</> : <><i className="fat fa-check"></i> {editingId ? 'Güncelle & Stoğu Yenile' : 'Kaydet'}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ─── LIST VIEW ───────────────────────────────────────────────────────────────
    return (
        <div className="overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300 flex flex-col">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none"></div>

            <div className="flex-1 flex flex-col min-h-0 w-full px-[50px] pt-8 pb-0 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center shrink-0">
                        <i className="fat fa-file-invoice me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]" id="title">Faturalar</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Alış ve satış faturalarını yönetin</h5>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex-1 flex justify-center px-6">
                        <div className="w-full max-w-md bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-sm border border-white dark:border-slate-700 flex items-center gap-3">
                            <i className="fat fa-search text-slate-400"></i>
                            <input type="text" placeholder="Fatura no, cari adı ile ara..." value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white font-bold text-sm placeholder:text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{totalItems} sonuç</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button onClick={openNewInvoice} className="px-5 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Fatura
                        </button>
                        <button onClick={() => router.push(`/${locale}`)} className="px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                            <i className="fat fa-home text-lg"></i> Ana Menü
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {statsData.map(stat => (
                        <div key={stat.label} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[28px] border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:translate-y-[-2px] transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-0">{stat.value}</h3>
                                {stat.subLabel && <p className="text-[10px] font-bold text-slate-500 mt-1">{stat.subLabel}</p>}
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shrink-0 ml-2`}>
                                <i className={`fat ${stat.icon} text-xl`}></i>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters & Pagination Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range Group */}
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 shadow-sm">
                            <i className="fat fa-calendar-range text-indigo-500 text-lg"></i>
                            <div className="flex items-center gap-2">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer" />
                                <span className="text-slate-300 font-bold">-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer" />
                            </div>
                            {(startDate || endDate) && (
                                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-rose-500 hover:text-rose-600 transition-colors">
                                    <i className="fat fa-circle-xmark text-lg"></i>
                                </button>
                            )}
                        </div>

                        {/* Type Select Group */}
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 shadow-sm">
                            <i className="fat fa-tags text-indigo-500 text-lg"></i>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-w-[120px]">
                                <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-1">Tüm Tipler</option>
                                <option value="PURCHASE" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-1">Alış Faturası</option>
                                <option value="SALE" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-1">Satış Faturası</option>
                            </select>
                        </div>

                        {/* Status Select Group */}
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 shadow-sm">
                            <i className="fat fa-circle-check text-indigo-500 text-lg"></i>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-w-[130px]">
                                <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-1">Tüm Durumlar</option>
                                <option value="DRAFT" className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-1">Taslak</option>
                                <option value="ISSUED" className="bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold py-1">Kesildi</option>
                                <option value="PAID" className="bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold py-1">Ödendi</option>
                                <option value="CANCELLED" className="bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold py-1">İptal</option>
                            </select>
                        </div>
                    </div>

                    {/* Standard Pagination */}
                    <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-2 border border-indigo-100 dark:border-indigo-500/20 shadow-sm ml-auto">
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-20 transition-all shadow-sm">
                                <i className="fat fa-angles-left text-xs"></i>
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-20 transition-all shadow-sm">
                                <i className="fat fa-chevron-left text-xs"></i>
                            </button>

                            <div className="flex items-center gap-1.5 px-1.5">
                                {[...Array(totalPages || 1)].map((_, i) => {
                                    const page = i + 1;
                                    if (totalPages > 5 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                                        if (page === 2 || page === totalPages - 1) return <span key={page} className="text-slate-300 font-bold px-1">...</span>;
                                        return null;
                                    }
                                    return (
                                        <button key={page} onClick={() => setCurrentPage(page)}
                                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600'}`}>
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-20 transition-all shadow-sm">
                                <i className="fat fa-chevron-right text-xs"></i>
                            </button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-20 transition-all shadow-sm">
                                <i className="fat fa-angles-right text-xs"></i>
                            </button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        <div className="flex flex-col items-end pr-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Toplam</p>
                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-none mt-1">{totalItems} Kayıt</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[28px] border border-white dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-auto table-responsive" style={{ height: 'calc(100vh - 500px)' }}>
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm">
                                        <th className="text-center px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-10">#</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fatura No</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tip</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cari</th>
                                        <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                        <th className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                        <th className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kalem</th>
                                        <th className="text-right px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutar</th>
                                        <th className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                        <th className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((inv, idx) => {
                                        const st = STATUS_META[inv.status] || STATUS_META['DRAFT'];
                                        const tp = INVOICE_TYPES[inv.invoiceType] || INVOICE_TYPES['PURCHASE'];
                                        const seq = (currentPage - 1) * itemsPerPage + idx + 1;
                                        return (
                                            <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3.5 text-center font-bold text-slate-400 text-xs">{seq}</td>
                                                <td className="px-5 py-3.5 font-black text-slate-700 dark:text-white tracking-wider">{inv.invoiceNumber}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${tp.color}`}>
                                                        <i className={`fat ${tp.icon}`}></i> {tp.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 font-bold text-slate-600 dark:text-slate-300">{inv.partner?.name || '-'}</td>
                                                <td className="px-5 py-3.5 text-xs font-semibold text-slate-500 max-w-[200px] truncate" title={inv.description || ''}>{inv.description || '-'}</td>
                                                <td className="px-5 py-3.5 text-center text-slate-500 font-bold">{new Date(inv.issueDate).toLocaleDateString('tr-TR')}</td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-black text-slate-500">{inv.items?.length || 0}</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-black text-slate-800 dark:text-white">₺{fmt(Number(inv.grandTotal))}</td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${st.bg} ${st.color}`}>
                                                        <i className={`fat ${st.icon}`}></i> {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => openEditInvoice(inv)} className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors inline-flex items-center justify-center" title="Düzenle">
                                                            <i className="fat fa-pen-to-square text-xs"></i>
                                                        </button>
                                                        <button onClick={() => deleteInvoice(inv)} className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors inline-flex items-center justify-center" title="Sil">
                                                            <i className="fat fa-trash text-xs"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {totalItems === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-5 py-16 text-center text-slate-400">
                                                <i className="fat fa-file-invoice text-4xl mb-3 block opacity-30"></i>
                                                <p className="font-bold text-sm">Fatura bulunamadı</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Filtered Totals Summary Table */}
                        <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-8 px-8">
                            {/* Alış Özeti */}
                            <div className="space-y-1">
                                <h6 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 border-b border-indigo-500/10 pb-1">Toplam Alış Özeti</h6>
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Ara Toplam:</span>
                                    <span>₺{fmt(totalPurchase - totalPurchaseVat)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>KDV Toplam:</span>
                                    <span>₺{fmt(totalPurchaseVat)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span>GENEL TOPLAM:</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">₺{fmt(totalPurchase)}</span>
                                </div>
                            </div>

                            {/* Satış Özeti */}
                            <div className="space-y-1">
                                <h6 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 border-b border-emerald-500/10 pb-1">Toplam Satış Özeti</h6>
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Ara Toplam:</span>
                                    <span>₺{fmt(totalSale - totalSaleVat)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>KDV Toplam:</span>
                                    <span>₺{fmt(totalSaleVat)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span>GENEL TOPLAM:</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">₺{fmt(totalSale)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
