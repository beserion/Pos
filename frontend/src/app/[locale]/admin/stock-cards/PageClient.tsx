'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';

interface StockCard {
    id: number;
    name: string;
    code: string;
    barcode?: string;
<<<<<<< HEAD
    sku?: string;
    isActive: boolean;
    stockNature: string;
=======
    category?: string;
>>>>>>> upstream/server
    stockGroup?: string;
    stockSubgroup?: string;
    brand?: string;
    baseUnit: string;
    purchaseUnit?: string;
    transferUnit?: string;
    conversionRate: number;
    primaryVendorId?: number | null;
    purchaseVat: number;
    lastPurchasePrice: number;
    averageCost: number;
    costPerBaseUnit: number;
    currency: string;
    stockTrackingEnabled: boolean;
    currentStock: number;
<<<<<<< HEAD
    criticalStock: number;
    minStock: number;
    maxStock: number;
    warehouseId?: number | null;
    shelf?: string;
    outputProfileId?: number | null;
    lotTracking: boolean;
    batchTracking: boolean;
    expiryTracking: boolean;
    serialTracking: boolean;
=======
    minStockLevel: number;
    maxStockLevel?: number;
    isActive: boolean;
    warehouseId?: number | null;
    stockNature: string;
    primaryVendor?: string;
    purchaseVat: number;
    lastPurchasePrice: number;
    averageCost: number;
    sku?: string;
    outputProfileId?: number | null;
>>>>>>> upstream/server
    note?: string;
}

interface Warehouse {
    id: number;
    name: string;
}

interface OutputProfile {
    id: number;
    name: string;
}

