'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface SetGroupItem {
    id?: number;
    productId: number;
    priceMode: string;
    priceDiff: number;
    isDefault: boolean;
    isActive: boolean;
    entitlementCost?: number;
}

interface SetGroup {
    id?: number;
    groupName: string;
    minSelect: number;
    maxSelect: number;
    selectionSource: string;
    items: SetGroupItem[];
}

interface SetMenu {
    id?: number;
    setType: string;
    bundleEntitlementLimit?: number;
    isActive: boolean;
    showAsParent: boolean;
    splitToSubItems: boolean;
    groups: SetGroup[];
}

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
    isSet: boolean;
    productTypeId?: number | null;
    outputProfileId?: number | null;
    setMenu?: SetMenu;
}

export function PageClient() {
    const t = useTranslations('Products'); 
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'genel' | 'kurallar'>('genel');
    const [formData, setFormData] = useState<Product>({
        id: 0,
        name: '',
        sku: '',
        price: 0,
        category: '',
        isActive: true,
        isSet: true,
        printerId: null,
        productTypeId: null,
        outputProfileId: null,
        setMenu: {
            setType: 'FIX',
            bundleEntitlementLimit: 0,
            isActive: true,
            showAsParent: true,
            splitToSubItems: false,
            groups: []
        }
    });

    useEffect(() => {
        if (user?.token) fetchData();
        else if (user === null) setLoading(false);
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');
            const [prodRes, depRes] = await Promise.all([
                axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${user.token}` } })
            ]);
            setAllProducts(prodRes.data);
            setProducts(prodRes.data.filter((p: any) => p.isSet));
            setDepartments(depRes.data);
        } catch (error) {
            console.error(error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData, price: Number(formData.price), isSet: true };

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
                const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');
                await axios.delete(`${API_URL}/products/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: tc('deleted'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error) {
                showSwal({ title: tc('error'), text: tc('deleteError'), icon: 'error' });
            }
        }
    };

    const openModal = (prod?: Product) => {
        if (prod) {
            // Ensure setMenu exists when editing an old product that was marked `isSet` without setup
            const mergedProd = {
                ...prod, 
                setMenu: prod.setMenu || { setType: 'FIX', isActive: true, showAsParent: true, splitToSubItems: false, groups: [] }
            };
            setFormData(mergedProd);
        } else {
            setFormData({
                id: 0, name: '', sku: `SET-${Date.now().toString().slice(-6)}`, price: 0, category: '', isActive: true, isSet: true,
                setMenu: { setType: 'FIX', bundleEntitlementLimit: 0, isActive: true, showAsParent: true, splitToSubItems: false, groups: [] }
            });
        }
        setActiveTab('genel');
        setIsModalOpen(true);
    };

    const addGroup = () => {
        setFormData(prev => ({
            ...prev,
            setMenu: {
                ...prev.setMenu!,
                groups: [...(prev.setMenu?.groups || []), { groupName: 'Yeni Seçim Grubu', minSelect: 1, maxSelect: 1, selectionSource: 'PRODUCT', items: [] }]
            }
        }));
    };

    const removeGroup = (idx: number) => {
        setFormData(prev => {
            const newGroups = [...(prev.setMenu?.groups || [])];
            newGroups.splice(idx, 1);
            return { ...prev, setMenu: { ...prev.setMenu!, groups: newGroups } };
        });
    };

    const updateGroup = (idx: number, field: string, value: any) => {
        setFormData(prev => {
            const newGroups = [...(prev.setMenu?.groups || [])];
            newGroups[idx] = { ...newGroups[idx], [field]: value };
            return { ...prev, setMenu: { ...prev.setMenu!, groups: newGroups } };
        });
    };

    const addItemToGroup = (gIdx: number, productId: number) => {
        if (!productId) return;
        setFormData(prev => {
            const newGroups = [...(prev.setMenu?.groups || [])];
            if (!newGroups[gIdx].items.find(i => i.productId === productId)) {
                newGroups[gIdx].items.push({ productId, priceMode: 'INCLUDED', priceDiff: 0, isDefault: false, isActive: true, entitlementCost: 1 });
            }
            return { ...prev, setMenu: { ...prev.setMenu!, groups: newGroups } };
        });
    };

    const removeItemFromGroup = (gIdx: number, iIdx: number) => {
        setFormData(prev => {
            const newGroups = [...(prev.setMenu?.groups || [])];
            newGroups[gIdx].items.splice(iIdx, 1);
            return { ...prev, setMenu: { ...prev.setMenu!, groups: newGroups } };
        });
    };

    const updateItemInGroup = (gIdx: number, iIdx: number, field: string, value: any) => {
        setFormData(prev => {
            const newGroups = [...(prev.setMenu?.groups || [])];
            newGroups[gIdx].items[iIdx] = { ...newGroups[gIdx].items[iIdx], [field]: value };
            return { ...prev, setMenu: { ...prev.setMenu!, groups: newGroups } };
        });
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-layer-group text-teal-600 dark:text-teal-400 text-5xl mr-3"></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-teal-600 dark:text-teal-400 uppercase tracking-[0.2em]">SET MENÜLER</h3>
                            <h5 className="text-slate-400 mt-1 font-medium">Paketler, Seçmeli Menüler ve Kampanyalar</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                        <button onClick={() => openModal()} className="px-6 py-3 bg-teal-50 text-teal-600 border border-teal-200 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-teal-100 transition-all flex items-center gap-2">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Set Menü
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Menü Adı</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4">Fiyat</th>
                                    <th className="px-6 py-4">Tip</th>
                                    <th className="px-6 py-4 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors group">
                                        <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-200 text-lg uppercase">{p.name}</td>
                                        <td className="px-6 py-4 font-bold text-sm text-slate-500">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm">
                                                <i className="fat fa-tag text-teal-500 dark:text-teal-400"></i> {p.category || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-teal-600 dark:text-teal-400 text-lg">₺{p.price}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${p.setMenu?.setType === 'FIX' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : p.setMenu?.setType === 'CHOICE' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'}`}>
                                                {p.setMenu?.setType === 'FIX' ? 'Fiks Menü' : p.setMenu?.setType === 'CHOICE' ? 'Seçmeli' : 'Kampanya'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openModal(p)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-colors">
                                                    <i className="fat fa-pen-field"></i>
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-colors">
                                                    <i className="fat fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200 dark:border-slate-700">
                                                    <i className="fat fa-inbox-out text-4xl text-slate-300 dark:text-slate-600"></i>
                                                </div>
                                                <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] text-sm">SET MENÜ BULUNAMADI</p>
                                                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Henüz bir set menü tanımlamadınız.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-5xl shadow-2xl flex flex-col h-[820px] max-h-[90vh] overflow-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-teal-600 dark:text-teal-400`}></i>
                                    {formData.id === 0 ? 'YENİ SET MENÜ' : 'MENÜ DÜZENLE'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 flex uppercase tracking-widest mt-1 mb-0">Kurallar ve içerikler</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm transition-all">&times;</button>
                        </div>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 mx-8 mt-8 rounded-2xl shrink-0">
                            <button type="button" onClick={() => setActiveTab('genel')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'genel' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Genel Bilgiler</button>
                            <button type="button" onClick={() => setActiveTab('kurallar')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'kurallar' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Set Kuralları & Ürünler</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 text-left">
                            {activeTab === 'genel' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Menü Adı</label>
                                        <div className="relative">
                                            <i className="fat fa-bowl-food absolute left-4 top-4 text-teal-500/50 dark:text-teal-400/50"></i>
                                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 font-bold focus:ring-4 focus:ring-teal-500/10 outline-none" placeholder="Örn: Tavuk Menü" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Kategori</label>
                                        <div className="relative">
                                            <i className="fat fa-folder-tree absolute left-4 top-4 text-teal-500/50 dark:text-teal-400/50"></i>
                                            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 font-bold focus:ring-4 focus:ring-teal-500/10 outline-none appearance-none">
                                                <option value="">Kategori Seçin</option>
                                                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                            <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 dark:text-slate-500 pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Fiyat (Satış Bedeli)</label>
                                        <div className="relative">
                                            <i className="fat fa-money-bill-1-wave absolute left-4 top-4 text-teal-500/50 dark:text-teal-400/50"></i>
                                            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 font-bold focus:ring-4 focus:ring-teal-500/10 outline-none text-teal-600 dark:text-teal-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Stok Kodu (SKU)</label>
                                        <div className="relative">
                                            <i className="fat fa-barcode-read absolute left-4 top-4 text-teal-500/50 dark:text-teal-400/50"></i>
                                            <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 font-bold font-mono focus:ring-4 focus:ring-teal-500/10 outline-none uppercase" />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Görsel URL</label>
                                        <div className="relative flex gap-3">
                                            <i className="fat fa-image absolute left-4 top-4 text-teal-500/50 dark:text-teal-400/50"></i>
                                            <input type="text" value={formData.imageUrl || ''} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="flex-1 w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 font-bold focus:ring-4 focus:ring-teal-500/10 outline-none" placeholder="https:// veya Base64..." />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'kurallar' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-start gap-4">
                                        <div className="w-full max-w-sm">
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">SET TİPİ</label>
                                            <div className="relative">
                                                <i className="fat fa-code-merge absolute left-4 top-4 text-indigo-500/50 dark:text-indigo-400/50"></i>
                                                <select value={formData.setMenu?.setType} onChange={e => setFormData({...formData, setMenu: {...formData.setMenu!, setType: e.target.value}})} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-indigo-600 dark:text-indigo-400 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none uppercase transform-wide">
                                                    <option value="FIX">Fiks Menü (Sabit İçerik)</option>
                                                    <option value="CHOICE">Seçmeli Menü</option>
                                                    <option value="BUNDLE">Kampanya / Bundle Set</option>
                                                </select>
                                                <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 dark:text-slate-500 pointer-events-none"></i>
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Fiks Menüler seçim ekranı açmadan doğrudan sepete varsayılanları koyar. Seçmeli Menüler ise zorunlu grupların (Min Seçim) tamamlanmasını bekler.</p>
                                    </div>

                                    {formData.setMenu?.setType === 'BUNDLE' && (
                                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-3xl border border-orange-200 dark:border-orange-700/50 mt-4">
                                            <label className="block text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2 px-1">TÜKETİM HAKKI (LIMIT / ENTITLEMENT)</label>
                                            <div className="relative w-full max-w-sm">
                                                <i className="fat fa-ticket absolute left-4 top-4 text-orange-500/50 dark:text-orange-400/50"></i>
                                                <input type="number" step="0.5" value={formData.setMenu?.bundleEntitlementLimit || 0} onChange={e => setFormData({...formData, setMenu: {...formData.setMenu!, bundleEntitlementLimit: parseFloat(e.target.value)}})} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700/50 rounded-2xl text-orange-600 dark:text-orange-400 font-black focus:ring-4 focus:ring-orange-500/10 outline-none uppercase transform-wide" placeholder="Örn: 4 Hak" />
                                            </div>
                                            <p className="text-xs font-bold text-orange-500 dark:text-orange-500/80 mt-3 mb-0">Bu ürünü alan müşteri toplam kaç hakediş puanına sahip olacak? Örn: 4</p>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Seçim Grupları</h4>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Grup içi ürünleri belirleyin</p>
                                        </div>
                                        <button onClick={addGroup} className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-slate-700 dark:hover:bg-slate-600 transition-all flex items-center gap-2">
                                            <i className="fat fa-plus-circle text-lg"></i> Yeni Grup Ekle
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {formData.setMenu?.groups.map((group, gIdx) => (
                                            <div key={gIdx} className="border border-slate-200 dark:border-slate-700 rounded-[32px] overflow-hidden shadow-sm bg-white dark:bg-slate-900/30">
                                                {/* Group Header */}
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-wrap lg:flex-nowrap gap-4 items-center border-b border-slate-100 dark:border-slate-700">
                                                    <div className="flex-1 min-w-[200px]">
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Grup Adı</label>
                                                        <input type="text" value={group.groupName} onChange={e => updateGroup(gIdx, 'groupName', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-teal-500/10 outline-none" placeholder="Örn: Çorbalar" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Min Seçim</label>
                                                        <input type="number" min="0" value={group.minSelect} onChange={e => updateGroup(gIdx, 'minSelect', Number(e.target.value))} className="w-24 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-teal-500/10 outline-none text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Max Seçim</label>
                                                        <input type="number" min="1" value={group.maxSelect} onChange={e => updateGroup(gIdx, 'maxSelect', Number(e.target.value))} className="w-24 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:ring-4 focus:ring-teal-500/10 outline-none text-center" />
                                                    </div>
                                                    <div className="flex items-end h-full mt-[18px]">
                                                        <button onClick={() => removeGroup(gIdx)} className="w-12 h-[46px] bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-500 dark:hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                                            <i className="fat fa-trash-can text-lg"></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Group Body: Add Item */}
                                                <div className="p-6">
                                                    <div className="flex gap-3 mb-6">
                                                        <div className="relative flex-1">
                                                            <i className="fat fa-leaf text-teal-500/50 absolute left-4 top-3.5"></i>
                                                            <select id={`pSelect-${gIdx}`} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-4 focus:ring-teal-500/10 outline-none appearance-none text-sm">
                                                                <option value="">Ürün Ekle...</option>
                                                                {allProducts.filter(p => !p.isSet).map(p => <option key={p.id} value={p.id}>{p.name} (₺{p.price})</option>)}
                                                            </select>
                                                            <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none text-xs"></i>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const sel = document.getElementById(`pSelect-${gIdx}`) as HTMLSelectElement;
                                                                if(sel.value) addItemToGroup(gIdx, Number(sel.value));
                                                                sel.value = "";
                                                            }}
                                                            className="px-6 py-3 bg-teal-50 text-teal-600 font-black text-xs uppercase tracking-widest border border-teal-200 rounded-xl hover:bg-teal-100 transition-all flex items-center gap-2"
                                                        >
                                                            <i className="fat fa-plus"></i> Ekle
                                                        </button>
                                                    </div>

                                                    {/* Items Table */}
                                                    {group.items.length > 0 && (
                                                        <div className="border border-slate-100 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="bg-slate-100/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50">
                                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ürün</th>
                                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center w-32">Fiyat Farkı (₺)</th>
                                                                        {formData.setMenu?.setType === 'BUNDLE' && (
                                                                            <th className="px-5 py-3 text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest text-center w-28">Puan/Ağırlık</th>
                                                                        )}
                                                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center w-24">Varsayılan?</th>
                                                                        <th className="px-5 py-3 w-16 text-right"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                    {group.items.map((item, iIdx) => {
                                                                        const pName = allProducts.find(p => p.id === item.productId)?.name || 'Bilinmeyen Ürün';
                                                                        return (
                                                                            <tr key={iIdx} className="hover:bg-white dark:hover:bg-slate-800/40 transition-colors">
                                                                                <td className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                                                    {pName}
                                                                                </td>
                                                                                <td className="px-5 py-3 text-center">
                                                                                    <input type="number" value={item.priceDiff} onChange={e => updateItemInGroup(gIdx, iIdx, 'priceDiff', Number(e.target.value))} className="w-full text-center px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-teal-600 dark:text-teal-400 font-black text-sm outline-none focus:border-teal-500" />
                                                                                </td>
                                                                                {formData.setMenu?.setType === 'BUNDLE' && (
                                                                                    <td className="px-5 py-3 text-center bg-orange-50/30 dark:bg-orange-900/10">
                                                                                        <input type="number" step="0.1" value={item.entitlementCost ?? 1} onChange={e => updateItemInGroup(gIdx, iIdx, 'entitlementCost', Number(e.target.value))} className="w-full text-center px-2 py-1.5 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700/50 rounded-lg text-orange-600 dark:text-orange-400 font-black text-sm outline-none focus:border-orange-500" />
                                                                                    </td>
                                                                                )}
                                                                                <td className="px-5 py-3 text-center">
                                                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                                                        <input type="checkbox" checked={item.isDefault} onChange={e => updateItemInGroup(gIdx, iIdx, 'isDefault', e.target.checked)} className="sr-only peer" />
                                                                                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                                                                    </label>
                                                                                </td>
                                                                                <td className="px-5 py-3 text-right">
                                                                                    <button onClick={() => removeItemFromGroup(gIdx, iIdx)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-colors inline-flex items-center justify-center">
                                                                                        <i className="fat fa-trash-can text-xs"></i>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {(!formData.setMenu?.groups || formData.setMenu.groups.length === 0) && (
                                            <div className="text-center py-10 opacity-60 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[32px]">
                                                <i className="fat fa-layer-group text-5xl mb-3 text-slate-400 dark:text-slate-600"></i>
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0">Henüz Grup Eklenmedi</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all">İptal</button>
                            <button onClick={handleSave} className="px-10 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-teal-500/30 transition-all flex items-center gap-2">
                                <i className="fat fa-check-circle"></i> Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
