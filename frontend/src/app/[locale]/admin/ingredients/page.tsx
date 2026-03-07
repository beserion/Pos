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
    isIngredient: boolean;
    unit?: string;
    imageUrl?: string;
}

export default function IngredientsAdminPage() {
    const t = useTranslations('Ingredients');
    const tc = useTranslations('Common');
    const tp = useTranslations('Products');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [ingredients, setIngredients] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Product>({
        id: 0,
        name: '',
        sku: '',
        price: 0,
        category: 'Hammadde',
        isActive: true,
        isIngredient: true,
        unit: 'gr'
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
            const res = await axios.get('http://localhost:3050/products', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            // Filter only ingredients
            setIngredients(res.data.filter((p: any) => p.isIngredient));
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
            const payload = { ...formData, isIngredient: true };

            if (formData.id === 0) {
                const { id, ...postData } = payload;
                await axios.post('http://localhost:3050/products', postData, config);
                toastSwal({ title: tc('success'), text: tc('added'), icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/products/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving ingredient', error);
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
                console.error('Error deleting ingredient', error);
                showSwal({ title: tc('error'), text: tc('deleteError'), icon: 'error' });
            }
        }
    };

    const openModal = (ing?: Product) => {
        if (ing) setFormData({ ...ing });
        else setFormData({
            id: 0,
            name: '',
            sku: '',
            price: 0,
            category: 'Hammadde',
            isActive: true,
            isIngredient: true,
            unit: 'gr'
        });
        setIsModalOpen(true);
    };

    const getUnitName = (unit: string | null | undefined) => {
        if (!unit) return '-';
        switch (unit.toLowerCase()) {
            case 'gr': return t('unitGr');
            case 'kg': return t('unitKg');
            case 'ml': return t('unitMl');
            case 'lt': return t('unitLt');
            case 'adet': return t('unitPiece');
            default: return unit;
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-leaf me-3 text-emerald-600 dark:text-emerald-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-emerald-600 dark:text-emerald-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-emerald-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newIngredient')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalIngredients')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{ingredients.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-leaf text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-teal-300 dark:hover:border-teal-500/40 hover:shadow-[0_8px_30px_-5px_rgba(20,184,166,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('activeIngredients')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{ingredients.filter(i => i.isActive).length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <i className="fat fa-circle-check text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingIngredients')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableName')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableSku')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableUnit')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableCost')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {ingredients.map(ing => (
                                        <tr key={ing.id} className="hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{ing.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-leaf"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{ing.name}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${ing.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {ing.isActive ? t('statusInUse') : t('statusPassive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 tracking-tighter uppercase">
                                                    {ing.sku}
                                                </span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{getUnitName(ing.unit)}</span>
                                            </td>
                                            <td className="px-8 py-3 text-emerald-600 dark:text-emerald-400 font-black">
                                                ₺{(ing.price || 0).toFixed(2)}
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(ing)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(ing.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-xl shadow-lg overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-emerald-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                    <div className="relative">
                                        <i className="fat fa-leaf absolute left-4 top-3.5 text-emerald-500/50"></i>
                                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" placeholder={t('labelName')} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelSku')}</label>
                                    <div className="relative">
                                        <i className="fat fa-barcode-read absolute left-4 top-3.5 text-emerald-500/50"></i>
                                        <input type="text" required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow uppercase font-mono" placeholder={t('labelSku')} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelUnit')}</label>
                                    <div className="relative">
                                        <i className="fat fa-scale-balanced absolute left-4 top-4 text-emerald-500/50"></i>
                                        <select value={formData.unit || 'gr'} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                            <option value="gr">{t('unitGr')}</option>
                                            <option value="kg">{t('unitKg')}</option>
                                            <option value="ml">{t('unitMl')}</option>
                                            <option value="lt">{t('unitLt')}</option>
                                            <option value="adet">{t('unitPiece')}</option>
                                        </select>
                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelCost')}</label>
                                    <div className="relative">
                                        <i className="fat fa-money-bill-1-wave absolute left-4 top-3.5 text-emerald-500/50"></i>
                                        <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelCategoryAuto')}</label>
                                    <div className="relative">
                                        <i className="fat fa-tag absolute left-4 top-3.5 text-slate-400"></i>
                                        <input type="text" readOnly value={tp('labelIngredient')} className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 font-bold outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                    {tc('cancel')}
                                </button>
                                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    {t('saveButton')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
