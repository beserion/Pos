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
}

interface Recipe {
    id: number;
    productId: number;
    product: Product;
    ingredientId: number;
    ingredient: Product;
    quantity: number;
    unit: string;
}

export default function RecipesAdminPage() {
    const t = useTranslations('Recipes');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, productId: 0, ingredientId: 0, quantity: 0, unit: 'adet' });

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
            const [recipeRes, prodRes] = await Promise.all([
                axios.get('http://localhost:3050/recipes', { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get('http://localhost:3050/products', { headers: { Authorization: `Bearer ${user.token}` } })
            ]);
            setRecipes(recipeRes.data);
            setProducts(prodRes.data);
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

        if (formData.productId === 0 || formData.ingredientId === 0 || formData.quantity <= 0) {
            showSwal({ title: tc('error'), text: t('validationError'), icon: 'warning' });
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData, quantity: Number(formData.quantity) };

            if (formData.id === 0) {
                const { id, ...postData } = payload;
                await axios.post('http://localhost:3050/recipes', postData, config);
                toastSwal({ title: tc('success'), text: tc('added'), icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/recipes/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving recipe', error);
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
                await axios.delete(`http://localhost:3050/recipes/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('deleted'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting recipe', error);
                showSwal({ title: tc('error'), text: tc('deleteError'), icon: 'error' });
            }
        }
    };

    const openModal = (recipe?: Recipe) => {
        if (recipe) {
            setFormData({
                id: recipe.id,
                productId: recipe.productId,
                ingredientId: recipe.ingredientId,
                quantity: recipe.quantity,
                unit: recipe.unit
            });
        }
        else setFormData({ id: 0, productId: 0, ingredientId: 0, quantity: 0, unit: 'adet' });
        setIsModalOpen(true);
    };

    // Calculate total recipes per product
    const uniqueProductsWithRecipes = new Set(recipes.map(r => r.productId)).size;

    const getUnitName = (unit: string | null) => {
        if (!unit) return '-';
        switch (unit.toLowerCase()) {
            case 'gr': return t('unitGr');
            case 'kg': return t('unitKg');
            case 'ml': return t('unitMl');
            case 'lt': return t('unitLt');
            case 'adet': return t('unitPiece');
            case 'porsiyon': return t('unitPortion');
            default: return unit;
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none z-0"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
                        <button onClick={() => openModal()} className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newRecipeItem')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-[0_8px_30px_-5px_rgba(249,115,22,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalRecipeItems')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{recipes.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <i className="fat fa-scroll text-3xl"></i>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-[0_8px_30px_-5px_rgba(244,63,94,0.3)] hover:scale-[1.02] cursor-pointer group">
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 drop-shadow-sm">
                                <i className="fat fa-sparkles text-rose-400/70"></i> {t('uniqueProducts')}
                            </p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white drop-shadow-sm leading-none">{uniqueProductsWithRecipes}</h3>
                        </div>
                        <div className="relative z-10 w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-rose-100 dark:border-rose-500/20">
                            <i className="fat fa-layer-group text-3xl group-hover:scale-110 transition-transform duration-300"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingRecipes')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>ID</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableProduct')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableIngredient')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableQuantity')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {recipes.map(recipe => (
                                        <tr key={recipe.id} className="hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{recipe.id}</span>
                                            </td>
                                            <td className="px-8 py-3 border-r border-slate-50/50 dark:border-slate-700/30">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-bowl-food"></i>
                                                    </div>
                                                    <span className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{recipe.product.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-leaf text-emerald-500 text-xs"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {recipe.ingredient.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-orange-600 dark:text-orange-400 font-black">
                                                {recipe.quantity} {getUnitName(recipe.unit)}
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(recipe)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(recipe.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {recipes.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-scroll text-6xl mb-4 text-slate-300"></i>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-orange-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelProduct')}</label>
                                        <div className="relative">
                                            <i className="fat fa-bowl-food absolute left-4 top-4 text-orange-500/50"></i>
                                            <select required value={formData.productId || ''} onChange={(e) => setFormData({ ...formData, productId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                <option value="">{t('selectProduct')}</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('tableIngredient')}</label>
                                        <div className="relative">
                                            <i className="fat fa-leaf absolute left-4 top-4 text-emerald-500/50"></i>
                                            <select required value={formData.ingredientId || ''} onChange={(e) => setFormData({ ...formData, ingredientId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                <option value="">{t('selectIngredient')}</option>
                                                {products.filter(p => (p as any).isIngredient).map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                            <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelQuantity')}</label>
                                            <div className="relative">
                                                <i className="fat fa-scale-balanced absolute left-4 top-4 text-orange-500/50"></i>
                                                <input type="number" step="0.001" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow" placeholder="0" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelUnit')}</label>
                                            <div className="relative">
                                                <i className="fat fa-ruler-combined absolute left-4 top-4 text-orange-500/50"></i>
                                                <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                                    <option value="kg">{t('unitKg')}</option>
                                                    <option value="gr">{t('unitGr')}</option>
                                                    <option value="lt">{t('unitLt')}</option>
                                                    <option value="ml">{t('unitMl')}</option>
                                                    <option value="adet">{t('unitPiece')}</option>
                                                    <option value="porsiyon">{t('unitPortion')}</option>
                                                </select>
                                                <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <i className="fat fa-check text-lg"></i> {t('saveButton')}
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
