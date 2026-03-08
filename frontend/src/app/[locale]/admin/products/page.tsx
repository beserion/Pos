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
    sku: string;
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
    recipes?: { ingredientId: number; ingredientName?: string; quantity: number; unit: string }[];
}

interface Printer {
    id: number;
    name: string;
}

export default function ProductsAdminPage() {
    const t = useTranslations('Products');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'genel' | 'gorsel' | 'recete'>('genel');
    const [formData, setFormData] = useState<Product>({
        id: 0,
        name: '',
        sku: '',
        price: 0,
        category: '',
        isActive: true,
        printerId: null,
        costPrice: 0,
        minStockLevel: 0,
        unit: 'piece',
        isQuickSale: true,
        isIngredient: false,
        recipes: []
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
            const [prodRes, printRes] = await Promise.all([
                axios.get('http://localhost:3050/products', { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get('http://localhost:3050/printers', { headers: { Authorization: `Bearer ${user.token}` } })
            ]);
            setProducts(prodRes.data);
            setPrinters(printRes.data);
        } catch (error) {
            console.error('Error fetching data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData, price: Number(formData.price) };

            if (formData.id === 0) {
                const { id, ...postData } = payload;
                await axios.post('http://localhost:3050/products', postData, config);
                toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/products/${formData.id}`, payload, config);
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
                await axios.delete(`http://localhost:3050/products/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('deleted'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting product', error);
                showSwal({ title: tc('error'), text: tc('deleteError'), icon: 'error' });
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

    const openModal = (prod?: Product) => {
        if (prod) {
            setFormData({ ...prod, recipes: prod.recipes || [] });
        } else {
            setFormData({
                id: 0,
                name: '',
                sku: '',
                price: 0,
                category: '',
                isActive: true,
                printerId: null,
                costPrice: 0,
                minStockLevel: 0,
                unit: 'piece',
                isQuickSale: true,
                isIngredient: false,
                recipes: []
            });
        }
        setIngredientProduct({ ingredientId: 0, quantity: 0, unit: 'adet' });
        setActiveTab('genel');
        setIsModalOpen(true);
    };

    const categoryOptions = [
        { key: 'catHotDrink', value: 'Sıcak İçecek' },
        { key: 'catColdDrink', value: 'Soğuk İçecek' },
        { key: 'catFood', value: 'Yiyecek' },
        { key: 'catDessert', value: 'Tatlı' },
        { key: 'catSideProduct', value: 'Yan Ürün' }
    ];

    const unitOptions = [
        { key: 'unitPiece', value: 'piece' },
        { key: 'unitKg', value: 'kg' },
        { key: 'unitGr', value: 'gr' },
        { key: 'unitLt', value: 'lt' },
        { key: 'unitMl', value: 'ml' },
        { key: 'unitPortion', value: 'portion' }
    ];

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
                            <div className="h-1 w-1/2 bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
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
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableInfo')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableSku')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableCategory')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tablePrinter')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tablePrice')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {products.map(prod => (
                                        <tr key={prod.id} className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{prod.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    {prod.imageUrl ? (
                                                        <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110" />
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
                                                        {categoryOptions.find(opt => opt.value === prod.category) ? t(categoryOptions.find(opt => opt.value === prod.category)!.key) : prod.category || t('categoryOther')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-print text-slate-400 text-xs text-blue-500"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {printers.find(p => p.id === prod.printerId)?.name || t('printerDefault')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-teal-600 dark:text-teal-400 font-black">
                                                ₺{prod.price.toFixed(2)}
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
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
                                    {products.length === 0 && (
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-teal-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto w-full text-start">
                            <form onSubmit={handleSave} id="productForm">
                                {/* Tabs */}
                                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 mx-8 mt-8 rounded-2xl shrink-0">
                                    <button type="button" onClick={() => setActiveTab('genel')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'genel' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabGeneral')}</button>
                                    <button type="button" onClick={() => setActiveTab('gorsel')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'gorsel' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabImage')}</button>
                                    <button type="button" onClick={() => setActiveTab('recete')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'recete' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabRecipe')}</button>
                                </div>

                                <div className="p-8 space-y-6">
                                    {activeTab === 'genel' && (
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                                <div className="relative">
                                                    <i className="fat fa-bowl-food absolute left-4 top-4 text-teal-500/50"></i>
                                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder={t('labelName')} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                        <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0.00" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelCategory')}</label>
                                                <div className="relative">
                                                    <i className="fat fa-folder-tree absolute left-4 top-4 text-teal-500/50"></i>
                                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                        <option value="">{t('selectCategory')}</option>
                                                        {categoryOptions.map(cat => (
                                                            <option key={cat.key} value={cat.value}>{t(cat.key)}</option>
                                                        ))}
                                                    </select>
                                                    <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelCost')}</label>
                                                    <div className="relative">
                                                        <i className="fat fa-tags absolute left-4 top-4 text-teal-500/50"></i>
                                                        <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0.00" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelMinStock')}</label>
                                                    <div className="relative">
                                                        <i className="fat fa-triangle-exclamation absolute left-4 top-4 text-teal-500/50"></i>
                                                        <input type="number" step="1" value={formData.minStockLevel ?? ''} onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || 0 })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelUnit')}</label>
                                                    <div className="relative">
                                                        <i className="fat fa-scale-balanced absolute left-4 top-4 text-teal-500/50"></i>
                                                        <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                            {unitOptions.map(u => (
                                                                <option key={u.key} value={u.value}>{t(u.key)}</option>
                                                            ))}
                                                        </select>
                                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelPrinter')}</label>
                                                <div className="relative">
                                                    <i className="fat fa-print absolute left-4 top-4 text-teal-500/50"></i>
                                                    <select value={formData.printerId || ''} onChange={(e) => setFormData({ ...formData, printerId: e.target.value ? parseInt(e.target.value) : null })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                        <option value="">{t('selectPrinter')}</option>
                                                        {printers.map(printer => (
                                                            <option key={printer.id} value={printer.id}>{printer.name}</option>
                                                        ))}
                                                    </select>
                                                    <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelQuickSale')}</label>
                                                    <div className="relative flex items-center pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl w-full">
                                                        <i className="fat fa-bolt absolute left-4 top-4 text-teal-500/50"></i>
                                                        <div className="form-check form-switch mb-0 flex-1 d-flex justify-content-end pr-2">
                                                            <input className="form-check-input cursor-pointer" type="checkbox" checked={formData.isQuickSale} onChange={(e) => setFormData({ ...formData, isQuickSale: e.target.checked })} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelIngredient')}</label>
                                                    <div className="relative flex items-center pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl w-full">
                                                        <i className="fat fa-leaf absolute left-4 top-4 text-teal-500/50"></i>
                                                        <div className="form-check form-switch mb-0 flex-1 d-flex justify-content-end pr-2">
                                                            <input className="form-check-input cursor-pointer" type="checkbox" checked={formData.isIngredient} onChange={(e) => setFormData({ ...formData, isIngredient: e.target.checked })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'gorsel' && (
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelImageUrl')}</label>
                                                <div className="relative">
                                                    <i className="fat fa-image absolute left-4 top-4 text-teal-500/50"></i>
                                                    <input type="text" value={formData.imageUrl || ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="https://..." />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl min-h-[250px]">
                                                {formData.imageUrl ? (
                                                    <img src={formData.imageUrl} alt={t('preview')} className="w-48 h-48 object-cover rounded-2xl shadow-lg" />
                                                ) : (
                                                    <div className="text-center opacity-40">
                                                        <i className="fat fa-image text-4xl mb-2"></i>
                                                        <p className="text-xs font-bold uppercase tracking-widest">{t('noPreview')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'recete' && (
                                        <div className="space-y-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">{t('newRecipeItem')}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('tableIngredient')}</label>
                                                        <div className="relative">
                                                            <i className="fat fa-leaf absolute left-4 top-[14px] text-teal-500/50 text-sm"></i>
                                                            <select value={ingredientProduct.ingredientId || ''} onChange={(e) => setIngredientProduct({ ...ingredientProduct, ingredientId: parseInt(e.target.value) })} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                                <option value="">{t('selectIngredient')}</option>
                                                                {products.filter(p => p.isIngredient).map(i => (
                                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                                ))}
                                                            </select>
                                                            <i className="fat fa-chevron-down absolute right-4 top-[14px] text-slate-400 text-xs pointer-events-none"></i>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelQuantity')}</label>
                                                        <div className="relative">
                                                            <i className="fat fa-scale-balanced absolute left-4 top-[14px] text-teal-500/50 text-sm"></i>
                                                            <input type="number" step="0.001" value={ingredientProduct.quantity || ''} onChange={(e) => setIngredientProduct({ ...ingredientProduct, quantity: parseFloat(e.target.value) || 0 })} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow" placeholder="0" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelUnit')}</label>
                                                        <div className="relative">
                                                            <i className="fat fa-ruler-combined absolute left-4 top-[14px] text-teal-500/50 text-sm"></i>
                                                            <select value={ingredientProduct.unit} onChange={(e) => setIngredientProduct({ ...ingredientProduct, unit: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-teal-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                                <option value="kg">{t('unitKg')}</option>
                                                                <option value="gr">{t('unitGr')}</option>
                                                                <option value="lt">{t('unitLt')}</option>
                                                                <option value="ml">{t('unitMl')}</option>
                                                                <option value="adet">{t('unitPiece')}</option>
                                                                <option value="porsiyon">{t('unitPortion')}</option>
                                                            </select>
                                                            <i className="fat fa-chevron-down absolute right-4 top-[14px] text-slate-400 text-xs pointer-events-none"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={handleAddIngredient} className="mt-4 w-full py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center justify-center gap-2">
                                                    <i className="fat fa-plus"></i> Ekle
                                                </button>
                                            </div>

                                            {formData.recipes && formData.recipes.length > 0 ? (
                                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                                            <tr>
                                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableIngredient')}</th>
                                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableQuantity')}</th>
                                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                            {formData.recipes.map((item, index) => (
                                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                                    <td className="px-6 py-3 font-bold text-sm text-slate-700 dark:text-slate-300">
                                                                        {item.ingredientName || products.find(p => p.id === item.ingredientId)?.name || `Malzeme #${item.ingredientId}`}
                                                                    </td>
                                                                    <td className="px-6 py-3 font-bold text-sm text-teal-600 dark:text-teal-400">
                                                                        {item.quantity} {item.unit}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <button type="button" onClick={() => handleRemoveIngredient(item.ingredientId)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center">
                                                                            <i className="fat fa-trash-can text-sm"></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 opacity-40">
                                                    <i className="fat fa-scroll text-4xl mb-2 text-slate-300"></i>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Reçete henüz boş.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-6 flex gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                            <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                        </button>
                                        <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-teal-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <i className="fat fa-check text-lg"></i> {tc('save')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
