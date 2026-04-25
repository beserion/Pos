'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import SearchableSelect from '@/components/SearchableSelect';
import { useTranslations, useLocale } from 'next-intl';

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    price: number;
    category: string;
    isActive: boolean;
    printerId?: number | null;
    imageUrl?: string;
    costPrice: number;
    minStockLevel: number;
    unit: string;
    isQuickSale?: boolean;
    isIngredient?: boolean;
    isSet?: boolean;
    productTypeId?: number | null;
    productType?: any;
    outputProfileId?: number | null;
    outputProfile?: any;
    recipes?: { ingredientId: number; ingredientName?: string; quantity: number; unit: string }[];
    modifiers?: Modifier[];
    stockGroup?: string;
    stockGroupId?: number | null;
    variations?: any[];
    vatRate: number;
    inventoryLinkType?: string;
    linkedStockItemId?: number | null;
    directStockQty?: number;
    directStockUnit?: string;
    posVisible?: boolean;
}

interface Modifier {
    id: number;
    name: string;
    groupName?: string;
}

interface StockCard {
    id: number;
    name: string;
    code: string;
    baseUnit: string;
    costPerBaseUnit: number;
    isActive: boolean;
}

interface RecipeLine {
    id?: number;
    stockCardId: number;
    stockCard?: StockCard;
    quantity: number;
    unit: string;
    isRequired: boolean;
    description?: string;
}

interface RecipeHeader {
    id: number;
    productId: number;
    name: string;
    isActive: boolean;
    note: string;
    lines: RecipeLine[];
}

interface Printer {
    id: number;
    name: string;
}



