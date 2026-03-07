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
    const [activeTab, setActiveTab] = useState<'genel' | 'gorsel'>('genel');
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
        isIngredient: false
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

    const openModal = (prod?: Product) => {
        if (prod) {
            setFormData({ ...prod });
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
                isIngredient: false
            });
        }
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
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="d-flex align-items-center">
                        <i className="fat fa-mug-hot me-3 text-teal-600 dark:text-teal-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 fw-bold text-teal-600 dark:text-teal-400 uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <h5 className="text-muted mb-0 font-medium text-slate-400 dark:text-slate-500">{t('subtitle')}</h5>
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
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
                                        <tr key={prod.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
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
                                                    <i className="fat fa-tag text-slate-400 text-xs"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {categoryOptions.find(opt => opt.value === prod.category) ? t(categoryOptions.find(opt => opt.value === prod.category)!.key) : prod.category || t('categoryOther')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-print text-slate-400 text-xs text-indigo-500"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {printers.find(p => p.id === prod.printerId)?.name || t('printerDefault')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-indigo-600 dark:text-indigo-400 font-black">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-xl shadow-lg overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-indigo-600`}></i>
                                {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                        </div>

                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 mx-8 mt-8 rounded-2xl">
                            <button type="button" onClick={() => setActiveTab('genel')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'genel' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabGeneral')}</button>
                            <button type="button" onClick={() => setActiveTab('gorsel')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'gorsel' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('tabImage')}</button>
                        </div>

                        <form onSubmit={handleSave} className="p-8">
                            <div className="text-start w-100">
                                {activeTab === 'genel' && (
                                    <div className="row mp-0 g-2">
                                        <div className="col-12 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelName')} <span className="text-danger">*</span></span></div>
                                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control" placeholder={t('labelName')} />
                                                <div className="input-group-text wd-50"><i className="fat fa-bowl-food"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelSku')} <span className="text-danger">*</span></span></div>
                                                <input type="text" required value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="form-control uppercase font-mono" placeholder={t('labelSku')} />
                                                <div className="input-group-text wd-50"><i className="fat fa-barcode-read"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelPrice')} <span className="text-danger">*</span></span></div>
                                                <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="form-control" placeholder="0.00" />
                                                <div className="input-group-text wd-50"><i className="fat fa-money-bill-1-wave"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-12 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelCategory')}</span></div>
                                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="form-select">
                                                    <option value="">{t('selectCategory')}</option>
                                                    {categoryOptions.map(cat => (
                                                        <option key={cat.key} value={cat.value}>{t(cat.key)}</option>
                                                    ))}
                                                </select>
                                                <div className="input-group-text wd-50"><i className="fat fa-folder-tree"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-4 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelCost')}</span></div>
                                                <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="form-control" />
                                                <div className="input-group-text wd-50"><i className="fat fa-tags"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-4 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelMinStock')}</span></div>
                                                <input type="number" step="1" value={formData.minStockLevel} onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || 0 })} className="form-control" />
                                                <div className="input-group-text wd-50"><i className="fat fa-triangle-exclamation"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-4 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelUnit')}</span></div>
                                                <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="form-select">
                                                    {unitOptions.map(u => (
                                                        <option key={u.key} value={u.value}>{t(u.key)}</option>
                                                    ))}
                                                </select>
                                                <div className="input-group-text wd-50"><i className="fat fa-scale-balanced"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-12 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelPrinter')}</span></div>
                                                <select value={formData.printerId || ''} onChange={(e) => setFormData({ ...formData, printerId: e.target.value ? parseInt(e.target.value) : null })} className="form-select">
                                                    <option value="">{t('selectPrinter')}</option>
                                                    {printers.map(printer => (
                                                        <option key={printer.id} value={printer.id}>{printer.name}</option>
                                                    ))}
                                                </select>
                                                <div className="input-group-text wd-50"><i className="fat fa-print"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelQuickSale')}</span></div>
                                                <div className="form-control d-flex align-items-center">
                                                    <div className="form-check form-switch mb-0">
                                                        <input type="checkbox" checked={formData.isQuickSale} onChange={(e) => setFormData({ ...formData, isQuickSale: e.target.checked })} className="form-check-input" />
                                                    </div>
                                                </div>
                                                <div className="input-group-text wd-50"><i className="fat fa-bolt"></i></div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelIngredient')}</span></div>
                                                <div className="form-control d-flex align-items-center">
                                                    <div className="form-check form-switch mb-0">
                                                        <input type="checkbox" checked={formData.isIngredient} onChange={(e) => setFormData({ ...formData, isIngredient: e.target.checked })} className="form-check-input" />
                                                    </div>
                                                </div>
                                                <div className="input-group-text wd-50"><i className="fat fa-leaf"></i></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'gorsel' && (
                                    <div className="row mp-0 g-2">
                                        <div className="col-12 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>{t('labelImageUrl')}</span></div>
                                                <input type="text" value={formData.imageUrl || ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="form-control" placeholder="https://..." />
                                                <div className="input-group-text wd-50"><i className="fat fa-image"></i></div>
                                            </div>
                                        </div>
                                        <div className="col-12 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl min-h-[250px]">
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

                                <hr className="my-2" />
                                <div className="d-flex justify-content-between align-items-center">
                                    <button type="button" className="btn btn-soft-danger btn-label border" onClick={() => setIsModalOpen(false)}>
                                        <i className="fas fa-times label-icon"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-soft-success btn-label border">
                                        <i className="fas fa-save label-icon"></i> {t('saveButton')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
