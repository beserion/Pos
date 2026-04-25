'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import { useParameters } from '@/app/[locale]/utils/useParameters';
import SearchableSelect from '@/components/SearchableSelect';

interface StockCard {
    id: number;
    name: string;
    code: string;
    barcode?: string;
    category?: string;
    stockGroup?: string;
    stockSubgroup?: string;
    brand?: string;
    baseUnit: string;
    purchaseUnit?: string;
    conversionRate: number;
    costPerBaseUnit: number;
    currentStock: number;
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
    note?: string;
    stockGroupId?: number | null;
    stockGroupRelation?: StockGroup;
}

interface StockGroup {
    id: number;
    name: string;
    description?: string;
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
    const { params } = useParameters();
    const availableTaxRates = params.available_tax_rates ? params.available_tax_rates.split(',').map(r => r.trim()).filter(r => r) : ['20', '0', '1', '10'];

    const [stockCards, setStockCards] = useState<StockCard[]>([]);
    const [filteredCards, setFilteredCards] = useState<StockCard[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [kpiFilter, setKpiFilter] = useState<'all' | 'active' | 'lowStock' | 'zeroStock'>('all');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [outputProfiles, setOutputProfiles] = useState<OutputProfile[]>([]);
    const [stockGroups, setStockGroups] = useState<StockGroup[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
    const [selectedStockCardForMovements, setSelectedStockCardForMovements] = useState<StockCard | null>(null);
    const [movements, setMovements] = useState<any[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(false);
    const [groupFormData, setGroupFormData] = useState<Partial<StockGroup>>({ name: '', description: '' });
    const [activeTab, setActiveTab] = useState<'general' | 'stock' | 'extra'>('general');
    const [formData, setFormData] = useState<StockCard>({
        id: 0,
        name: '',
        code: '',
        barcode: '',
        category: '',
        stockGroup: '',
        stockSubgroup: '',
        brand: '',
        baseUnit: 'adet',
        purchaseUnit: '',
        conversionRate: 1,
        costPerBaseUnit: 0,
        currentStock: 0,
        minStockLevel: 0,
        maxStockLevel: 0,
        isActive: true,
        warehouseId: null,
        stockNature: 'traded_good',
        primaryVendor: '',
        purchaseVat: 20,
        lastPurchasePrice: 0,
        averageCost: 0,
        sku: '',
        outputProfileId: null,
        note: '',
        stockGroupId: null
    });

    useEffect(() => {
        if (user?.token) {
            fetchData();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [cardsRes, catRes, whRes, opRes, groupsRes] = await Promise.all([
                axios.get(`${API_URL}/stock-cards?limit=1000`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/stock-cards/categories`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/warehouses`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/output-profiles`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/stock-groups`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] }))
            ]);

            setStockCards(cardsRes.data.data || []);
            setFilteredCards(cardsRes.data.data || []);
            setCategories(catRes.data || []);
            setWarehouses(whRes.data || []);
            setOutputProfiles(opRes.data || []);
            setStockGroups(groupsRes.data || []);
        } catch (error) {
            console.error('Error fetching stock cards', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async (stockCard: StockCard) => {
        if (!user?.token) return;
        setSelectedStockCardForMovements(stockCard);
        setMovementsLoading(true);
        setIsMovementsModalOpen(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const res = await axios.get(`${API_URL}/stock-movements?stockCardId=${stockCard.id}&limit=100`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMovements(res.data.data || []);
        } catch (error) {
            console.error('Error fetching movements', error);
            showSwal({ title: tc('error'), text: 'Hareketler yüklenemedi.', icon: 'error' });
        } finally {
            setMovementsLoading(false);
        }
    };

    const translateMovementType = (type: string) => {
        const types: Record<string, string> = {
            'COUNT_SURPLUS': 'Sayım Fazlası',
            'COUNT_DEFICIT': 'Sayım Eksiği',
            'RECIPE_CONSUME': 'Reçete Tüketimi',
            'recipe_consumption': 'Reçete Tüketimi',
            'direct_sale_consumption': 'Satış Tüketimi',
            'MANUAL_IN': 'Manuel Giriş',
            'MANUAL_OUT': 'Manuel Çıkış',
            'TRANSFER_IN': 'Transfer (Giriş)',
            'TRANSFER_OUT': 'Transfer (Çıkış)',
            'WASTAGE': 'Zayiat / Fire',
            'STAFF_CONSUME': 'Personel Tüketimi',
            'COMPLIMENTARY': 'İkram',
            'PURCHASE': 'Alım / Giriş',
            'SALE': 'Satış',
            'RETURN_IN': 'İade Girişi',
            'return_in': 'İade Girişi'
        };
        return types[type] || type;
    };

    const handlePrintMovements = () => {
        if (!selectedStockCardForMovements || movements.length === 0) return;

        const rows = movements.map((m, idx) => {
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
            const isPositive = m.quantity > 0;
            const color = isPositive ? '#059669' : (m.quantity < 0 ? '#dc2626' : '#475569');
            const typeLabel = translateMovementType(m.movementType);

            return `
            <tr style="background:${rowBg};border-bottom:0.5px solid #e2e8f0;">
                <td style="padding:3px 6px;text-align:center;font-size:7.5px;white-space:nowrap;">${new Date(m.createdAt).toLocaleDateString('tr-TR')} <span style="font-size:7px;color:#94a3b8;margin-left:4px;">${new Date(m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></td>
                <td style="padding:3px 6px;text-align:center;font-weight:900;font-size:7.5px;color:#1e293b;">${typeLabel}</td>
                <td style="padding:3px 6px;text-align:right;font-weight:900;font-size:8.5px;color:${color}">${isPositive ? '+' : ''}${Number(m.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} <span style="font-size:6px;color:#94a3b8;margin-left:2px;font-weight:700;">${selectedStockCardForMovements.baseUnit}</span></td>
                <td style="padding:3px 6px;text-align:right;font-weight:900;font-size:8.5px;color:#1e293b;">${Number(m.stockAfter).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} <span style="font-size:6px;color:#94a3b8;margin-left:2px;font-weight:700;">${selectedStockCardForMovements.baseUnit}</span></td>
                <td style="padding:3px 6px;text-align:center;font-size:7.5px;font-weight:700;">${m.warehouse?.name || '-'}</td>
                <td style="padding:3px 6px;font-size:7.5px;color:#64748b;line-height:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px;">${m.description || '-'}</td>
            </tr>`;
        }).join('');

        const printContent = `
        <html><head>
            <meta charset="UTF-8"/>
            <title>Stok Hareket Raporu - ${selectedStockCardForMovements.name}</title>
            <style>
                * { box-sizing:border-box; margin:0; padding:0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                body { padding:10px; color:#1e293b; background: white; width: 100%; }
                @media print { body { padding:0; } @page { margin:5mm 8mm; size:A4 portrait; } }
                .report-header { border:1px solid #1e293b; border-radius:4px; padding:8px 12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
                table { width:100%; border-collapse:collapse; margin-top:5px; table-layout: fixed; }
                th { background:#1e293b; color:white; padding:4px 6px; text-transform:uppercase; font-size:7px; font-weight:900; letter-spacing:0.05em; text-align:center; }
                .footer { margin-top:15px; padding-top:5px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; font-size:6.5px; color:#94a3b8; font-weight:700; }
            </style>
        </head><body>
            <div class="report-header">
                <div>
                    <div style="font-size:6px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px;">POSNETX › ENVANTER YÖNETİMİ</div>
                    <h1 style="font-size:13px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.01em;">STOK HAREKET RAPORU</h1>
                    <div style="margin-top:3px;display:flex;gap:10px;align-items:center;">
                        <span style="font-size:9px;font-weight:900;color:#4f46e5;">${selectedStockCardForMovements.name}</span>
                        <span style="font-size:7px;font-weight:700;color:#64748b;background:#f1f5f9;padding:1px 4px;border-radius:3px;border:1px solid #e2e8f0;">${selectedStockCardForMovements.code}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:8px;font-weight:900;color:#1e293b;">Tarih: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style="font-size:7px;font-weight:700;color:#64748b;margin-top:1px;">Toplam Hareket: ${movements.length} kalem</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width:80px;">Tarih / Saat</th>
                        <th style="width:90px;">İşlem Tipi</th>
                        <th style="width:60px;text-align:right;">Miktar</th>
                        <th style="width:60px;text-align:right;">Sonuç Stok</th>
                        <th style="width:90px;">Depo</th>
                        <th>Açıklama / Not Detayı</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <div class="footer">
                <div>${selectedStockCardForMovements.name} — Tüm Hareket Kayıtları</div>
                <div>POSNetX Bulut ERP Sistemi &nbsp;|&nbsp; Yazdırma: ${new Date().toLocaleString('tr-TR')}</div>
            </div>
        </body></html>`;

        const printWin = window.open('', '_blank', 'width=1000,height=800');
        if (printWin) {
            printWin.document.write(printContent);
            printWin.document.close();
            printWin.onload = () => {
                printWin.focus();
                setTimeout(() => {
                    printWin.print();
                    printWin.close();
                }, 250);
            };
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        let filtered = stockCards.filter(c => {
            const matchSearchAndCategory = (selectedCategory === '' || c.category === selectedCategory) &&
                (
                    c.name.toLowerCase().includes(lowerQuery) ||
                    c.code.toLowerCase().includes(lowerQuery) ||
                    (c.barcode && c.barcode.toLowerCase().includes(lowerQuery)) ||
                    (c.category && c.category.toLowerCase().includes(lowerQuery))
                );

            if (!matchSearchAndCategory) return false;

            if (kpiFilter === 'active' && !c.isActive) return false;

            if (kpiFilter === 'lowStock') {
                const isLowStock = c.isActive && c.currentStock <= c.minStockLevel && c.minStockLevel > 0;
                if (!isLowStock) return false;
            }

            if (kpiFilter === 'zeroStock') {
                const isZeroStock = c.isActive && c.currentStock <= 0;
                if (!isZeroStock) return false;
            }

            return true;
        });

        if (sortConfig !== null) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: any = '';
                let bValue: any = '';

                switch (sortConfig.key) {
                    case 'code':
                        aValue = a.code;
                        bValue = b.code;
                        break;
                    case 'group':
                        aValue = a.stockGroupRelation?.name || a.category || '';
                        bValue = b.stockGroupRelation?.name || b.category || '';
                        break;
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'unit':
                        aValue = a.baseUnit;
                        bValue = b.baseUnit;
                        break;
                    case 'stock':
                        aValue = a.currentStock;
                        bValue = b.currentStock;
                        break;
                    case 'cost':
                        aValue = a.costPerBaseUnit;
                        bValue = b.costPerBaseUnit;
                        break;
                }

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue, 'tr')
                        : bValue.localeCompare(aValue, 'tr');
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredCards(filtered);
    }, [searchQuery, selectedCategory, stockCards, sortConfig, kpiFilter]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            const payload = { ...formData };
            if (!payload.warehouseId) payload.warehouseId = null;

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

    const handleGroupSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (groupFormData.id) {
                await axios.put(`${API_URL}/stock-groups/${groupFormData.id}`, groupFormData, config);
            } else {
                await axios.post(`${API_URL}/stock-groups`, groupFormData, config);
            }
            setGroupFormData({ name: '', description: '' });
            fetchData();
        } catch (error: any) {
            console.error('Error saving stock group', error);
            showSwal({ title: 'Hata', text: 'Grup kaydedilemedi.', icon: 'error' });
        }
    };

    const handleGroupDelete = async (id: number) => {
        if (!user?.token) return;
        const result = await showSwal({
            title: 'Silmek istediğinize emin misiniz?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet',
            cancelButtonText: 'Hayır'
        });
        if (result.isConfirmed) {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API_URL}/stock-groups/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                fetchData();
            } catch (error: any) {
                console.error('Error deleting stock group', error);
                const errorMessage = error?.response?.data?.message || 'Grup silinemedi.';
                showSwal({ title: 'Hata', text: errorMessage, icon: 'error' });
            }
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
                if (error?.response?.status !== 400) {
                    console.error('Error deleting stock card', error);
                }
                showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('deleteError'), icon: 'error' });
            }
        }
    };

    const generateStockCode = (categoryName: string) => {
        if (!categoryName) return '';
        const prefix = categoryName.substring(0, 3).toLocaleUpperCase('tr');
        const sameCategoryCodes = stockCards
            .filter(c => c.code && c.code.toLocaleUpperCase('tr').startsWith(prefix))
            .map(c => {
                const numPart = c.code.substring(prefix.length);
                return parseInt(numPart) || 0;
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
        setFormData({ ...formData, category: val, code: newCode });
    };

    const openModal = (card?: StockCard) => {
        setActiveTab('general');
        const hasRecipeLicense = hasFeature('recipe_system');
        if (card) {
            const updatedCard = { ...card };
            if (!hasRecipeLicense) {
                updatedCard.stockNature = 'traded_good';
                updatedCard.baseUnit = 'adet';
            }
            setFormData(updatedCard);
        } else {
            const defaultVat = availableTaxRates.length > 0 ? parseFloat(availableTaxRates[0]) : 20;
            setFormData({
                id: 0,
                name: '',
                code: '',
                barcode: '',
                category: '',
                stockGroup: '',
                stockSubgroup: '',
                brand: '',
                baseUnit: 'adet',
                purchaseUnit: '',
                conversionRate: 1,
                costPerBaseUnit: 0,
                currentStock: 0,
                minStockLevel: 0,
                maxStockLevel: 0,
                isActive: true,
                warehouseId: null,
                stockNature: 'traded_good',
                primaryVendor: '',
                purchaseVat: defaultVat,
                lastPurchasePrice: 0,
                averageCost: 0,
                sku: '',
                outputProfileId: null,
                note: '',
                stockGroupId: null
            });
        }
        setIsModalOpen(true);
    };

    // KPI Hesaplamaları
    const totalCards = stockCards.length;
    const activeCards = stockCards.filter(c => c.isActive).length;
    const lowStockCards = stockCards.filter(c => c.isActive && c.currentStock <= c.minStockLevel && c.minStockLevel > 0).length;
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
            <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
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
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Stok Takip Yönetimi</h5>
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
                        <div className="relative w-48">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                                <i className="fat fa-filter"></i>
                            </div>
                            <div className="-m-2 w-[calc(100%+16px)]">
                                <SearchableSelect
                                    value={selectedCategory}
                                    onChange={(val) => setSelectedCategory(val.toString())}
                                    options={[
                                        { value: '', label: 'Tüm Kategoriler' },
                                        ...categories.map(c => ({ value: c, label: c }))
                                    ]}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(`/${locale}/inventory/count`)}
                            className="px-6 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-list-check text-lg"></i> Sayım Ekranı
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/inventory/movements`)}
                            className="px-6 py-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-exchange text-lg"></i> Stok Hareketleri
                        </button>
                        <button onClick={() => setIsGroupModalOpen(true)} className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-folder-tree text-lg"></i>Gruplar
                        </button>
                        <button onClick={() => openModal()} className="px-6 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Kart
                        </button>
                        <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    <button onClick={() => setKpiFilter('all')} className={`text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[42px] border flex items-center justify-between transition-all outline-none ${kpiFilter === 'all' ? 'border-slate-400 dark:border-slate-500 shadow-md transform scale-[1.02]' : 'border-white dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 opacity-70 hover:opacity-100'}`}>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors ${kpiFilter === 'all' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>Toplam Kart</p>
                            <h3 className={`text-3xl font-black transition-colors ${kpiFilter === 'all' ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{totalCards}</h3>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${kpiFilter === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            <i className="fat fa-boxes-stacked text-3xl"></i>
                        </div>
                    </button>
                    <button onClick={() => setKpiFilter(prev => prev === 'active' ? 'all' : 'active')} className={`text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[42px] border flex items-center justify-between transition-all outline-none ${kpiFilter === 'active' ? 'border-teal-400 dark:border-teal-500 shadow-md shadow-teal-500/10 transform scale-[1.02]' : 'border-white dark:border-slate-700/50 hover:border-teal-300 dark:hover:border-teal-500/50 opacity-70 hover:opacity-100'}`}>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors ${kpiFilter === 'active' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>Aktif Kartlar</p>
                            <h3 className={`text-3xl font-black transition-colors ${kpiFilter === 'active' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>{activeCards}</h3>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${kpiFilter === 'active' ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' : 'bg-teal-50/50 dark:bg-teal-900/10 text-teal-500/60 dark:text-teal-500/50'}`}>
                            <i className="fat fa-check-circle text-3xl"></i>
                        </div>
                    </button>
                    <button onClick={() => setKpiFilter(prev => prev === 'lowStock' ? 'all' : 'lowStock')} className={`text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[42px] border flex items-center justify-between transition-all outline-none ${kpiFilter === 'lowStock' ? 'border-amber-400 dark:border-amber-500 shadow-md shadow-amber-500/10 transform scale-[1.02]' : 'border-white dark:border-slate-700/50 hover:border-amber-300 dark:hover:border-amber-500/50 opacity-70 hover:opacity-100'}`}>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors ${kpiFilter === 'lowStock' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>Kritik Stok</p>
                            <h3 className={`text-3xl font-black transition-colors ${kpiFilter === 'lowStock' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>{lowStockCards}</h3>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${kpiFilter === 'lowStock' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400' : 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-500/60 dark:text-amber-500/50'}`}>
                            <i className="fat fa-triangle-exclamation text-3xl"></i>
                        </div>
                    </button>
                    <button onClick={() => setKpiFilter(prev => prev === 'zeroStock' ? 'all' : 'zeroStock')} className={`text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[42px] border flex items-center justify-between transition-all outline-none ${kpiFilter === 'zeroStock' ? 'border-rose-400 dark:border-rose-500 shadow-md shadow-rose-500/10 transform scale-[1.02]' : 'border-white dark:border-slate-700/50 hover:border-rose-300 dark:hover:border-rose-500/50 opacity-70 hover:opacity-100'}`}>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors ${kpiFilter === 'zeroStock' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>Tükenen</p>
                            <h3 className={`text-3xl font-black transition-colors ${kpiFilter === 'zeroStock' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>{zeroStockCards}</h3>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${kpiFilter === 'zeroStock' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400' : 'bg-rose-50/50 dark:bg-rose-900/10 text-rose-500/60 dark:text-rose-500/50'}`}>
                            <i className="fat fa-boxes-packing text-3xl"></i>
                        </div>
                    </button>
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
                                        <th onClick={() => handleSort('code')} className="cursor-pointer group px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center rounded-tl-[40px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                                            KOD / BARKOD
                                            <i className={`fat ${sortConfig?.key === 'code' ? (sortConfig.direction === 'asc' ? 'fa-sort-up text-teal-500' : 'fa-sort-down text-teal-500') : 'fa-sort opacity-0 group-hover:opacity-40'} ml-2 transition-all`}></i>
                                        </th>
                                        <th onClick={() => handleSort('group')} className="cursor-pointer group px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            STOK GRUPLARI
                                            <i className={`fat ${sortConfig?.key === 'group' ? (sortConfig.direction === 'asc' ? 'fa-sort-up text-teal-500' : 'fa-sort-down text-teal-500') : 'fa-sort opacity-0 group-hover:opacity-40'} ml-2 transition-all`}></i>
                                        </th>
                                        <th onClick={() => handleSort('name')} className="cursor-pointer group px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            STOK ADI
                                            <i className={`fat ${sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? 'fa-sort-up text-teal-500' : 'fa-sort-down text-teal-500') : 'fa-sort opacity-0 group-hover:opacity-40'} ml-2 transition-all`}></i>
                                        </th>
                                        <th onClick={() => handleSort('unit')} className="cursor-pointer group px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none selection:bg-transparent">
                                            BİRİMLER (TEMEL / ALIŞ)
                                            <i className={`fat ${sortConfig?.key === 'unit' ? (sortConfig.direction === 'asc' ? 'fa-sort-up text-teal-500' : 'fa-sort-down text-teal-500') : 'fa-sort opacity-0 group-hover:opacity-40'} ml-2 transition-all`}></i>
                                        </th>
                                        <th onClick={() => handleSort('stock')} className="cursor-pointer group px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none selection:bg-transparent">
                                            GÜNCEL STOK
                                            <i className={`fat ${sortConfig?.key === 'stock' ? (sortConfig.direction === 'asc' ? 'fa-sort-up text-teal-500' : 'fa-sort-down text-teal-500') : 'fa-sort opacity-0 group-hover:opacity-40'} ml-2 transition-all`}></i>
                                        </th>
                                        <th onClick={() => handleSort('cost')} className="cursor-pointer group px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none selection:bg-transparent">
                                            BİRİM MALİYET
                                            <i className={`fat ${sortConfig?.key === 'cost' ? (sortConfig.direction === 'asc' ? 'fa-sort-up text-teal-500' : 'fa-sort-down text-teal-500') : 'fa-sort opacity-0 group-hover:opacity-40'} ml-2 transition-all`}></i>
                                        </th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right rounded-tr-[40px] pointer-events-none">
                                            İŞLEMLER
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filteredCards.map(card => {
                                        const isLowStock = card.currentStock <= card.minStockLevel && card.minStockLevel > 0;
                                        const isOutOfStock = card.currentStock <= 0;

                                        return (
                                            <tr key={card.id} className={`hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-all group ${!card.isActive ? 'opacity-50' : ''}`}>
                                                <td className="px-8 py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block w-max">
                                                            {card.code}
                                                        </span>
                                                        {card.barcode && (
                                                            <span className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1">
                                                                <i className="fat fa-barcode opacity-50"></i> {card.barcode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex justify-center">
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <i className="fat fa-folder-tree text-teal-500 text-[10px]"></i>
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                                {card.stockGroupRelation?.name || card.category || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="text-center">
                                                        <p className="font-extrabold text-slate-800 dark:text-white tracking-tight leading-none text-base mb-1">{card.name}</p>
                                                        {!card.isActive && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full inline-block">Pasif</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center justify-center">
                                                        {card.purchaseUnit ? (
                                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-[150px]">
                                                                <div className="text-right">
                                                                    <span className="text-[11px] font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded border border-teal-100 dark:border-teal-500/20 whitespace-nowrap">
                                                                        {card.conversionRate} {card.baseUnit}
                                                                    </span>
                                                                </div>
                                                                <i className="fat fa-arrow-right-arrow-left text-slate-300 text-[10px]"></i>
                                                                <div className="text-left">
                                                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">
                                                                        {card.purchaseUnit}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded border border-teal-100 dark:border-teal-500/20">
                                                                {card.baseUnit}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex justify-center">
                                                        <div className={`inline-flex items-baseline gap-1.5 ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            <span className="text-lg font-black tracking-tighter">
                                                                {Number(card.currentStock).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] font-bold uppercase opacity-60 tracking-widest">{card.baseUnit}</span>

                                                            {isLowStock && !isOutOfStock && <i className="fat fa-triangle-exclamation text-xs ml-1" title={`Kritik seviye: ${card.minStockLevel}`}></i>}
                                                            {isOutOfStock && <i className="fat fa-ban text-xs ml-1"></i>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="text-center">
                                                        <div className="font-bold text-slate-600 dark:text-slate-400">
                                                            ₺{Number(card.costPerBaseUnit).toFixed(4)} <span className="text-[10px] opacity-50 uppercase">/{card.baseUnit}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex gap-2 justify-end transition-all">
                                                        <button onClick={() => fetchMovements(card)} className="w-9 h-9 bg-white dark:bg-slate-800 text-indigo-500 hover:text-white hover:bg-indigo-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center shadow-indigo-500/5 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95" title="Stok Hareketleri">
                                                            <i className="fat fa-history text-sm"></i>
                                                        </button>
                                                        <button onClick={() => openModal(card)} className="w-9 h-9 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center shadow-blue-500/5 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95" title="Düzenle">
                                                            <i className="fat fa-pen-field text-sm"></i>
                                                        </button>
                                                        <button onClick={() => handleDelete(card.id)} className="w-9 h-9 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center shadow-red-500/5 hover:shadow-lg hover:shadow-red-500/20 active:scale-95" title="Sil">
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col h-[830px] max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-teal-600`}></i>
                                    {formData.id === 0 ? 'YENİ STOK KARTI' : 'STOK KARTINI DÜZENLE'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Stok kartı tanımlama detayları</p>
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
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Adı</label>
                                                <div className="relative">
                                                    <i className="fat fa-box absolute left-4 top-4 text-teal-500/50"></i>
                                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Örn: Su 0.5 lt" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="justify-between flex text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Grubu <a href="#" onClick={() => setIsGroupModalOpen(true)} className="text-teal-600 hover:text-teal-800 ml-2"><i className="fat fa-plus-circle"></i> Stok Grubu Ekle</a></label>
                                                <div className="-m-2 w-full">
                                                    <SearchableSelect
                                                        value={formData.stockGroupId || ''}
                                                        onChange={(val) => {
                                                            const groupId = val ? parseInt(val.toString()) : null;
                                                            const group = stockGroups.find(g => g.id === groupId);
                                                            if (group) {
                                                                const newCode = generateStockCode(group.name);
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    stockGroupId: groupId,
                                                                    category: group.name,
                                                                    code: newCode
                                                                }));
                                                            } else {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    stockGroupId: null,
                                                                    category: ''
                                                                }));
                                                            }
                                                        }}
                                                        options={[
                                                            { value: '', label: 'Grup Seçiniz' },
                                                            ...stockGroups.map(g => ({ value: g.id, label: g.name }))
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>


                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Kodu</label>
                                                <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold uppercase font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Barkod</label>
                                                <input type="text" value={formData.barcode || ''} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Doğası (Nature)</label>
                                                <div className="-m-2 w-full">
                                                    <SearchableSelect
                                                        value={formData.stockNature}
                                                        onChange={(val) => setFormData({ ...formData, stockNature: val.toString() })}
                                                        options={!hasFeature('recipe_system') ? [
                                                            { value: 'traded_good', label: 'Ticari Mal (Al-Sat)' }
                                                        ] : [
                                                            { value: 'raw_material', label: 'Hammadde' },
                                                            { value: 'traded_good', label: 'Ticari Mal (Al-Sat)' },
                                                            { value: 'semi_finished', label: 'Yarı Mamul' },
                                                            { value: 'consumable', label: 'Sarf Malzeme' },
                                                            { value: 'packaging', label: 'Paketleme' }
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KDV Oranı (%)</label>
                                                <div className="-m-2 w-full">
                                                    <SearchableSelect
                                                        value={formData.purchaseVat !== undefined ? formData.purchaseVat.toString() : (availableTaxRates.length > 0 ? availableTaxRates[0].toString() : "0")}
                                                        onChange={(val) => setFormData({ ...formData, purchaseVat: parseFloat(val.toString()) || 0 })}
                                                        options={availableTaxRates.map(rate => ({ value: rate.toString(), label: `% ${rate}` }))}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Alt Grup</label>
                                                <input type="text" value={formData.stockSubgroup || ''} onChange={(e) => setFormData({ ...formData, stockSubgroup: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="..." />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Marka</label>
                                                <input type="text" value={formData.brand || ''} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="..." />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                            <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 accent-emerald-500" id="activeCheck" />
                                            <label htmlFor="activeCheck" className="text-xs font-black text-emerald-600 uppercase tracking-widest cursor-pointer">Stok Kartı Aktif / Kullanımda</label>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kısa Not / Açıklama</label>
                                            <textarea value={formData.note || ''} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={3} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold resize-none"></textarea>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'stock' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-teal-600">Takip Birimi (Base Unit)</label>
                                                <div className="-m-2 w-full">
                                                    <SearchableSelect
                                                        value={formData.baseUnit}
                                                        onChange={(val) => setFormData({ ...formData, baseUnit: val.toString() })}
                                                        options={!hasFeature('recipe_system') ? [
                                                            { value: 'adet', label: 'Adet' }
                                                        ] : unitOptions}
                                                    />
                                                </div>
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
                                                <div className="-m-2 w-full">
                                                    <SearchableSelect
                                                        value={formData.warehouseId?.toString() || ''}
                                                        onChange={(val) => {
                                                            setFormData(prev => ({ ...prev, warehouseId: val ? parseInt(val.toString()) : null }));
                                                        }}
                                                        options={warehouses.map(w => ({ value: w.id.toString(), label: w.name }))}
                                                    />
                                                </div>
                                            </div>
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
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Son Alış Fiyatı (Net)</label>
                                                <input type="number" disabled step="0.0001" value={formData.lastPurchasePrice} onChange={(e) => setFormData({ ...formData, lastPurchasePrice: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-slate-800" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ortalama Maliyet</label>
                                                <input type="number" disabled step="0.0001" value={formData.averageCost} onChange={(e) => setFormData({ ...formData, averageCost: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-slate-800" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ana Tedarikçi</label>
                                                <input type="text" value={formData.primaryVendor || ''} onChange={(e) => setFormData({ ...formData, primaryVendor: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-blue-600">Yazıcı Profili</label>
                                                <div className="-m-2 w-full">
                                                    <SearchableSelect
                                                        value={formData.outputProfileId || ''}
                                                        onChange={(val) => setFormData({ ...formData, outputProfileId: val ? parseInt(val.toString()) : null })}
                                                        options={[
                                                            { value: '', label: 'Profil Seçilmedi (Varsayılan)' },
                                                            ...outputProfiles.map(op => ({ value: op.id, label: op.name }))
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        </div>


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
            {/* Stock Group Management Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-folder-tree text-amber-500"></i> Stok Grupları Yönetimi
                                </h2>
                            </div>
                            <button onClick={() => setIsGroupModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all">&times;</button>
                        </div>

                        <div className="p-8 flex-1 overflow-auto">
                            <form onSubmit={handleGroupSave} className="flex gap-4 mb-8">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Grup Adı (Örn: Meyveler)"
                                        value={groupFormData.name}
                                        onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow"
                                    />
                                </div>
                                <button type="submit" className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                                    {groupFormData.id ? 'GÜNCELLE' : 'EKLE'}
                                </button>
                                {groupFormData.id && (
                                    <button type="button" onClick={() => setGroupFormData({ name: '', description: '' })} className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl">&times;</button>
                                )}
                            </form>

                            <div className="space-y-3">
                                {stockGroups.map(group => (
                                    <div key={group.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50 rounded-2xl group hover:border-amber-500/30 transition-all">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{group.name}</span>
                                        <div className="flex gap-2 opacity-100 group-hover:opacity-100 transition-all">
                                            <button onClick={() => setGroupFormData(group)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-blue-500 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-blue-500 hover:text-white transition-all">
                                                <i className="fat fa-pen-field text-xs"></i>
                                            </button>
                                            <button onClick={() => handleGroupDelete(group.id)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-red-500 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-red-500 hover:text-white transition-all">
                                                <i className="fat fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {stockGroups.length === 0 && (
                                    <div className="p-10 text-center opacity-40">
                                        <i className="fat fa-folder-open text-4xl mb-2"></i>
                                        <p className="text-xs font-bold uppercase tracking-widest">Grup Tanımlanmamış</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Movements Modal */}
            {isMovementsModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-7xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col h-[850px] max-h-[92vh]">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                                    <i className="fat fa-history text-2xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase mb-0 flex items-center gap-2">
                                        STOK HAREKETLERİ: <span className="text-indigo-600 dark:text-indigo-400">{selectedStockCardForMovements?.name}</span>
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 mb-0 flex items-center gap-2">
                                        <i className="fat fa-barcode"></i> {selectedStockCardForMovements?.code} | Stok Geçmişi İzleme
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrintMovements}
                                    title="Raporu Yazdır"
                                    className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                                >
                                    <i className="fat fa-print text-base"></i> Yazdır
                                </button>
                                <button onClick={() => setIsMovementsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm active:scale-90">&times;</button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-8">
                            {movementsLoading ? (
                                <div className="h-full flex flex-col items-center justify-center py-20">
                                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hareketler yükleniyor...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-hidden rounded-[24px] border border-slate-100 dark:border-slate-700">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tarih / Saat</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">İşlem Tipi</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Değişim</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sonuç Stok</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Depo</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                {movements.map((m, idx) => {
                                                    const isPositive = m.quantity > 0;
                                                    const isZero = m.quantity === 0;

                                                    return (
                                                        <tr key={idx} className="hover:bg-indigo-500/5 transition-all">
                                                            <td className="px-6 py-3 text-center">
                                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                    {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                                                                </div>
                                                                <div className="text-[9px] font-black text-slate-400 uppercase">
                                                                    {new Date(m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block ${m.movementType.includes('IN') || m.movementType.includes('SURPLUS') || m.movementType.includes('PURCHASE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                                        m.movementType.includes('OUT') || m.movementType.includes('DEFICIT') || m.movementType.includes('CONSUME') || m.movementType.includes('WASTAGE') ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400' :
                                                                            'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800'
                                                                    }`}>
                                                                    {translateMovementType(m.movementType)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <span className={`text-sm font-black italic ${isPositive ? 'text-emerald-600' : isZero ? 'text-slate-400' : 'text-rose-600'}`}>
                                                                    {isPositive ? '+' : ''}{Number(m.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{selectedStockCardForMovements?.baseUnit}</span>
                                                            </td>
                                                            <td className="px-6 py-3 text-center font-black text-slate-800 dark:text-slate-200">
                                                                {Number(m.stockAfter).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                                                <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{selectedStockCardForMovements?.baseUnit}</span>
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded">
                                                                    {m.warehouse?.name || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <p className="text-[10px] font-bold text-slate-500 leading-tight m-0 truncate max-w-[200px]" title={m.description}>
                                                                    {m.description || '-'}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {movements.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-20 text-center">
                                                            <div className="flex flex-col items-center opacity-40">
                                                                <i className="fat fa-history text-5xl mb-4 text-slate-300"></i>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ürün hareket geçmişi bulunamadı</p>
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

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-end">
                            <button onClick={() => setIsMovementsModalOpen(false)} className="px-8 py-3 rounded-2xl font-black text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest active:scale-95 shadow-sm shadow-indigo-500/10">KAPAT</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