export function PageClient() {
    const t = useTranslations('Products');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user, hasFeature } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [sortField, setSortField] = useState<'name' | 'category' | 'productType' | 'price'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const [outputProfiles, setOutputProfiles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [allModifiers, setAllModifiers] = useState<Modifier[]>([]);
    const [stockCards, setStockCards] = useState<any[]>([]);
    const [recipeHeaders, setRecipeHeaders] = useState<any[]>([]);
    const [stockGroups, setStockGroups] = useState<any[]>([]);
    const [parameters, setParameters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentRecipe, setCurrentRecipe] = useState<RecipeHeader | null>(null);
    const [recipeSummary, setRecipeSummary] = useState<any>(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const hasRecipeLicense = hasFeature('recipe_system');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'genel' | 'gorsel' | 'recete' | 'ozellik' | 'yonlendirme' | 'varyant'>('genel');
    const [formData, setFormData] = useState<Product>({
        id: 0,
        name: '',
        sku: '',
        barcode: '',
        price: 0,
        category: '',
        isActive: true,
        printerId: null,
        costPrice: 0,
        minStockLevel: 0,
        unit: 'piece',
        isQuickSale: true,
        isIngredient: false,
        isSet: false,
        productTypeId: null,
        outputProfileId: null,
        recipes: [],
        modifiers: [],
        stockGroup: '',
        stockGroupId: null,
        variations: [],
        vatRate: 0,
        inventoryLinkType: 'none',
        linkedStockItemId: null,
        directStockQty: 0,
        directStockUnit: 'adet',
        posVisible: true
    });

    const [ingredientProduct, setIngredientProduct] = useState({ ingredientId: 0, quantity: 0, unit: 'adet' });

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
            const [prodRes, printRes, modRes, typesRes, profilesRes, depRes, stocksRes, stockGroupsRes, recipesRes, paramsRes] = await Promise.all([
                axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/printers`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/modifiers`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/product-types`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/output-profiles`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/stock-cards`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/stock-groups`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/recipes`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/parameters`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] }))
            ]);
            setProducts(prodRes.data);
            setFilteredProducts(prodRes.data);
            setPrinters(printRes.data);
            setAllModifiers(modRes.data);
            setProductTypes(typesRes.data);
            setOutputProfiles(profilesRes.data);
            setDepartments(depRes.data);
            setStockCards(Array.isArray(stocksRes.data) ? stocksRes.data : (stocksRes.data?.data || []));
            setStockGroups(Array.isArray(stockGroupsRes.data) ? stockGroupsRes.data : (stockGroupsRes.data?.data || []));
            setRecipeHeaders(Array.isArray(recipesRes.data) ? recipesRes.data : (recipesRes.data?.data || []));
            setParameters(Array.isArray(paramsRes.data) ? paramsRes.data : []);
        } catch (error) {
            console.error('Error fetching data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.sku.toLowerCase().includes(lowerQuery) ||
            p.barcode?.toLowerCase().includes(lowerQuery) ||
            p.category?.toLowerCase().includes(lowerQuery)
        );
        setFilteredProducts(filtered);
    }, [searchQuery, products]);

    const handleSort = (field: 'name' | 'category' | 'productType' | 'price') => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'price') {
            return (a.price - b.price) * dir;
        }
        let aStr = '';
        let bStr = '';
        if (sortField === 'name') {
            aStr = (a.name || '').trim().toLocaleLowerCase('tr');
            bStr = (b.name || '').trim().toLocaleLowerCase('tr');
        } else if (sortField === 'category') {
            aStr = (a.category || '').trim().toLocaleLowerCase('tr');
            bStr = (b.category || '').trim().toLocaleLowerCase('tr');
        } else if (sortField === 'productType') {
            aStr = (productTypes.find(pt => pt.id === a.productTypeId)?.name || '').trim().toLocaleLowerCase('tr');
            bStr = (productTypes.find(pt => pt.id === b.productTypeId)?.name || '').trim().toLocaleLowerCase('tr');
        }
        return aStr.localeCompare(bStr, 'tr') * dir;
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData, price: Number(formData.price), vatRate: Number(formData.vatRate) };

            if (formData.id === 0) {
                const { id, ...postData } = payload;
                await axios.post(`${API_URL}/products`, postData, config);
                toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            } else {
                await axios.put(`${API_URL}/products/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('updated'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving product', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('saveError'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: t('deleteConfirmTitle'),
            text: t('deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API_URL}/products/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('deleted'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error: any) {
                if (error?.response?.status !== 400) {
                    console.error('Error deleting product', error);
                }
                showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('deleteError'), icon: 'error' });
            }
        }
    };

    const handleAddIngredient = () => {
        if (!ingredientProduct.ingredientId || ingredientProduct.quantity <= 0) {
            toastSwal({ title: tc('error'), text: t('validationError'), icon: 'warning' });
            return;
        }

        const ingredient = products.find(p => p.id === ingredientProduct.ingredientId);
        if (!ingredient) return;

        // Check if already added
        if (formData.recipes?.some(r => r.ingredientId === ingredientProduct.ingredientId)) {
            toastSwal({ title: tc('error'), text: 'Bu malzeme zaten eklendi.', icon: 'warning' });
            return;
        }

        setFormData(prev => ({
            ...prev,
            recipes: [...(prev.recipes || []), {
                ingredientId: ingredientProduct.ingredientId,
                ingredientName: ingredient.name,
                quantity: ingredientProduct.quantity,
                unit: ingredientProduct.unit
            }]
        }));

        setIngredientProduct({ ingredientId: 0, quantity: 0, unit: 'adet' });
    };

    const handleRemoveIngredient = (ingredientId: number) => {
        setFormData(prev => ({
            ...prev,
            recipes: prev.recipes?.filter(r => r.ingredientId !== ingredientId) || []
        }));
    };

    const fetchRecipeForProduct = async (productId: number) => {
        if (!user?.token || productId === 0) return;
        setLoadingRecipe(true);
        setCurrentRecipe(null);
        setRecipeSummary(null);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [recipeRes, summaryRes] = await Promise.all([
                axios.get(`${API_URL}/recipes/by-product/${productId}`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: null })),
                axios.get(`${API_URL}/recipes/summary/${productId}`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: null }))
            ]);

            if (recipeRes.data && Array.isArray(recipeRes.data) && recipeRes.data.length > 0) {
                const activeRecipe = recipeRes.data.find((r: any) => r.isActive) || recipeRes.data[0];
                setCurrentRecipe(activeRecipe);
            } else if (recipeRes.data && !Array.isArray(recipeRes.data) && Object.keys(recipeRes.data).length > 0) {
                setCurrentRecipe(recipeRes.data);
            } else {
                setCurrentRecipe({
                    id: 0,
                    productId: productId,
                    name: `${formData.name || ''} Reçetesi`,
                    isActive: true,
                    note: '',
                    lines: []
                });
            }

            if (summaryRes.data) {
                setRecipeSummary(summaryRes.data);
            }
        } catch (error) {
            console.error('Error fetching recipe details', error);
        } finally {
            setLoadingRecipe(false);
        }
    };

    const handleAddRecipeLine = () => {
        if (!currentRecipe) return;
        setCurrentRecipe({
            ...currentRecipe,
            lines: [
                ...(currentRecipe.lines || []),
                { stockCardId: 0, quantity: 1, unit: 'adet', isRequired: true }
            ]
        });
    };

    const handleRemoveRecipeLine = (index: number) => {
        if (!currentRecipe) return;
        const newLines = [...(currentRecipe.lines || [])];
        newLines.splice(index, 1);
        setCurrentRecipe({ ...currentRecipe, lines: newLines });
    };

    const handleRecipeLineChange = (index: number, field: keyof RecipeLine, value: any) => {
        if (!currentRecipe) return;
        const newLines = [...(currentRecipe.lines || [])];
        const line = { ...newLines[index], [field]: value };

        if (field === 'stockCardId' && value > 0) {
            const card = stockCards.find(c => c.id === parseInt(value));
            if (card) {
                line.unit = card.baseUnit;
            }
        }

        newLines[index] = line;
        setCurrentRecipe({ ...currentRecipe, lines: newLines });
    };

    const handleSaveRecipe = async () => {
        if (!currentRecipe || !user?.token) return;

        const invalidLines = (currentRecipe.lines || []).filter(l => l.stockCardId === 0 || l.quantity <= 0);
        if (invalidLines.length > 0) {
            showSwal({ title: 'Hata', text: 'Lütfen tüm reçete satırları için geçerli bir stok kartı ve miktar giriniz.', icon: 'warning' });
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            // Veriyi temizle: Reçete satırlarındaki stockCard nesnesini ve ana nesnedeki product nesnesini çıkar
            const { product, ...cleanRecipe } = currentRecipe as any;
            const sanitizedLines = (cleanRecipe.lines || []).map((line: any) => {
                const { stockCard, ...cleanLine } = line;
                return cleanLine;
            });
            const cleanPayload = { ...cleanRecipe, lines: sanitizedLines };

            if (currentRecipe.id === 0) {
                const { id, ...postData } = cleanPayload;
                await axios.post(`${API_URL}/recipes`, postData, config);
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla oluşturuldu.', icon: 'success' });
            } else {
                await axios.put(`${API_URL}/recipes/${currentRecipe.id}`, cleanPayload, config);
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla güncellendi.', icon: 'success' });
            }

            fetchRecipeForProduct(currentRecipe.productId);
            // Refresh recipeHeaders so the new recipe appears in variant dropdowns
            const recipesRes = await axios.get(`${API_URL}/recipes`, config).catch(() => ({ data: [] }));
            setRecipeHeaders(Array.isArray(recipesRes.data) ? recipesRes.data : (recipesRes.data?.data || []));
        } catch (error: any) {
            console.error('Error saving recipe', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('saveError'), icon: 'error' });
        }
    };

    const handleDeleteRecipe = async () => {
        if (!currentRecipe || currentRecipe.id === 0 || !user?.token) return;

        const result = await showSwal({
            title: 'Reçeteyi Sil',
            text: 'Bu reçeteyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed) {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API_URL}/recipes/${currentRecipe.id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla silindi.', icon: 'success' });
                fetchRecipeForProduct(currentRecipe.productId);
                // Refresh recipe headers
                const recipesRes = await axios.get(`${API_URL}/recipes`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] }));
                setRecipeHeaders(Array.isArray(recipesRes.data) ? recipesRes.data : (recipesRes.data?.data || []));
            } catch (error: any) {
                console.error('Error deleting recipe', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('deleteError'), icon: 'error' });
            }
        }
    };

    const openModal = (prod?: Product) => {
        if (prod) {
            setFormData({
                ...prod,
                recipes: prod.recipes || [],
                modifiers: prod.modifiers || [],
                variations: prod.variations || [],
                inventoryLinkType: prod.inventoryLinkType || 'none',
                linkedStockItemId: prod.linkedStockItemId || null,
                directStockQty: prod.directStockQty || 0,
                directStockUnit: prod.directStockUnit || 'adet'
            });
            if (hasRecipeLicense) {
                fetchRecipeForProduct(prod.id);
            }
        } else {
            const defaultVatRate = (parameters.find(p => p.key === 'available_tax_rates')?.value || "0,1,10,20").split(',')[0].trim();
            setFormData({
                id: 0,
                name: '',
                sku: generateSku(''), // Başlangıçta boş kategori için SKU üret
                barcode: '',
                price: 0,
                category: '',
                isActive: true,
                printerId: null,
                costPrice: 0,
                minStockLevel: 0,
                unit: 'piece',
                isQuickSale: true,
                isIngredient: false,
                isSet: false,
                productTypeId: null,
                outputProfileId: null,
                recipes: [],
                modifiers: [],
                variations: [],
                vatRate: parseFloat(defaultVatRate) || 0,
                inventoryLinkType: 'none',
                linkedStockItemId: null,
                directStockQty: 0,
                directStockUnit: 'adet'
            });
            setCurrentRecipe(null);
            setRecipeSummary(null);
        }
        setIngredientProduct({ ingredientId: 0, quantity: 0, unit: 'adet' });
        setActiveTab('genel');
        setIsModalOpen(true);
    };

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith('image/')) {
            showSwal({ title: tc('error'), text: 'Sadece görsel dosyaları yüklenebilir.', icon: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData(prev => ({ ...prev, imageUrl: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    };

    const generateSku = (categoryName: string) => {
        // Kategori yoksa "URUN" ön ekini kullan, varsa ilk 3 karakteri al
        const prefixStr = (categoryName && categoryName.trim() !== '') ? categoryName : 'URUN';
        const prefix = prefixStr.substring(0, 3).toLocaleLowerCase('tr');

        const sameCategorySkus = products
            .filter(p => p.sku && p.sku.toLocaleLowerCase('tr').startsWith(`${prefix}-`))
            .map(p => {
                const parts = p.sku.split('-');
                return parseInt(parts[1]) || 0;
            });
        const maxNumber = sameCategorySkus.length > 0 ? Math.max(...sameCategorySkus) : 0;
        const nextNumber = maxNumber + 1;
        const suffix = nextNumber.toString().padStart(4, '0');
        return `${prefix}-${suffix}`;
    };

    const handleCategoryChange = (val: string) => {
        let newSku = formData.sku;
        if (formData.id === 0) {
            newSku = generateSku(val);
        }
        setFormData({ ...formData, category: val, sku: newSku });
    };

    const categoryOptions = departments
        .filter(d => d.isActive)
        .map(d => ({ key: d.name, value: d.name }))
        .sort((a, b) => a.value.localeCompare(b.value, 'tr', { sensitivity: 'base' }));

    const unitOptions = [
        { key: 'unitPiece', value: 'piece' },
        { key: 'unitKg', value: 'kg' },
        { key: 'unitGr', value: 'gr' },
        { key: 'unitLt', value: 'lt' },
        { key: 'unitMl', value: 'ml' },
        { key: 'unitPortion', value: 'portion' }
    ];

    const variantSystemEnabledParam = parameters.find(p => p.key === 'variant_system_enabled');
    const isVariantSystemEnabled = variantSystemEnabledParam ? (variantSystemEnabledParam.value === 'true' || variantSystemEnabledParam.value === true) : true;

    const availableVariantRecipes = (Array.isArray(recipeHeaders) ? recipeHeaders : []).filter(rh => rh.productId === formData.id);

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-mug-hot me-3 text-teal-600 dark:text-teal-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-teal-600 dark:text-teal-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={tc('search') + "..."}
                                className="w-64 pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow"
                            />
                        </div>
                        <button onClick={() => router.push(`/${locale}/admin/departments`)} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-layer-group text-lg"></i> {t('tableCategory')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin/products/set-menus`)} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-layer-group text-lg"></i> {t('setMenus')}
                        </button>
                        <button onClick={() => openModal()} className="px-6 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newProduct')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-teal-300 dark:hover:border-teal-500/40 hover:shadow-[0_8px_30px_-5px_rgba(20,184,166,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalProducts')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{products.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <i className="fat fa-mug-hot text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('activeCategories')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{new Set(products.map(p => p.category)).size}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-tags text-3xl"></i>
                        </div>
                    </div>
                    <div onClick={() => router.push(`/${locale}/admin/products/set-menus`)} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-[0_8px_30px_-5px_rgba(79,70,229,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('setMenuCount')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{products.filter(p => (p as any).isSet).length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <i className="fat fa-layer-group text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingProducts')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <button type="button" onClick={() => handleSort('name')} className={`flex items-center gap-1.5 group transition-colors hover:text-teal-500 ${sortField === 'name' ? 'text-teal-500' : ''}`}>
                                                {t('tableInfo')}
                                                <span className="flex flex-col leading-[0] opacity-60 group-hover:opacity-100">
                                                    <i className={`fat fa-chevron-up text-[7px] ${sortField === 'name' && sortDir === 'asc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                    <i className={`fat fa-chevron-down text-[7px] ${sortField === 'name' && sortDir === 'desc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                </span>
                                            </button>
                                        </th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableSku')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <button type="button" onClick={() => handleSort('category')} className={`flex items-center gap-1.5 group transition-colors hover:text-teal-500 ${sortField === 'category' ? 'text-teal-500' : ''}`}>
                                                {t('tableCategory')}
                                                <span className="flex flex-col leading-[0] opacity-60 group-hover:opacity-100">
                                                    <i className={`fat fa-chevron-up text-[7px] ${sortField === 'category' && sortDir === 'asc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                    <i className={`fat fa-chevron-down text-[7px] ${sortField === 'category' && sortDir === 'desc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                </span>
                                            </button>
                                        </th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <button type="button" onClick={() => handleSort('productType')} className={`flex items-center gap-1.5 group transition-colors hover:text-teal-500 ${sortField === 'productType' ? 'text-teal-500' : ''}`}>
                                                ÜRÜN CİNSİ
                                                <span className="flex flex-col leading-[0] opacity-60 group-hover:opacity-100">
                                                    <i className={`fat fa-chevron-up text-[7px] ${sortField === 'productType' && sortDir === 'asc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                    <i className={`fat fa-chevron-down text-[7px] ${sortField === 'productType' && sortDir === 'desc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                </span>
                                            </button>
                                        </th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÇIKTI PROFİLİ</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <button type="button" onClick={() => handleSort('price')} className={`flex items-center gap-1.5 group transition-colors hover:text-teal-500 ${sortField === 'price' ? 'text-teal-500' : ''}`}>
                                                {t('tablePrice')}
                                                <span className="flex flex-col leading-[0] opacity-60 group-hover:opacity-100">
                                                    <i className={`fat fa-chevron-up text-[7px] ${sortField === 'price' && sortDir === 'asc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                    <i className={`fat fa-chevron-down text-[7px] ${sortField === 'price' && sortDir === 'desc' ? 'opacity-100 text-teal-400' : 'opacity-30'}`}></i>
                                                </span>
                                            </button>
                                        </th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {sortedProducts.map(prod => (
                                        <tr key={prod.id} className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{prod.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    {prod.imageUrl ? (
                                                        <img
                                                            src={prod.imageUrl.startsWith('http') || prod.imageUrl.startsWith('data:') || prod.imageUrl.startsWith('/')
                                                                ? prod.imageUrl
                                                                : `/uploads/products/${prod.imageUrl}`
                                                            }
                                                            alt={prod.name}
                                                            className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                                                            <i className="fat fa-bowl-food"></i>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{prod.name}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${prod.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {prod.isActive ? t('statusOpen') : t('statusPassive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 tracking-tighter uppercase">
                                                    {prod.sku}
                                                </span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-tag text-slate-400 text-xs text-teal-500"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {prod.category || t('categoryOther')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-shapes text-teal-400 text-xs text-teal-500"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {productTypes.find(pt => pt.id === prod.productTypeId)?.name || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-route text-slate-400 text-xs text-blue-500"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {outputProfiles.find(op => op.id === prod.outputProfileId)?.name || 'Varsayılan'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-teal-600 dark:text-teal-400 font-black">
                                                ₺{prod.price.toFixed(2)}
                                                <div className="text-[10px] text-slate-400 font-bold">KDV: %{prod.vatRate || 0}</div>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-100 transition-all">
                                                    <button onClick={() => openModal(prod)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(prod.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('notFound')}</p>
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col h-[875px] max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-teal-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-hidden w-full text-start flex flex-col">
                            <form onSubmit={handleSave} id="productForm" className="flex flex-col h-full">
                                {/* Tabs */}
                                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 mx-8 mt-8 rounded-2xl shrink-0 overflow-x-auto">
                                    <button type="button" onClick={() => setActiveTab('genel')} className={`flex-[1_0_auto] px-3 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'genel' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabGeneral')}</button>
                                    <button type="button" onClick={() => setActiveTab('gorsel')} className={`flex-[1_0_auto] px-3 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'gorsel' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabImage')}</button>
                                    <button type="button" onClick={() => setActiveTab('recete')} className={`flex-[1_0_auto] px-3 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'recete' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabRecipe')}</button>
                                    <button type="button" onClick={() => setActiveTab('ozellik')} className={`flex-[1_0_auto] px-3 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'ozellik' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Özellikler</button>
                                    {isVariantSystemEnabled && (
                                        <button type="button" onClick={() => setActiveTab('varyant')} className={`flex-[1_0_auto] px-3 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'varyant' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Varyantlar</button>
                                    )}
                                </div>

                                <div className="p-8 pb-4 flex-1 overflow-y-auto">
                                    <div className="min-h-[420px]">
                                        {activeTab === 'genel' && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 gap-6">

                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                                        <div className="relative">
                                                            <i className="fat fa-bowl-food absolute left-4 top-4 text-teal-500/50"></i>
                                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder={t('labelName')} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-0">ÜRÜN CİNSİ</label>
                                                        <SearchableSelect
                                                            value={formData.productTypeId || ''}
                                                            onChange={(val) => setFormData({ ...formData, productTypeId: val ? parseInt(val) : null })}
                                                            options={[
                                                                { value: '', label: 'Cins Seçin (Zorunlu)' },
                                                                ...productTypes.map(pt => ({ value: pt.id, label: pt.name }))
                                                            ]}
                                                            placeholder="Cins Seçin (Zorunlu)"
                                                            icon="fat fa-shapes"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelCategory')}</label>
                                                        <SearchableSelect
                                                            value={formData.category || ''}
                                                            onChange={(val) => handleCategoryChange(val)}
                                                            options={[
                                                                { value: '', label: t('selectCategory') },
                                                                ...categoryOptions.map(cat => ({ value: cat.value, label: cat.value }))
                                                            ]}
                                                            placeholder={t('selectCategory')}
                                                            icon="fat fa-folder-tree"
                                                        />
                                                    </div>



                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelSku')}</label>
                                                        <div className="relative">
                                                            <i className="fat fa-barcode-read absolute left-4 top-4 text-teal-500/50"></i>
                                                            <input type="text" required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold uppercase font-mono focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder={t('labelSku')} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelPrice')}</label>
                                                        <div className="relative">
                                                            <i className="fat fa-money-bill-1-wave absolute left-4 top-4 text-teal-500/50"></i>
                                                            <input type="number" step="0.1" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white text-right font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0.00" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KDV ORANI (%)</label>
                                                        <SearchableSelect
                                                            value={String(formData.vatRate ?? 0)}
                                                            onChange={(val) => setFormData({ ...formData, vatRate: parseFloat(val) || 0 })}
                                                            options={(parameters.find(p => p.key === 'available_tax_rates')?.value || "0,1,10,20").split(',').map((rate: string) => ({
                                                                value: rate.trim(),
                                                                label: `%${rate.trim()}`
                                                            }))}
                                                            icon="fat fa-percent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelUnit')}</label>
                                                        <SearchableSelect
                                                            value={formData.unit || ''}
                                                            onChange={(val) => setFormData({ ...formData, unit: val })}
                                                            options={unitOptions.map(u => ({ value: u.value, label: t(u.key) }))}
                                                            icon="fat fa-scale-balanced"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">BARKOD</label>
                                                        <div className="relative">
                                                            <i className="fat fa-barcode absolute left-4 top-4 text-teal-500/50"></i>
                                                            <input type="text" value={formData.barcode || ''} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="Barkod okutun veya girin" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ÇIKTI PROFİLİ</label>
                                                    <SearchableSelect
                                                        value={formData.outputProfileId || ''}
                                                        onChange={(val) => setFormData({ ...formData, outputProfileId: val ? parseInt(val) : null })}
                                                        options={[
                                                            { value: '', label: 'Varsayılanı Kullan' },
                                                            ...outputProfiles.map(op => ({ value: op.id, label: op.name }))
                                                        ]}
                                                        placeholder="Varsayılanı Kullan"
                                                        icon="fat fa-route"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">ÜRÜN DURUMU & ÖZELLİKLERİ</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div
                                                            onClick={() => setFormData({ ...formData, isQuickSale: !formData.isQuickSale })}
                                                            className={`cursor-pointer group flex items-center p-4 rounded-3xl border-2 transition-all duration-300 ${formData.isQuickSale ? 'bg-teal-50 border-teal-500 dark:bg-teal-500/10 shadow-lg shadow-teal-500/10' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-teal-300'}`}
                                                        >
                                                            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-colors ${formData.isQuickSale ? 'bg-white text-teal-600 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                                                <i className="fat fa-bolt text-xl"></i>
                                                            </div>
                                                            <div className="flex-1 ml-4 text-left">
                                                                <h6 className={`text-sm font-black mb-0.5 tracking-tight ${formData.isQuickSale ? 'text-teal-900 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>{t('labelQuickSale')}</h6>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none m-0">{formData.isQuickSale ? 'Hızlı Satış Aktif' : 'Hızlı Satış Kapalı'}</p>
                                                            </div>
                                                            <div className={`w-6 h-6 shrink-0 rounded-full border-2 transition-all flex items-center justify-center ${formData.isQuickSale ? 'border-teal-600 bg-teal-600' : 'border-slate-300'}`}>
                                                                {formData.isQuickSale && <i className="fat fa-check text-[10px] text-white"></i>}
                                                            </div>
                                                        </div>

                                                        <div
                                                            onClick={() => setFormData({ ...formData, posVisible: formData.posVisible === undefined ? false : !formData.posVisible })}
                                                            className={`cursor-pointer group flex items-center p-4 rounded-3xl border-2 transition-all duration-300 ${formData.posVisible !== false ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-indigo-300'}`}
                                                        >
                                                            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-colors ${formData.posVisible !== false ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                                                <i className="fat fa-display text-xl"></i>
                                                            </div>
                                                            <div className="flex-1 ml-4 text-left">
                                                                <h6 className={`text-sm font-black mb-0.5 tracking-tight ${formData.posVisible !== false ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>Siparişte Göster</h6>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none m-0">{formData.posVisible !== false ? 'Menüde Görünür' : 'Gizli'}</p>
                                                            </div>
                                                            <div className={`w-6 h-6 shrink-0 rounded-full border-2 transition-all flex items-center justify-center ${formData.posVisible !== false ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                                                {formData.posVisible !== false && <i className="fat fa-check text-[10px] text-white"></i>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'yonlendirme' && (
                                            <div className="space-y-6">

                                                <div>

                                                </div>

                                            </div>
                                        )}

                                        {activeTab === 'gorsel' && (
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelImageUrl')}</label>
                                                    <div className="flex gap-3">
                                                        <div className="relative flex-1">
                                                            <i className="fat fa-image absolute left-4 top-4 text-teal-500/50"></i>
                                                            <input type="text" value={formData.imageUrl || ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="https:// veya Base64..." />
                                                            {formData.imageUrl && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 transition-colors"
                                                                    title={tc('clear')}
                                                                >
                                                                    <i className="fat fa-trash-can text-xs"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById('imageUploadInput')?.click()}
                                                            className="px-6 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <i className="fat fa-upload text-lg"></i> Seç
                                                        </button>
                                                        <input
                                                            type="file"
                                                            id="imageUploadInput"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                                        />
                                                    </div>
                                                </div>
                                                <div
                                                    className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-3xl min-h-[250px] transition-all hover:bg-teal-50/50 dark:hover:bg-teal-900/10 hover:border-teal-400 cursor-pointer"
                                                    onDragOver={handleDragOver}
                                                    onDrop={handleDrop}
                                                    onClick={() => document.getElementById('imageUploadInput')?.click()}
                                                >
                                                    {formData.imageUrl ? (
                                                        <div className="relative group w-48 h-48">
                                                            <img
                                                                src={formData.imageUrl.startsWith('http') || formData.imageUrl.startsWith('data:') || formData.imageUrl.startsWith('/')
                                                                    ? formData.imageUrl
                                                                    : `/uploads/products/${formData.imageUrl}`
                                                                }
                                                                alt={t('preview')}
                                                                className="w-full h-full object-cover rounded-2xl shadow-lg"
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                                                <div className="text-white text-center">
                                                                    <i className="fat fa-camera text-2xl mb-2"></i>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest">Resmi Değiştir</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center opacity-40 group-hover:opacity-100 group-hover:text-teal-600 transition-all">
                                                            <i className="fat fa-cloud-arrow-up text-5xl mb-3"></i>
                                                            <p className="text-sm font-black uppercase tracking-widest mb-1">Görsel Seç veya Sürükle</p>
                                                            <p className="text-[10px] font-bold text-slate-500">Maksimum önerilen boyut: 2MB (JPG, PNG)</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'recete' && (
                                            <div className="space-y-8">
                                                {!hasRecipeLicense ? (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/30 rounded-[32px] border border-slate-200 dark:border-slate-700">
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 text-xl">
                                                                    <i className="fat fa-boxes-stacked"></i>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1">STOK EŞLEŞTİRME</h4>
                                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Basit Stok Takibi</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">STOK TAKİP KURALI</label>
                                                                    <SearchableSelect
                                                                        value={formData.inventoryLinkType || 'none'}
                                                                        onChange={(val) => setFormData({ ...formData, inventoryLinkType: val })}
                                                                        options={[
                                                                            { value: 'none', label: 'Stok Düşümü Yapılmayacak' },
                                                                            { value: 'direct_stock', label: 'Tekil Stok Kartından Düşülsün' }
                                                                        ]}
                                                                        icon="fat fa-boxes-stacked"
                                                                    />
                                                                </div>

                                                                {formData.inventoryLinkType === 'direct_stock' && (
                                                                    <>
                                                                        <div>
                                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">EŞLEŞEN STOK KARTI</label>
                                                                            <SearchableSelect
                                                                                value={(formData.linkedStockItemId || '').toString()}
                                                                                onChange={(val) => {
                                                                                    const id = val ? parseInt(val) : null;
                                                                                    const sc = stockCards.find(c => c.id === id);
                                                                                    setFormData({ ...formData, linkedStockItemId: id, directStockUnit: sc?.baseUnit || 'adet' });
                                                                                }}
                                                                                options={[
                                                                                    { value: '', label: 'Stok Kartı Seçin' },
                                                                                    ...stockCards.map(c => ({ value: c.id.toString(), label: `${c.name} (${c.baseUnit})` }))
                                                                                ]}
                                                                                icon="fat fa-box"
                                                                            />
                                                                        </div>

                                                                        <div>
                                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">DÜŞÜLECEK MİKTAR ({formData.directStockUnit || 'Birim'})</label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.0001"
                                                                                    value={formData.directStockQty || ''}
                                                                                    onChange={(e) => setFormData({ ...formData, directStockQty: parseFloat(e.target.value) || 0 })}
                                                                                    className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-black text-center focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow"
                                                                                    placeholder="Örn: 1 veya 0.05"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-[32px] flex gap-4 items-start">
                                                            <i className="fat fa-shield-halved text-blue-500 text-xl mt-1"></i>
                                                            <div>
                                                                <h4 className="text-sm font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest m-0 leading-none mb-2">Gelişmiş Reçete Kilidi</h4>
                                                                <p className="text-xs text-blue-700 dark:text-blue-500 font-bold m-0 leading-relaxed uppercase tracking-tighter">
                                                                    Şu anda temel stok takibi modundasınız. Birden fazla malzemeden oluşan karmaşık reçeteler, maliyet analizleri ve hammadde takibi için "Stok & Reçete" lisansı gereklidir.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : !formData.id ? (
                                                    <div className="flex flex-col items-center justify-center p-12 bg-orange-50 dark:bg-orange-900/10 border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-[32px] text-center">
                                                        <i className="fat fa-circle-exclamation text-4xl text-orange-500 mb-4"></i>
                                                        <h4 className="text-sm font-black text-orange-900 dark:text-orange-400 m-0 uppercase tracking-widest">Önce Ürünü Kaydetmelisiniz</h4>
                                                        <p className="text-xs text-orange-700 dark:text-orange-500/80 mt-2 m-0 max-w-xs font-bold uppercase tracking-tighter">Reçete oluşturabilmek için ürünün sisteme kayıtlı olması gerekmektedir. Lütfen önce ürünü kaydedin.</p>
                                                    </div>
                                                ) : loadingRecipe ? (
                                                    <div className="flex flex-col items-center justify-center p-20">
                                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Reçete yükleniyor...</p>
                                                    </div>
                                                ) : currentRecipe ? (
                                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                        {/* Reçete Başlık Bilgileri */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/20 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                                            <div>
                                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">REÇETE ADI (OPSİYONEL)</label>
                                                                <div className="relative">
                                                                    <i className="fat fa-tag absolute left-4 top-3.5 text-slate-400 text-sm"></i>
                                                                    <input
                                                                        type="text"
                                                                        value={currentRecipe.name || ''}
                                                                        onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
                                                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-orange-500/50 outline-none transition-shadow capitalize"
                                                                        placeholder="Örn: Standart Reçete"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center pt-6 justify-between gap-4">
                                                                <div
                                                                    onClick={() => setCurrentRecipe({ ...currentRecipe, isActive: !currentRecipe.isActive })}
                                                                    className={`flex-1 cursor-pointer flex items-center p-2.5 px-4 rounded-xl border transition-all duration-300 ${currentRecipe.isActive ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/10' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-600'}`}
                                                                >
                                                                    <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center transition-colors ${currentRecipe.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                        {currentRecipe.isActive && <i className="fat fa-check text-xs"></i>}
                                                                    </div>
                                                                    <div className="ml-3 text-left">
                                                                        <h6 className={`text-[10px] font-black tracking-widest uppercase m-0 ${currentRecipe.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>Reçete Aktif</h6>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2 shrink-0">
                                                                    {currentRecipe.id > 0 && (
                                                                        <button type="button" onClick={handleDeleteRecipe} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 border border-red-100 dark:border-red-900/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                                            <i className="fat fa-trash-can text-sm"></i>
                                                                        </button>
                                                                    )}
                                                                    <button type="button" onClick={handleSaveRecipe} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95 border border-orange-600/20">
                                                                        <i className="fat fa-floppy-disk mr-1.5"></i> {tc('save')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Reçete Detay Tablosu */}
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-[28px] overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-none">
                                                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/10">
                                                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 m-0">
                                                                    <i className="fat fa-list-check text-orange-500"></i> İçindekiler / Stok Kullanımı
                                                                </h4>
                                                                <div className="flex gap-2">
                                                                    <button type="button" onClick={handleAddRecipeLine} className="px-4 py-2 bg-white dark:bg-slate-700 border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all flex items-center gap-2">
                                                                        <i className="fat fa-plus text-xs"></i> Satır Ekle
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="overflow-x-auto min-h-[200px]">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                                            <th className="px-6 py-4 w-[45%]">Stok Kartı (Hammadde)</th>
                                                                            <th className="px-6 py-4 text-center">Miktar</th>
                                                                            <th className="px-6 py-4">Birim</th>
                                                                            <th className="px-6 py-4 text-center">Zorunlu</th>
                                                                            <th className="px-6 py-4"></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                        {(currentRecipe.lines || []).map((line, idx) => (
                                                                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                                                                                <td className="px-6 py-3">
                                                                                    <div className="-m-1 w-full">
                                                                                        <SearchableSelect
                                                                                            value={(line.stockCardId || '').toString()}
                                                                                            onChange={(val) => handleRecipeLineChange(idx, 'stockCardId', val ? parseInt(val) : 0)}
                                                                                            options={[
                                                                                                { value: '', label: 'Seçiniz...' },
                                                                                                ...stockCards.map(c => ({ value: c.id.toString(), label: `${c.name} (${c.baseUnit})` }))
                                                                                            ]}
                                                                                        />
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.0001"
                                                                                        value={line.quantity ?? ''}
                                                                                        onChange={(e) => handleRecipeLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                                                        className="w-24 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-black text-sm text-center focus:ring-2 focus:ring-orange-500/30 outline-none transition-all"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-6 py-3">
                                                                                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-200/50 dark:border-slate-700">
                                                                                        {line.unit || '-'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRecipeLineChange(idx, 'isRequired', !line.isRequired)}
                                                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto transition-all ${line.isRequired ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30' : 'bg-slate-50 text-slate-300 border border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
                                                                                    >
                                                                                        <i className={`fat ${line.isRequired ? 'fa-check' : 'fa-minus'} text-xs`}></i>
                                                                                    </button>
                                                                                </td>
                                                                                <td className="px-6 py-3 text-right">
                                                                                    <button type="button" onClick={() => handleRemoveRecipeLine(idx)} className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100/50 opacity-100">
                                                                                        <i className="fat fa-trash-can text-sm"></i>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {(currentRecipe.lines || []).length === 0 && (
                                                                            <tr>
                                                                                <td colSpan={5} className="py-20 text-center">
                                                                                    <div className="flex flex-col items-center opacity-30">
                                                                                        <i className="fat fa-blender text-5xl mb-4 text-slate-400"></i>
                                                                                        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Reçete Henüz Boş</p>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* Maliyet Özeti Bölümü */}
                                                        {recipeSummary && (currentRecipe.lines?.length || 0) > 0 && currentRecipe.id > 0 && (
                                                            <div className="bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-900/50 dark:to-orange-900/10 p-7 rounded-[32px] border border-orange-100 dark:border-orange-500/20 shadow-inner">
                                                                <h4 className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-6 flex items-center gap-2 m-0">
                                                                    <i className="fat fa-chart-pie"></i> Reçete Maliyet Analizi (Anlık)
                                                                </h4>

                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Satış Fiyatı</p>
                                                                        <p className="text-2xl font-black text-slate-800 dark:text-white m-0">₺{recipeSummary.salePrice?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-rose-100 dark:border-rose-900/30">
                                                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1.5 leading-none">Toplam Maliyet</p>
                                                                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400 m-0">₺{recipeSummary.foodCost?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 leading-none">Kâr Tutarı</p>
                                                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 m-0">₺{recipeSummary.profit?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 leading-none">Maliyet Oranı (Cost %)</p>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                                                                <div
                                                                                    className={`h-full rounded-full transition-all duration-1000 ${recipeSummary.costRatio > 50 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : recipeSummary.costRatio > 30 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
                                                                                    style={{ width: `${Math.min(recipeSummary.costRatio || 0, 100)}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <p className="text-lg leading-none font-black text-indigo-600 dark:text-indigo-400 m-0">
                                                                                %{recipeSummary.costRatio?.toFixed(1) || '0.0'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}

                                        {activeTab === 'ozellik' && (
                                            <div className="space-y-6">
                                                <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 min-h-[420px]">
                                                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-6">UYGULANABİLİR ÖZELLİKLER</h4>

                                                    {allModifiers.length > 0 ? (
                                                        <div className="space-y-6">
                                                            {Object.entries(
                                                                allModifiers.reduce((acc, mod) => {
                                                                    const group = mod.groupName || 'Grupsuz Özellikler';
                                                                    if (!acc[group]) acc[group] = [];
                                                                    acc[group].push(mod);
                                                                    return acc;
                                                                }, {} as Record<string, Modifier[]>)
                                                            ).map(([groupName, mods]) => (
                                                                <div key={groupName} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                    <h5 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                        <i className="fat fa-layer-group text-teal-500/50"></i> {groupName}
                                                                    </h5>
                                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                        {mods.map(mod => {
                                                                            const isSelected = formData.modifiers?.some(m => m.id === mod.id);
                                                                            return (
                                                                                <label key={mod.id} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-teal-50 border-teal-500 dark:bg-teal-900/20 dark:border-teal-500/50 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-teal-300 dark:bg-slate-900/50 dark:border-slate-700'}`}>
                                                                                    <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md checked:bg-teal-500 checked:border-teal-500 transition-all cursor-pointer"
                                                                                            checked={isSelected}
                                                                                            onChange={(e) => {
                                                                                                if (e.target.checked) {
                                                                                                    setFormData(prev => ({ ...prev, modifiers: [...(prev.modifiers || []), mod] }));
                                                                                                } else {
                                                                                                    setFormData(prev => ({ ...prev, modifiers: prev.modifiers?.filter(m => m.id !== mod.id) || [] }));
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                        <i className="fat fa-check absolute pointer-events-none text-white text-[10px] opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                                                                                    </div>
                                                                                    <span className={`text-sm font-bold ${isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300'}`}>{mod.name}</span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 opacity-50">
                                                            <i className="fat fa-tags text-4xl mb-3 text-slate-400"></i>
                                                            <p className="font-bold text-sm tracking-widest uppercase">SİSTEMDE HİÇ ÖZELLİK BULUNAMADI.</p>
                                                            <p className="text-xs mt-1">Lütfen önce Ürün Özellikleri sayfasından özellik tanımlayınız.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'varyant' && isVariantSystemEnabled && (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                                                    <div>
                                                        <h4 className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1">ÜRÜN VARYANTLARI</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0 font-medium">Bu ürüne farklı boyut veya porsiyon seçenekleri (Örn: Kokteyl Duble, 35cl Şişe, L Büyük Boy) tanımlayın.</p>
                                                    </div>
                                                    <button type="button" onClick={() => setFormData(p => ({ ...p, variations: [...(p.variations || []), { variationName: '', priceFactor: 1, fixedPrice: null, inventoryLinkType: 'none', isActive: true }] }))} className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-500/30 flex items-center gap-2">
                                                        <i className="fat fa-plus"></i> Varyant Ekle
                                                    </button>
                                                </div>

                                                {formData.variations && formData.variations.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {formData.variations.map((v: any, idx: number) => (
                                                            <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-visible">
                                                                <button type="button" onClick={() => setFormData(p => ({ ...p, variations: p.variations!.filter((_, i) => i !== idx) }))} className="absolute -top-3 -right-3 w-8 h-8 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-red-500 hover:text-white shadow-sm as-btn">
                                                                    <i className="fat fa-xmark text-sm"></i>
                                                                </button>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                                    <div>
                                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">VARYANT ADI *</label>
                                                                        <div className="relative">
                                                                            <i className="fat fa-tag absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50"></i>
                                                                            <input type="text" required value={v.variationName} onChange={e => { const nv = [...formData.variations!]; nv[idx].variationName = e.target.value; setFormData({ ...formData, variations: nv }); }} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none" placeholder="Örn: 35cl Kadeh" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ÖZEL FİYAT (₺)</label>
                                                                        <div className="relative">
                                                                            <i className="fat fa-money-bill absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50"></i>
                                                                            <input type="number" step="0.01" value={v.fixedPrice ?? ''} onChange={e => { const nv = [...formData.variations!]; nv[idx].fixedPrice = e.target.value ? parseFloat(e.target.value) : null; setFormData({ ...formData, variations: nv }); }} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500/30 outline-none" placeholder="Ürün fiyatını ezmek için" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">BARKOD</label>
                                                                        <div className="relative">
                                                                            <i className="fat fa-barcode absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/50"></i>
                                                                            <input type="text" value={v.barcode || ''} onChange={e => { const nv = [...formData.variations!]; nv[idx].barcode = e.target.value; setFormData({ ...formData, variations: nv }); }} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-slate-500/30 outline-none" placeholder="Barkod ile satmak için" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                                                                        <div>
                                                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">STOK TAKİP KURALI</label>
                                                                            <SearchableSelect
                                                                                value={v.inventoryLinkType || 'none'}
                                                                                onChange={(val) => {
                                                                                    const nv = [...formData.variations!];
                                                                                    nv[idx].inventoryLinkType = val;
                                                                                    setFormData({ ...formData, variations: nv });
                                                                                }}
                                                                                options={[
                                                                                    { value: 'none', label: 'Stok Düşümü Yok' },
                                                                                    { value: 'direct_stock', label: 'Tekil Stok Kartı Çık (Şişe vs)' },
                                                                                    { value: 'recipe', label: 'Özel Reçete Düş (Kadeh, L Porsiyon)' }
                                                                                ]}
                                                                                icon="fat fa-boxes-stacked"
                                                                            />
                                                                        </div>

                                                                        {v.inventoryLinkType === 'direct_stock' && (
                                                                            <>
                                                                                <div>
                                                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">BAĞLI STOK KARTI</label>
                                                                                    <SearchableSelect
                                                                                        value={(v.linkedStockItemId || '').toString()}
                                                                                        onChange={(val) => {
                                                                                            const nv = [...formData.variations!];
                                                                                            nv[idx].linkedStockItemId = val ? parseInt(val) : null;
                                                                                            setFormData({ ...formData, variations: nv });
                                                                                        }}
                                                                                        options={[
                                                                                            { value: '', label: 'Stok Seçin' },
                                                                                            ...(Array.isArray(stockCards) ? stockCards : []).map((sc: any) => ({
                                                                                                value: (sc.id || '').toString(),
                                                                                                label: `${sc.name || ''} (${sc.baseUnit || sc.unit || ''})`
                                                                                            }))
                                                                                        ]}
                                                                                        icon="fat fa-box"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">DÜŞÜLECEK MİKTAR ({v.linkedStockItemId ? stockCards.find((sc: any) => sc.id === v.linkedStockItemId)?.unit : 'Birimi'})</label>
                                                                                    <div className="flex relative">
                                                                                        <input type="number" step="0.001" required={v.inventoryLinkType === 'direct_stock'} value={v.directStockQty ?? ''} onChange={e => { const nv = [...formData.variations!]; nv[idx].directStockQty = e.target.value ? parseFloat(e.target.value) : null; setFormData({ ...formData, variations: nv }); }} className="w-full pl-4 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-slate-500/30 outline-none" placeholder="Örn: 1 veya 0.04" />
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        )}

                                                                        {v.inventoryLinkType === 'recipe' && (
                                                                            <div className="md:col-span-2">
                                                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">VARYANT YAN REÇETESİ (BAŞLIK)</label>
                                                                                <SearchableSelect
                                                                                    value={(v.recipeHeaderId || '').toString()}
                                                                                    onChange={(val) => {
                                                                                        const nv = [...formData.variations!];
                                                                                        nv[idx].recipeHeaderId = val ? parseInt(val) : null;
                                                                                        setFormData({ ...formData, variations: nv });
                                                                                    }}
                                                                                    options={[
                                                                                        { value: '', label: 'Reçete Başlığı Seçin (Örn: L Boy Özel Reçete)' },
                                                                                        ...availableVariantRecipes.map((rh: any) => ({
                                                                                            value: (rh.id || '').toString(),
                                                                                            label: `${rh.name || `Başlıksız Reçete #${rh.id}`}${!rh.isActive ? ' (Pasif)' : ''}`
                                                                                        }))
                                                                                    ]}
                                                                                    icon="fat fa-receipt"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-10 opacity-30 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
                                                        <i className="fat fa-boxes-stacked text-5xl mb-3 text-slate-400"></i>
                                                        <p className="font-black text-sm tracking-widest uppercase mb-1">KAYITLI VARYANT YOK.</p>
                                                        <p className="text-xs font-bold uppercase tracking-widest">Barkodlu ürünler veya porsiyonlu servisler ekleyin.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-teal-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <i className="fat fa-check text-lg"></i> {tc('save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
