'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import SearchableSelect from '@/components/SearchableSelect';
import { getUnitName } from '@/app/[locale]/utils/units';
import { API_URL } from '@/lib/apiConfig';

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    isActive: boolean;
    hasRecipe?: boolean;
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

export function PageClient() {
    const t = useTranslations('Recipes');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user, hasFeature } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [recipeFilter, setRecipeFilter] = useState<'all' | 'has' | 'none'>('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [stockCards, setStockCards] = useState<StockCard[]>([]);
    const [currentRecipe, setCurrentRecipe] = useState<RecipeHeader | null>(null);
    const [recipeSummary, setRecipeSummary] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [loadingReport, setLoadingReport] = useState(false);

    const hasRecipeFeature = user ? hasFeature('recipe_system') : false;

    useEffect(() => {
        if (user?.token && hasFeature('recipe_system')) {
            fetchInitialData();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, hasFeature]);

    const fetchInitialData = async () => {
        if (!user?.token) return;
        try {
            const [prodRes, cardsRes, recipesRes] = await Promise.all([
                axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/stock-cards?limit=1000`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/recipes`, { headers: { Authorization: `Bearer ${user.token}` } }).catch((err) => { console.error('Recipes API Error:', err); return { data: [] }; })
            ]);

            const recipesData = recipesRes.data?.data || recipesRes.data || [];
            console.log('recipesData:', recipesData);

            const sortedProducts = (prodRes.data || []).sort((a: Product, b: Product) => a.name.localeCompare(b.name, 'tr'));

            const mappedProducts = sortedProducts.map((p: Product) => {
                const hasRecipe = recipesData.some((r: any) => r.productId == p.id && r.isActive);
                if (hasRecipe) console.log('Product has recipe:', p.name);
                return { ...p, hasRecipe };
            });

            setProducts(mappedProducts);
            setFilteredProducts(mappedProducts);
            setStockCards(cardsRes.data?.data?.filter((c: StockCard) => c.isActive) || []);
        } catch (error) {
            console.error('Error fetching initial data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        let filtered = products.filter(p =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery)
        );

        if (recipeFilter === 'has') {
            filtered = filtered.filter(p => p.hasRecipe);
        } else if (recipeFilter === 'none') {
            filtered = filtered.filter(p => !p.hasRecipe);
        }

        setFilteredProducts(filtered);
    }, [searchQuery, products, recipeFilter]);

    const handleSelectProduct = async (product: Product) => {
        setSelectedProduct(product);
        setLoadingRecipe(true);
        setCurrentRecipe(null);
        setRecipeSummary(null);

        try {
            const [recipeRes, summaryRes] = await Promise.all([
                axios.get(`${API_URL}/recipes/by-product/${product.id}`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: null })),
                axios.get(`${API_URL}/recipes/summary/${product.id}`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: null }))
            ]);

            if (recipeRes.data && Array.isArray(recipeRes.data) && recipeRes.data.length > 0) {
                const activeRecipe = recipeRes.data.find((r: any) => r.isActive) || recipeRes.data[0];
                setCurrentRecipe(activeRecipe);
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, hasRecipe: activeRecipe.isActive !== false } : p));
            } else if (recipeRes.data && !Array.isArray(recipeRes.data) && Object.keys(recipeRes.data).length > 0) {
                setCurrentRecipe(recipeRes.data);
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, hasRecipe: recipeRes.data.isActive !== false } : p));
            } else {
                // Initialize empty recipe for this product
                setCurrentRecipe({
                    id: 0,
                    productId: product.id,
                    name: `${product.name} Reçetesi`,
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

    const handleAddLine = () => {
        if (!currentRecipe) return;
        setCurrentRecipe({
            ...currentRecipe,
            lines: [
                ...(currentRecipe.lines || []),
                { stockCardId: 0, quantity: 1, unit: 'adet', isRequired: true }
            ]
        });
    };

    const handleRemoveLine = (index: number) => {
        if (!currentRecipe) return;
        const newLines = [...(currentRecipe.lines || [])];
        newLines.splice(index, 1);
        setCurrentRecipe({ ...currentRecipe, lines: newLines });
    };

    const handleLineChange = (index: number, field: keyof RecipeLine, value: any) => {
        if (!currentRecipe) return;
        const newLines = [...(currentRecipe.lines || [])];
        const line = { ...newLines[index], [field]: value };

        // Auto-fill unit based on stock card selection
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

        // Validation
        const invalidLines = (currentRecipe.lines || []).filter(l => l.stockCardId === 0 || l.quantity <= 0);
        if (invalidLines.length > 0) {
            showSwal({ title: 'Hata', text: 'Lütfen tüm reçete satırları için geçerli bir stok kartı ve miktar giriniz.', icon: 'warning' });
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            if (currentRecipe.id === 0) {
                const { id, ...postData } = currentRecipe;
                await axios.post(`${API_URL}/recipes`, postData, config);
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla oluşturuldu.', icon: 'success' });
            } else {
                await axios.put(`${API_URL}/recipes/${currentRecipe.id}`, currentRecipe, config);
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla güncellendi.', icon: 'success' });
            }

            // Reload recipe
            if (selectedProduct) {
                handleSelectProduct(selectedProduct);

                // Update local products state
                const isRecipeActive = currentRecipe.isActive !== false;
                const updateProductsList = (list: Product[]) => list.map(p =>
                    p.id === selectedProduct.id ? { ...p, hasRecipe: isRecipeActive } : p
                );

                setProducts(prev => updateProductsList(prev));
                setFilteredProducts(prev => updateProductsList(prev));
            }
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
                await axios.delete(`${API_URL}/recipes/${currentRecipe.id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla silindi.', icon: 'success' });

                if (selectedProduct) {
                    handleSelectProduct(selectedProduct);

                    const updateProductsList = (list: Product[]) => list.map(p =>
                        p.id === selectedProduct.id ? { ...p, hasRecipe: false } : p
                    );

                    setProducts(prev => updateProductsList(prev));
                    setFilteredProducts(prev => updateProductsList(prev));
                }
            } catch (error: any) {
                console.error('Error deleting recipe', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('deleteError'), icon: 'error' });
            }
        }
    };

    const handleOpenReport = async () => {
        setLoadingReport(true);
        setReportModalOpen(true);
        try {
            const res = await axios.get(`${API_URL}/recipes/report`, { headers: { Authorization: `Bearer ${user.token}` } });
            setReportData(res.data || []);
        } catch (error) {
            console.error('Error fetching report', error);
            showSwal({ title: tc('error'), text: 'Rapor verileri alınamadı.', icon: 'error' });
        } finally {
            setLoadingReport(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (user && !hasRecipeFeature) {
        return (
            <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
                <PremiumModuleLocked moduleName="Reçete ve Üretim Sistemi" featureKey="recipe_system" />
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none transition-colors duration-500"></div>

            <div className="w-full px-[50px] py-8 relative z-10 flex flex-col h-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
                    <div className="flex items-center">
                        <i className={`fat fa-blender me-3 text-orange-600 dark:text-orange-400`} style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-orange-600 dark:text-orange-400 leading-none uppercase tracking-[0.25em]" id="title">
                                {t('title')}
                            </h3>
                            <div className="h-1 w-full bg-gradient-to-r from-orange-400/60 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-3">
                                {t('subtitle')}
                                <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-[13px] font-black uppercase tracking-widest border border-orange-200/50 dark:border-orange-500/20">
                                    {products.length} Ürün
                                </span>
                            </h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleOpenReport} className="px-6 py-3 bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md hover:shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-file-chart-pie"></i> Reçete Dökümü Raporu
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingRecipes')}</p>
                    </div>
                ) : (
                    <div className="flex-1 flex gap-6 pb-8 relative z-10 overflow-hidden min-h-0">

                        {/* LEFT PANEL: Products List */}
                        <div className="w-[380px] flex flex-col bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] overflow-hidden shadow-sm shrink-0">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">Ürünler ({filteredProducts.length})</h4>

                                {/* Filter Tabs */}
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl mb-4">
                                    <button
                                        onClick={() => setRecipeFilter('all')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipeFilter === 'all' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Tümü
                                    </button>
                                    <button
                                        onClick={() => setRecipeFilter('has')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipeFilter === 'has' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Reçeteli
                                    </button>
                                    <button
                                        onClick={() => setRecipeFilter('none')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipeFilter === 'none' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Reçetesiz
                                    </button>
                                </div>

                                <div className="relative">
                                    <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Ürün Ara..."
                                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1 space-y-1">
                                {filteredProducts.map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => handleSelectProduct(product)}
                                        className={`p-1 rounded-2xl cursor-pointer transition-all border flex items-center justify-between ${selectedProduct?.id === product.id
                                            ? 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30 shadow-sm'
                                            : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-slate-800/50 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedProduct?.id === product.id ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                <i className="fat fa-bowl-food text-sm"></i>
                                                {product.hasRecipe && (
                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full shadow-md flex items-center justify-center z-10" title="Reçetesi Var">
                                                        <i className="fat fa-check text-white text-[10px]"></i>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm leading-tight ${selectedProduct?.id === product.id ? 'text-orange-900 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {product.name}
                                                </p>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">{product.category}</p>
                                            </div>
                                        </div>
                                        <i className={`fat fa-chevron-right text-xs ${selectedProduct?.id === product.id ? 'text-orange-500' : 'text-slate-300'}`}></i>
                                    </div>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <div className="text-center p-8 opacity-50">
                                        <i className="fat fa-inbox text-3xl text-slate-400 mb-2"></i>
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ürün Bulunamadı</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Recipe Details */}
                        <div className="flex-1 flex flex-col bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] overflow-hidden shadow-sm relative">
                            {!selectedProduct ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-40">
                                    <i className="fat fa-hand-pointer text-6xl text-slate-400 mb-4 animate-bounce"></i>
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-500">Reçetesini yönetmek için sol menüden bir ürün seçin</p>
                                </div>
                            ) : loadingRecipe ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Reçete yükleniyor...</p>
                                </div>
                            ) : currentRecipe ? (
                                <div className="flex-1 flex flex-col h-full absolute inset-0">
                                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-start shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-inner">
                                                <i className="fat fa-receipt text-2xl"></i>
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-800 dark:text-white capitalize tracking-tighter leading-tight">
                                                    {selectedProduct.name}
                                                </h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                        {selectedProduct.category}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                                                        Satış Fiyatı: ₺{selectedProduct.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {currentRecipe.id > 0 && (
                                                <button onClick={handleDeleteRecipe} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors border border-red-100">
                                                    <i className="fat fa-trash-can mr-1"></i> Reçeteyi Sil
                                                </button>
                                            )}
                                            <button onClick={handleSaveRecipe} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95 border border-orange-600">
                                                <i className="fat fa-floppy-disk mr-1"></i> {tc('save')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                        {/* Header Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/20 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700/50">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Reçete Adı (Opsiyonel)</label>
                                                <div className="relative">
                                                    <i className="fat fa-tag absolute left-4 top-3.5 text-slate-400 text-sm"></i>
                                                    <input
                                                        type="text"
                                                        value={currentRecipe.name || ''}
                                                        onChange={(e) => setCurrentRecipe({ ...currentRecipe, name: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-orange-500/50 outline-none transition-shadow"
                                                        placeholder="Örn: Standart Margarita"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center pt-6">
                                                <div
                                                    onClick={() => setCurrentRecipe({ ...currentRecipe, isActive: !currentRecipe.isActive })}
                                                    className={`cursor-pointer flex items-center p-2.5 px-4 rounded-xl border transition-all duration-300 ${currentRecipe.isActive ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-600'}`}
                                                >
                                                    <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center transition-colors ${currentRecipe.isActive ? 'bg-white text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                        {currentRecipe.isActive && <i className="fat fa-check text-xs"></i>}
                                                    </div>
                                                    <div className="ml-3 text-left">
                                                        <h6 className={`text-xs font-black tracking-widest uppercase m-0 ${currentRecipe.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>Reçete Aktif</h6>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lines */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                    <i className="fat fa-list-check text-orange-500"></i> İçindekiler / Stok Kullanımı
                                                </h4>
                                                <button onClick={handleAddLine} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-orange-600 dark:text-orange-400 font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex items-center gap-1.5">
                                                    <i className="fat fa-plus"></i> Satır Ekle
                                                </button>
                                            </div>

                                            {(currentRecipe.lines?.length || 0) === 0 ? (
                                                <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                                    <i className="fat fa-scroll text-4xl text-slate-300 mb-3"></i>
                                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Reçete henüz boş. İçerik eklemeye başlayın.</p>
                                                </div>
                                            ) : (
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Stok Kartı (Kullanılacak Hammadde)</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Miktar</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Birim</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Zorunlu</th>
                                                                <th className="px-6 py-4"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {(currentRecipe.lines || []).map((line, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                    <td className="px-6 py-3">
                                                                        <div className="-m-1.5 w-full">
                                                                            <SearchableSelect
                                                                                value={(line.stockCardId || '').toString()}
                                                                                onChange={(val) => handleLineChange(idx, 'stockCardId', val ? parseInt(val.toString()) : 0)}
                                                                                options={[
                                                                                    { value: '', label: 'Stok Kartı Seçin...' },
                                                                                    ...stockCards.map(c => ({ value: c.id.toString(), label: `${c.name} (${getUnitName(c.baseUnit)})` }))
                                                                                ]}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3">
                                                                        <input
                                                                            type="number"
                                                                            step="0.0001"
                                                                            value={line.quantity ?? ''}
                                                                            onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-black text-sm text-center focus:border-orange-500 outline-none transition-colors"
                                                                        />
                                                                    </td>
                                                                    <td className="px-6 py-3">
                                                                        <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-xs uppercase flex items-center justify-center min-h-[38px]">
                                                                            {getUnitName(line.unit || '')}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleLineChange(idx, 'isRequired', !line.isRequired)}
                                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${line.isRequired ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                                                                        >
                                                                            <i className={`fat ${line.isRequired ? 'fa-check' : 'fa-minus'} text-xs`}></i>
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <button type="button" onClick={() => handleRemoveLine(idx)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center inline-flex">
                                                                            <i className="fat fa-trash-can text-sm"></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cost Summary Section */}
                                        {recipeSummary && (currentRecipe.lines?.length || 0) > 0 && currentRecipe.id > 0 && (
                                            <div className="bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900/50 dark:to-orange-900/10 p-6 rounded-[32px] border border-orange-100 dark:border-orange-500/20">
                                                <h4 className="text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                    <i className="fat fa-chart-pie"></i> Reçete Maliyet Özeti
                                                </h4>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Satış Fiyatı</p>
                                                        <p className="text-xl font-black text-slate-800 dark:text-white">₺{recipeSummary.salePrice?.toFixed(2) || '0.00'}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-rose-100 dark:border-rose-900/30">
                                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Toplam Maliyet</p>
                                                        <p className="text-xl font-black text-rose-600 dark:text-rose-400">₺{recipeSummary.foodCost?.toFixed(2) || '0.00'}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Kâr Tutarı</p>
                                                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₺{recipeSummary.profit?.toFixed(2) || '0.00'}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Cost Oranı</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${recipeSummary.costRatio > 50 ? 'bg-rose-500' : recipeSummary.costRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min(recipeSummary.costRatio || 0, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <p className="text-base leading-none font-black text-indigo-600 dark:text-indigo-400">
                                                                %{recipeSummary.costRatio?.toFixed(1) || '0.0'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* REPORT MODAL */}
            {reportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-white/20 print:shadow-none print:border-none print:max-h-none print:rounded-none">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 no-print">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                                    <i className="fat fa-file-chart-column"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white leading-none">Reçete Dökümü ve Maliyet Raporu</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistemdeki tüm aktif reçetelerin özeti</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePrint} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2">
                                    <i className="fat fa-print"></i> Yazdır / PDF
                                </button>
                                <button onClick={() => setReportModalOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                                    <i className="fat fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-900/30 print:p-0 print:overflow-visible">
                            {loadingReport ? (
                                <div className="h-64 flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Rapor hazırlanıyor...</p>
                                </div>
                            ) : (
                                <div id="printable-report" className="bg-white text-slate-900 p-0 sm:p-6">
                                    {/* Report Header */}
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-900">
                                        <div className="flex items-center gap-6">
                                            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                                                <img src="/PosNetX3.png" alt="Logo" className="h-12 w-auto object-contain" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="h-1 w-8 bg-orange-500 rounded-full"></div>
                                                    <span className="text-[8px] font-black text-orange-600 uppercase tracking-[0.3em]">Resmi Rapor Çıktısı</span>
                                                </div>
                                                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-900">REÇETE DÖKÜMÜ VE MALİYET ANALİZİ</h1>

                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tarih:</span>
                                                        <span className="text-[10px] font-bold text-slate-700">{new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')}</span>
                                                    </div>
                                                    <div className="w-px h-3 bg-slate-300"></div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Kayıt:</span>
                                                        <span className="text-[10px] font-bold text-slate-700">{reportData.length} Reçete</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col justify-end">
                                            <div className="flex items-center gap-3 justify-end mb-1">
                                                <p className="text-sm font-black uppercase text-slate-900 leading-none tracking-tighter">POSNETX</p>
                                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">v3.1.2</span>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em]">Management Solutions</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-0 items-start">
                                        {/* Left Column Data (Half of products) */}
                                        <div className="flex flex-col border-r-2 border-slate-900 pr-4">
                                            {reportData.slice(0, Math.ceil(reportData.length / 2)).map((row, idx) => (
                                                <div key={`left-${idx}`} className="border-b border-slate-200 py-1.5 print:break-inside-avoid">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="font-black text-slate-900 uppercase text-[10px]">{row.productName}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">[{row.productCategory}]</span>
                                                        </div>
                                                        <div className="text-[9px] font-black text-slate-900">₺{row.salePrice.toFixed(2)}</div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-0 mb-1 pl-2 border-l-2 border-slate-100">
                                                        {row.items.map((item: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center text-[8px] leading-tight py-0.5">
                                                                <span className="text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-4">• {item.stockCardName}</span>
                                                                <span className="font-bold text-slate-900 whitespace-nowrap">{item.quantity} {getUnitName(item.unit)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded text-[8px]">
                                                        <div className="flex gap-3">
                                                            <span className="text-rose-600 font-bold">Maliyet: ₺{row.totalCost.toFixed(2)}</span>
                                                            <span className="text-emerald-700 font-bold">Kâr: ₺{row.profit.toFixed(2)}</span>
                                                        </div>
                                                        <span className={`font-black ${row.costRatio > 40 ? 'text-rose-500' : 'text-slate-500'}`}>%{row.costRatio} Cost</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Right Column Data (Second half of products) */}
                                        <div className="flex flex-col pl-4">
                                            {reportData.slice(Math.ceil(reportData.length / 2)).map((row, idx) => (
                                                <div key={`right-${idx}`} className="border-b border-slate-200 py-1.5 print:break-inside-avoid">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="font-black text-slate-900 uppercase text-[10px]">{row.productName}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">[{row.productCategory}]</span>
                                                        </div>
                                                        <div className="text-[9px] font-black text-slate-900">₺{row.salePrice.toFixed(2)}</div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-0 mb-1 pl-2 border-l-2 border-slate-100">
                                                        {row.items.map((item: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center text-[8px] leading-tight py-0.5">
                                                                <span className="text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-4">• {item.stockCardName}</span>
                                                                <span className="font-bold text-slate-900 whitespace-nowrap">{item.quantity} {getUnitName(item.unit)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded text-[8px]">
                                                        <div className="flex gap-3">
                                                            <span className="text-rose-600 font-bold">Maliyet: ₺{row.totalCost.toFixed(2)}</span>
                                                            <span className="text-emerald-700 font-bold">Kâr: ₺{row.profit.toFixed(2)}</span>
                                                        </div>
                                                        <span className={`font-black ${row.costRatio > 40 ? 'text-rose-500' : 'text-slate-500'}`}>%{row.costRatio} Cost</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {reportData.length === 0 && (
                                        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
                                            Aktif reçete bulunamadı.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-report, #printable-report * {
                        visibility: visible !important;
                    }
                    #printable-report {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        color: black !important;
                        display: block !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Parent containers must be visible for children to show up in some browsers */
                    .fixed, .bg-white, .flex-1 {
                        visibility: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}