export function PageClient() {
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user, hasFeature } = useAuth();


    const [stockCards, setStockCards] = useState<StockCard[]>([]);
    const [filteredCards, setFilteredCards] = useState<StockCard[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [outputProfiles, setOutputProfiles] = useState<OutputProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'stock' | 'extra'>('general');
    const [formData, setFormData] = useState<StockCard>({
        id: 0,
        name: '',
        code: '',
        barcode: '',
<<<<<<< HEAD
        sku: '',
        isActive: true,
        stockNature: 'traded_good',
=======
        category: '',
>>>>>>> upstream/server
        stockGroup: '',
        stockSubgroup: '',
        brand: '',
        baseUnit: 'adet',
        purchaseUnit: '',
        transferUnit: '',
        conversionRate: 1,
        primaryVendorId: null,
        purchaseVat: 0,
        lastPurchasePrice: 0,
        averageCost: 0,
        costPerBaseUnit: 0,
        currency: 'TRY',
        stockTrackingEnabled: true,
        currentStock: 0,
<<<<<<< HEAD
        criticalStock: 0,
        minStock: 0,
        maxStock: 0,
        warehouseId: null,
        shelf: '',
        outputProfileId: null,
        lotTracking: false,
        batchTracking: false,
        expiryTracking: false,
        serialTracking: false,
=======
        minStockLevel: 0,
        maxStockLevel: 0,
        isActive: true,
        warehouseId: null,
        stockNature: 'traded_good',
        primaryVendor: '',
        purchaseVat: 0,
        lastPurchasePrice: 0,
        averageCost: 0,
        sku: '',
        outputProfileId: null,
>>>>>>> upstream/server
        note: ''
    });

    useEffect(() => {
        if (user?.token && hasFeature('inventory_system')) {
            fetchData();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, hasFeature]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [cardsRes, catRes, whRes, opRes] = await Promise.all([
                axios.get(`${API_URL}/stock-cards?limit=1000`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/stock-cards/categories`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/warehouses`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/output-profiles`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] }))
            ]);

            const dbCards = cardsRes.data.data || [];
            setStockCards(dbCards);
            setFilteredCards(dbCards);
            setCategories(catRes.data || []);
            setWarehouses(whRes.data || []);
            setOutputProfiles(opRes.data || []);
        } catch (error) {
            console.error('Error fetching stock cards', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = stockCards.filter(c =>
            (selectedCategory === '' || c.stockGroup === selectedCategory) &&
            (
                c.name.toLowerCase().includes(lowerQuery) ||
                c.code.toLowerCase().includes(lowerQuery) ||
                (c.barcode && c.barcode.toLowerCase().includes(lowerQuery)) ||
                (c.stockGroup && c.stockGroup.toLowerCase().includes(lowerQuery))
            )
        );
        setFilteredCards(filtered);
    }, [searchQuery, selectedCategory, stockCards]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            const payload: any = { ...formData };
            if (!payload.warehouseId) payload.warehouseId = null;
            if (!payload.outputProfileId) payload.outputProfileId = null;
            if (!payload.primaryVendorId) payload.primaryVendorId = null;

            if (formData.id === 0) {
                const { id, ...postData } = payload;
                await axios.post(`${API_URL}/stock-cards`, postData, config);
                toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            } else {
                await axios.put(`${API_URL}/stock-cards/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('updated'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving stock card', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('saveError'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: 'Bu stok kartını silmek istediğinize emin misiniz? (Reçetelerde veya stok hareketlerinde kullanılıyorsa silinemeyebilir)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API_URL}/stock-cards/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('deleted'), text: 'Stok kartı başarıyla silindi.', icon: 'success' });
                fetchData();
            } catch (error: any) {
                console.error('Error deleting stock card', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('deleteError'), icon: 'error' });
            }
        }
    };

    const generateStockCode = (categoryName: string) => {
        if (!categoryName) return '';
        const prefix = categoryName.substring(0, 3).toLocaleUpperCase('tr');
        const sameCategoryCodes = stockCards
            .filter((c: StockCard) => c.code && c.code.toLocaleUpperCase('tr').startsWith(`${prefix}-`))
            .map(c => {
                const parts = c.code.split('-');
                return parseInt(parts[1]) || 0;
            });
        const maxNumber = sameCategoryCodes.length > 0 ? Math.max(...sameCategoryCodes) : 0;
        const nextNumber = maxNumber + 1;
        const suffix = nextNumber.toString().padStart(4, '0');
        return `${prefix}${suffix}`;
    };

    const handleCategoryChange = (val: string) => {
        let newCode = formData.code;
        if (formData.id === 0 && val) {
            newCode = generateStockCode(val);
        }
        setFormData({ ...formData, stockGroup: val, code: newCode });
    };

    const openModal = (card?: StockCard) => {
        setActiveTab('general');
        if (card) {
            setFormData({ ...card });
        } else {
            setFormData({
                id: 0,
                name: '',
                code: '',
                barcode: '',
<<<<<<< HEAD
                sku: '',
                isActive: true,
                stockNature: 'traded_good',
=======
                category: '',
>>>>>>> upstream/server
                stockGroup: '',
                stockSubgroup: '',
                brand: '',
                baseUnit: 'adet',
                purchaseUnit: '',
                transferUnit: '',
                conversionRate: 1,
                primaryVendorId: null,
                purchaseVat: 0,
                lastPurchasePrice: 0,
                averageCost: 0,
                costPerBaseUnit: 0,
                currency: 'TRY',
                stockTrackingEnabled: true,
                currentStock: 0,
<<<<<<< HEAD
                criticalStock: 0,
                minStock: 0,
                maxStock: 0,
                warehouseId: null,
                shelf: '',
                outputProfileId: null,
                lotTracking: false,
                batchTracking: false,
                expiryTracking: false,
                serialTracking: false,
=======
                minStockLevel: 0,
                maxStockLevel: 0,
                isActive: true,
                warehouseId: null,
                stockNature: 'traded_good',
                primaryVendor: '',
                purchaseVat: 0,
                lastPurchasePrice: 0,
                averageCost: 0,
                sku: '',
                outputProfileId: null,
>>>>>>> upstream/server
                note: ''
            });
        }
        setIsModalOpen(true);
    };

    // KPI Hesaplamaları
    const totalCards = stockCards.length;
    const activeCards = stockCards.filter(c => c.isActive).length;
    const lowStockCards = stockCards.filter(c => c.isActive && c.currentStock <= c.minStock && c.minStock > 0).length;
    const zeroStockCards = stockCards.filter(c => c.isActive && c.currentStock <= 0).length;

    const unitOptions = [
        { value: 'adet', label: 'Adet' },
        { value: 'cl', label: 'Centilitre (cl)' },
        { value: 'ml', label: 'Mililitre (ml)' },
        { value: 'lt', label: 'Litre (lt)' },
        { value: 'gr', label: 'Gram (gr)' },
        { value: 'kg', label: 'Kilogram (kg)' },
        { value: 'porsiyon', label: 'Porsiyon' }
    ];

    if (user && !hasFeature('inventory_system')) {
        return (
            <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pt-20">
                <PremiumModuleLocked moduleName="Envanter Yönetim Sistemi" featureKey="inventory_system" />
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-boxes-stacked me-3 text-teal-600 dark:text-teal-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-teal-600 dark:text-teal-400 leading-none uppercase tracking-[0.25em]">STOK KARTLARI</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Envanter Takip Yönetimi</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ara (Ad, Kod, Barkod)..."
                                className="w-64 pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow"
                            />
                        </div>
                        <div className="relative">
                            <i className="fat fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-48 pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer"
                            >
                                <option value="">Tüm Kategoriler</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <i className="fat fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                        </div>
                        <button onClick={() => openModal()} className="px-6 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Kart
                        </button>
                        <button onClick={() => router.push(`/${locale}/inventory/`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-slate-500/40">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Kart</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalCards}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <i className="fat fa-boxes-stacked text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-teal-300 dark:hover:border-teal-500/40">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aktif Kartlar</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{activeCards}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <i className="fat fa-check-circle text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40">
                        <div>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Kritik Stok</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{lowStockCards}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <i className="fat fa-triangle-exclamation text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-red-300 dark:hover:border-red-500/40">
                        <div>
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Tükenen</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{zeroStockCards}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                            <i className="fat fa-ban text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Stok kartları yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-tl-[40px]">KOD / BARKOD</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">STOK ADI</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">DOĞASI</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">STOK GRUBU</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">BİRİMLER</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNCEL STOK</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">BİRİM MALİYET</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-[40px]">İŞLEMLER</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredCards.map(card => {
                                        const isLowStock = card.currentStock <= card.minStock && card.minStock > 0;
                                        const isOutOfStock = card.currentStock <= 0;

                                        return (
                                            <tr key={card.id} className={`hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-all group ${!card.isActive ? 'opacity-50' : ''}`}>
                                                <td className="px-8 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block w-max">
                                                            {card.code}
                                                        </span>
                                                        {card.barcode && (
                                                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                                                <i className="fat fa-barcode opacity-50"></i> {card.barcode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div>
                                                        <p className="font-extrabold text-slate-800 dark:text-white tracking-tight leading-none text-base mb-1">{card.name}</p>
                                                        {!card.isActive && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full inline-block">Pasif</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1 ${
                                                        card.stockNature === 'raw_material' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' :
                                                        card.stockNature === 'traded_good' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400' :
                                                        card.stockNature === 'semi_finished' ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                                                        card.stockNature === 'consumable' ? 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400' :
                                                        'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                    }`}>
                                                        {{
                                                            'raw_material': 'Hammadde',
                                                            'traded_good': 'Ticari Mal',
                                                            'semi_finished': 'Yarı Mamul',
                                                            'consumable': 'Sarf',
                                                            'packaging': 'Ambalaj'
                                                        }[card.stockNature] || card.stockNature}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                        <i className="fat fa-folder-tree text-teal-500 text-[10px]"></i>
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                            {card.stockGroup || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded border border-teal-100 dark:border-teal-500/20">{card.baseUnit}</span>
                                                        {card.purchaseUnit && (
                                                            <>
                                                                <i className="fat fa-arrow-right-arrow-left text-slate-300 text-[10px]"></i>
                                                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1" title={`1 ${card.purchaseUnit} = ${card.conversionRate} ${card.baseUnit}`}>
                                                                    {card.purchaseUnit} (x{card.conversionRate})
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className={`inline-flex items-baseline gap-1.5 ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        <span className="text-lg font-black tracking-tighter">
                                                            {Number(card.currentStock).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="text-[10px] font-bold uppercase opacity-60 tracking-widest">{card.baseUnit}</span>

                                                        {isLowStock && !isOutOfStock && <i className="fat fa-triangle-exclamation text-xs ml-1" title={`Kritik seviye: ${card.minStock}`}></i>}
                                                        {isOutOfStock && <i className="fat fa-ban text-xs ml-1"></i>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="font-bold text-slate-600 dark:text-slate-400">
                                                        ₺{Number(card.costPerBaseUnit).toFixed(4)} <span className="text-[10px] opacity-50 uppercase">/{card.baseUnit}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                        <button onClick={() => openModal(card)} className="w-9 h-9 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                            <i className="fat fa-pen-field text-sm"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(card.id)} className="w-9 h-9 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                            <i className="fat fa-trash-can text-sm"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredCards.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-box-open text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">STOK KARTI BULUNAMADI</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col h-[750px] max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-teal-600`}></i>
                                    {formData.id === 0 ? 'YENİ STOK KARTI' : 'STOK KARTINI DÜZENLE'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Envanter tanımlama detayları</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-auto p-0 flex flex-col">
                            {/* Tabs */}
                            <div className="flex px-8 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 shrink-0">
                                <button type="button" onClick={() => setActiveTab('general')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'general' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                    <i className="fat fa-circle-info me-2"></i> GENEL BİLGİLER
                                </button>
                                <button type="button" onClick={() => setActiveTab('stock')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'stock' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                    <i className="fat fa-boxes-stacked me-2"></i> STOK & BİRİM
                                </button>
                                <button type="button" onClick={() => setActiveTab('extra')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'extra' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                    <i className="fat fa-file-invoice-dollar me-2"></i> MALİYET & YAZICI
                                </button>
                            </div>

                            <form id="stockCardForm" onSubmit={handleSave} className="flex-1 overflow-auto p-8">
                                {activeTab === 'general' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Adı</label>
                                                <div className="relative">
                                                    <i className="fat fa-box absolute left-4 top-4 text-teal-500/50"></i>
                                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Bacardi 70cl" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ana Kategori (Departman)</label>
                                                <div className="relative">
                                                    <i className="fat fa-folder-tree absolute left-4 top-4 text-teal-500/50"></i>
                                                    <input type="text" value={formData.category || ''} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Alkoller, Sarf" list="categoryList" />
                                                    <datalist id="categoryList">
                                                        {categories.map(c => <option key={c} value={c} />)}
                                                    </datalist>
                                                </div>
                                            </div>
                                        </div>
<<<<<<< HEAD
                                        <div>
                                            <label className="block text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2 px-1">Stok Doğası (Zorunlu)</label>
                                            <div className="relative">
                                                <i className="fat fa-shapes absolute left-4 top-4 text-teal-500/50"></i>
                                                <select required value={formData.stockNature} onChange={(e) => setFormData({ ...formData, stockNature: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-700/50 rounded-2xl text-teal-800 dark:text-teal-300 font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                    <option value="raw_material">Hammadde</option>
                                                    <option value="traded_good">Ticari Mal</option>
                                                    <option value="semi_finished">Yarı Mamul</option>
                                                    <option value="consumable">Sarf Malzemesi</option>
                                                    <option value="packaging">Ambalaj</option>
                                                </select>
                                                <i className="fat fa-chevron-down absolute right-4 top-4 text-teal-400 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Grubu</label>
                                            <div className="relative">
                                                <i className="fat fa-folder-tree absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" value={formData.stockGroup || ''} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Alkoller, Sarf, Meşrubat" list="categoryList" />
                                                <datalist id="categoryList">
                                                    {categories.map(c => <option key={c} value={c} />)}
                                                </datalist>
=======

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Kodu</label>
                                                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold uppercase font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" />
>>>>>>> upstream/server
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Barkod</label>
                                                <input type="text" value={formData.barcode || ''} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Doğası (Nature)</label>
                                                <select value={formData.stockNature} onChange={(e) => setFormData({ ...formData, stockNature: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                    <option value="raw_material">Hammadde</option>
                                                    <option value="traded_good">Ticari Mal (Al-Sat)</option>
                                                    <option value="semi_finished">Yarı Mamul</option>
                                                    <option value="consumable">Sarf Malzeme</option>
                                                    <option value="packaging">Paketleme</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Grubu</label>
                                                <input type="text" value={formData.stockGroup || ''} onChange={(e) => setFormData({ ...formData, stockGroup: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Viski" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Alt Grup</label>
                                                <input type="text" value={formData.stockSubgroup || ''} onChange={(e) => setFormData({ ...formData, stockSubgroup: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Single Malt" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Marka</label>
                                                <input type="text" value={formData.brand || ''} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Glenfiddich" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                            <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 accent-emerald-500" id="activeCheck" />
                                            <label htmlFor="activeCheck" className="text-xs font-black text-emerald-600 uppercase tracking-widest cursor-pointer">Stok Kartı Aktif / Kullanımda</label>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Alt Grup</label>
                                            <div className="relative">
                                                <i className="fat fa-folder absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" value={formData.stockSubgroup || ''} onChange={(e) => setFormData({ ...formData, stockSubgroup: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Alt grup..." />
                                            </div>
                                        </div>
                                    </div>
<<<<<<< HEAD
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Kodu</label>
                                            <div className="relative">
                                                <i className="fat fa-barcode-read absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold uppercase font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: ALK-0001" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">SKU / Ref. Kodu</label>
                                            <div className="relative">
                                                <i className="fat fa-hashtag absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Referans kodu..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Marka</label>
                                            <div className="relative">
                                                <i className="fat fa-award absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" value={formData.brand || ''} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Marka adı..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Barkod</label>
                                            <div className="relative">
                                                <i className="fat fa-barcode absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" value={formData.barcode || ''} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Barkod okutun..." />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Para Birimi</label>
                                            <div className="relative">
                                                <i className="fat fa-coins absolute left-4 top-4 text-teal-500/50"></i>
                                                <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                    <option value="TRY">TRY (₺)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                </select>
                                                <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
=======
                                )}
>>>>>>> upstream/server

                                {activeTab === 'stock' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-teal-600">Takip Birimi (Base Unit)</label>
                                                <select value={formData.baseUnit} onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })} className="w-full px-4 py-3.5 bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-700 rounded-2xl text-teal-800 dark:text-teal-300 font-bold outline-none appearance-none">
                                                    {unitOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Alış Birimi (Purchase Unit)</label>
                                                <input type="text" value={formData.purchaseUnit || ''} onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold transition-shadow" placeholder="şişe, koli..." />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Dönüşüm (1 Alış = ? Takip)</label>
                                                <input type="number" step="0.0001" value={formData.conversionRate} onChange={(e) => setFormData({ ...formData, conversionRate: parseFloat(e.target.value) || 1 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                        </div>
<<<<<<< HEAD
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Dönüşüm Çarpanı</label>
                                            <div className="relative">
                                                <input type="number" step="0.0001" disabled={!formData.purchaseUnit} value={formData.conversionRate} onChange={(e) => setFormData({ ...formData, conversionRate: parseFloat(e.target.value) || 1 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow disabled:opacity-50" />
                                            </div>
                                            {formData.purchaseUnit && (
                                                <p className="text-[9px] text-indigo-500 mt-1.5 px-1 font-bold bg-indigo-50 dark:bg-indigo-900/20 py-1 rounded">1 {formData.purchaseUnit} = {formData.conversionRate} {formData.baseUnit}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Birim Maliyet (₺ / {formData.baseUnit || 'Birim'})</label>
                                            <div className="relative">
                                                <i className="fat fa-money-bill absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="number" step="0.0001" required value={formData.costPerBaseUnit} onChange={(e) => setFormData({ ...formData, costPerBaseUnit: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0.0000" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Son Alış Fiyatı</label>
                                            <div className="relative">
                                                <i className="fat fa-receipt absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="number" step="0.0001" value={formData.lastPurchasePrice} onChange={(e) => setFormData({ ...formData, lastPurchasePrice: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0.0000" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KDV Oranı (%)</label>
                                            <div className="relative">
                                                <i className="fat fa-percent absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="number" step="1" value={formData.purchaseVat} onChange={(e) => setFormData({ ...formData, purchaseVat: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Min. Stok Uyarı ({formData.baseUnit})</label>
                                            <div className="relative">
                                                <i className="fat fa-bell absolute left-4 top-4 text-amber-500/50"></i>
                                                <input type="number" step="1" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow" placeholder="0" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Envanter & Ekstra */}
                                <div>
                                    <h4 className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <i className="fat fa-sliders"></i> Envanter & Ek Ayarlar
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kritik Stok</label>
                                            <div className="relative">
                                                <i className="fat fa-triangle-exclamation absolute left-4 top-4 text-amber-500/50"></i>
                                                <input type="number" step="1" value={formData.criticalStock} onChange={(e) => setFormData({ ...formData, criticalStock: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Maks. Stok</label>
                                            <div className="relative">
                                                <i className="fat fa-arrow-up-to-line absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="number" step="1" value={formData.maxStock} onChange={(e) => setFormData({ ...formData, maxStock: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Raf Bilgisi</label>
                                            <div className="relative">
                                                <i className="fat fa-shelves absolute left-4 top-4 text-teal-500/50"></i>
                                                <input type="text" value={formData.shelf || ''} onChange={(e) => setFormData({ ...formData, shelf: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Raf A-01..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Varsayılan Depo</label>
                                            <div className="relative">
                                                <select value={formData.warehouseId || ''} onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                    <option value="">Depo Seçilmedi (Genel)</option>
=======

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-amber-600">Min. Stok Seviyesi</label>
                                                <input type="number" value={formData.minStockLevel} onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Maks. Stok Seviyesi</label>
                                                <input type="number" value={formData.maxStockLevel} onChange={(e) => setFormData({ ...formData, maxStockLevel: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Varsayılan Depo</label>
                                                <select value={formData.warehouseId || ''} onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold appearance-none">
                                                    <option value="">Depo Seçilmedi</option>
>>>>>>> upstream/server
                                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                </select>
                                            </div>
<<<<<<< HEAD
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Çıktı Profili (Yazıcı)</label>
                                            <div className="relative">
                                                <i className="fat fa-route absolute left-4 top-4 text-teal-500/50"></i>
                                                <select value={formData.outputProfileId || ''} onChange={(e) => setFormData({ ...formData, outputProfileId: e.target.value ? parseInt(e.target.value) : null })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                    <option value="">Varsayılanı Kullan</option>
                                                    {outputProfiles.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                                                </select>
                                                <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Durum & İleri Takip */}
                                    <div className="mt-6">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">DURUM & İLERİ ENVANTER TAKİP</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[
                                                { key: 'isActive', label: 'Aktif Kart', icon: 'fa-check', color: 'emerald' },
                                                { key: 'stockTrackingEnabled', label: 'Stok Takibi', icon: 'fa-chart-line', color: 'teal' },
                                                { key: 'lotTracking', label: 'Lot Takibi', icon: 'fa-layer-group', color: 'blue' },
                                                { key: 'batchTracking', label: 'Parti Takibi', icon: 'fa-boxes-stacked', color: 'indigo' },
                                                { key: 'expiryTracking', label: 'SKT Takibi', icon: 'fa-calendar-clock', color: 'amber' },
                                                { key: 'serialTracking', label: 'Seri No Takibi', icon: 'fa-fingerprint', color: 'purple' },
                                            ].map(toggle => {
                                                const val = (formData as any)[toggle.key];
                                                return (
                                                    <div key={toggle.key}
                                                        onClick={() => setFormData({ ...formData, [toggle.key]: !val })}
                                                        className={`cursor-pointer flex items-center p-3 rounded-xl border-2 transition-all duration-300 ${val ? `bg-${toggle.color}-50 border-${toggle.color}-500 dark:bg-${toggle.color}-500/10` : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}
                                                    >
                                                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-colors ${val ? `bg-white text-${toggle.color}-600` : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                                            <i className={`fat ${toggle.icon} text-xs`}></i>
                                                        </div>
                                                        <span className={`ml-3 text-xs font-black tracking-tight ${val ? `text-${toggle.color}-900 dark:text-${toggle.color}-400` : 'text-slate-500'}`}>{toggle.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kısa Not</label>
                                        <textarea
                                            value={formData.note || ''}
                                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                            rows={2}
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow resize-none"
                                            placeholder="Gerekirse not ekleyin..."
                                        ></textarea>
=======
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">SKU / Referans No</label>
                                                <input type="text" value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'extra' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KDV Oranı (%)</label>
                                                <input type="number" value={formData.purchaseVat} onChange={(e) => setFormData({ ...formData, purchaseVat: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Son Alış Fiyatı (Net)</label>
                                                <input type="number" step="0.0001" value={formData.lastPurchasePrice} onChange={(e) => setFormData({ ...formData, lastPurchasePrice: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ortalama Maliyet</label>
                                                <input type="number" step="0.0001" value={formData.averageCost} onChange={(e) => setFormData({ ...formData, averageCost: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ana Tedarikçi</label>
                                                <input type="text" value={formData.primaryVendor || ''} onChange={(e) => setFormData({ ...formData, primaryVendor: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-blue-600">Yazıcı Profili</label>
                                                <select value={formData.outputProfileId || ''} onChange={(e) => setFormData({ ...formData, outputProfileId: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-4 py-3.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700 rounded-2xl text-blue-800 dark:text-blue-300 font-bold appearance-none">
                                                    <option value="">Profil Seçilmedi (Varsayılan)</option>
                                                    {outputProfiles.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kısa Not / Açıklama</label>
                                            <textarea value={formData.note || ''} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={3} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold resize-none"></textarea>
                                        </div>
>>>>>>> upstream/server
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex gap-3 justify-end items-center">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 rounded-2xl font-black text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm transition-all">
                                {tc('cancel')}
                            </button>
                            <button type="submit" form="stockCardForm" className="px-10 py-3.5 rounded-2xl font-black text-sm text-white bg-teal-600 hover:bg-teal-500 border border-teal-500 shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center gap-2">
                                <i className="fat fa-floppy-disk"></i> {tc('save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
