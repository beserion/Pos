'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    isActive: boolean;
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
    const { user } = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [stockCards, setStockCards] = useState<StockCard[]>([]);
    const [currentRecipe, setCurrentRecipe] = useState<RecipeHeader | null>(null);
    const [recipeSummary, setRecipeSummary] = useState<any>(null);
    
    const [loading, setLoading] = useState(true);
    const [loadingRecipe, setLoadingRecipe] = useState(false);

    useEffect(() => {
        if (user?.token) {
            fetchInitialData();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user]);

    const fetchInitialData = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [prodRes, cardsRes] = await Promise.all([
                axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/stock-cards?limit=1000`, { headers: { Authorization: `Bearer ${user.token}` } })
            ]);
            
            setProducts(prodRes.data);
            setFilteredProducts(prodRes.data);
            setStockCards(cardsRes.data.data.filter((c: StockCard) => c.isActive) || []);
        } catch (error) {
            console.error('Error fetching initial data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lowerQuery = searchQuery.toLowerCase();
        setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(lowerQuery) || p.category.toLowerCase().includes(lowerQuery)));
    }, [searchQuery, products]);

    const handleSelectProduct = async (product: Product) => {
        setSelectedProduct(product);
        setLoadingRecipe(true);
        setCurrentRecipe(null);
        setRecipeSummary(null);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [recipeRes, summaryRes] = await Promise.all([
                axios.get(`${API_URL}/recipes/product/${product.id}`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: null })),
                axios.get(`${API_URL}/recipes/cost/${product.id}`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: null }))
            ]);

            if (recipeRes.data) {
                setCurrentRecipe(recipeRes.data);
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
                ...currentRecipe.lines,
                { stockCardId: 0, quantity: 1, unit: 'adet', isRequired: true }
            ]
        });
    };

    const handleRemoveLine = (index: number) => {
        if (!currentRecipe) return;
        const newLines = [...currentRecipe.lines];
        newLines.splice(index, 1);
        setCurrentRecipe({ ...currentRecipe, lines: newLines });
    };

    const handleLineChange = (index: number, field: keyof RecipeLine, value: any) => {
        if (!currentRecipe) return;
        const newLines = [...currentRecipe.lines];
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
        const invalidLines = currentRecipe.lines.filter(l => l.stockCardId === 0 || l.quantity <= 0);
        if (invalidLines.length > 0) {
            showSwal({ title: 'Hata', text: 'Lütfen tüm reçete satırları için geçerli bir stok kartı ve miktar giriniz.', icon: 'warning' });
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
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
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.delete(`${API_URL}/recipes/${currentRecipe.id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: tc('success'), text: 'Reçete başarıyla silindi.', icon: 'success' });
                
                if (selectedProduct) {
                    handleSelectProduct(selectedProduct);
                }
            } catch (error: any) {
                console.error('Error deleting recipe', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('deleteError'), icon: 'error' });
            }
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none z-0"></div>

            <div className="w-full px-[50px] pt-8 pb-4 relative z-10 shrink-0">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <i className="fat fa-blender text-orange-500/80 drop-shadow-sm transition-transform hover:scale-110 hover:rotate-3 duration-300 ease-out" style={{ fontSize: '50px' }}></i>
                        <div className="flex flex-col">
                            <h3 className="mb-0 text-3xl font-extralight text-orange-600 dark:text-orange-400 leading-none uppercase tracking-[0.25em]" id="title">
                                {t('title')}
                            </h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-orange-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                {t('subtitle')}
                            </h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingRecipes')}</p>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 px-[50px] pb-8 relative z-10 overflow-hidden min-h-0">
                    
                    {/* LEFT PANEL: Products List */}
                    <div className="w-[380px] flex flex-col bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] overflow-hidden shadow-sm shrink-0">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">Ürünler</h4>
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredProducts.map(product => (
                                <div 
                                    key={product.id}
                                    onClick={() => handleSelectProduct(product)}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center justify-between ${
                                        selectedProduct?.id === product.id 
                                            ? 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30 shadow-sm' 
                                            : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-slate-800/50 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedProduct?.id === product.id ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <i className="fat fa-bowl-food text-sm"></i>
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
                                                    value={currentRecipe.name} 
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

                                        {currentRecipe.lines.length === 0 ? (
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
                                                        {currentRecipe.lines.map((line, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-6 py-3">
                                                                    <div className="relative">
                                                                        <select 
                                                                            value={line.stockCardId || ''} 
                                                                            onChange={(e) => handleLineChange(idx, 'stockCardId', e.target.value ? parseInt(e.target.value) : 0)} 
                                                                            className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-bold text-sm focus:border-orange-500 outline-none transition-colors appearance-none"
                                                                        >
                                                                            <option value="">Stok Kartı Seçin...</option>
                                                                            {stockCards.map(c => (
                                                                                <option key={c.id} value={c.id}>{c.name} ({c.baseUnit})</option>
                                                                            ))}
                                                                        </select>
                                                                        <i className="fat fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <input 
                                                                        type="number" 
                                                                        step="0.0001" 
                                                                        value={line.quantity || ''} 
                                                                        onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-black text-sm text-center focus:border-orange-500 outline-none transition-colors"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <input 
                                                                        type="text" 
                                                                        value={line.unit || ''} 
                                                                        onChange={(e) => handleLineChange(idx, 'unit', e.target.value)} 
                                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-xs uppercase focus:outline-none"
                                                                    />
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
                                    {recipeSummary && currentRecipe.lines.length > 0 && currentRecipe.id > 0 && (
                                        <div className="bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-900/50 dark:to-orange-900/10 p-6 rounded-[32px] border border-orange-100 dark:border-orange-500/20">
                                            <h4 className="text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <i className="fat fa-chart-pie"></i> Reçete Maliyet Özeti
                                            </h4>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Satış Fiyatı</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-white">₺{recipeSummary.salePrice.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-rose-100 dark:border-rose-900/30">
                                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Toplam Maliyet</p>
                                                    <p className="text-xl font-black text-rose-600 dark:text-rose-400">₺{recipeSummary.totalCost.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Kâr Tutarı</p>
                                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₺{recipeSummary.profitAmount.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Cost Oranı</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${recipeSummary.costPercentage > 50 ? 'bg-rose-500' : recipeSummary.costPercentage > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                                                style={{ width: `${Math.min(recipeSummary.costPercentage, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="text-base leading-none font-black text-indigo-600 dark:text-indigo-400">
                                                            %{recipeSummary.costPercentage.toFixed(1)}
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
    );
}
