'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/AuthContext';
import { showSwal, toastSwal } from '@/app/utils/swal';

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
            showSwal({ title: 'Hata', text: 'Veriler yüklenirken bir sorun oluştu.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;

        if (formData.productId === 0 || formData.ingredientId === 0 || formData.quantity <= 0) {
            showSwal({ title: 'Hata', text: 'Lütfen ürün, hammadde ve geçerli bir miktar seçiniz.', icon: 'warning' });
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData, quantity: Number(formData.quantity) };

            if (formData.id === 0) {
                const { id, ...postData } = payload;
                await axios.post('http://localhost:3050/recipes', postData, config);
                toastSwal({ title: 'Başarılı!', text: 'Reçete içeriği eklendi.', icon: 'success' });
            } else {
                await axios.put(`http://localhost:3050/recipes/${formData.id}`, payload, config);
                toastSwal({ title: 'Başarılı!', text: 'Reçete içeriği güncellendi.', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving recipe', error);
            showSwal({ title: 'Hata', text: error?.response?.data?.message || 'Reçete kaydedilemedi.', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: "Bu reçete içeriğini silmek istediğinize emin misiniz?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal'
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`http://localhost:3050/recipes/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: 'Silindi!', text: 'Reçete içeriği başarıyla silindi.', icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting recipe', error);
                showSwal({ title: 'Hata', text: 'Reçete içeriği silinirken bir sorun oluştu.', icon: 'error' });
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
                                REÇETE YÖNETİMİ
                            </h3>
                            <div className="h-1 w-1/3 bg-gradient-to-r from-orange-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
                                Ürün içerikleri ve hammadde düşüm kuralları.
                            </h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-500/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni İçerik Ekle
                        </button>
                        <button onClick={() => router.push('/admin')} className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                            <i className="fat fa-arrow-left"></i> Geri Dön
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-[0_8px_30px_-5px_rgba(249,115,22,0.3)] hover:scale-[1.02] cursor-pointer group">
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 drop-shadow-sm">
                                <i className="fat fa-bookmark text-orange-400/70"></i> Toplam Reçete Kalemi
                            </p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white drop-shadow-sm leading-none">{recipes.length}</h3>
                        </div>
                        <div className="relative z-10 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-orange-100 dark:border-orange-500/20">
                            <i className="fat fa-clipboard-list text-3xl group-hover:scale-110 transition-transform duration-300"></i>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-[0_8px_30px_-5px_rgba(244,63,94,0.3)] hover:scale-[1.02] cursor-pointer group">
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 drop-shadow-sm">
                                <i className="fat fa-sparkles text-rose-400/70"></i> Reçeteli Ürün Sayısı
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
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Reçeteler Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-sm">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '60px' }}>ID</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Temel Ürün</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">İçerik (Hammadde)</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kullanım Miktarı</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {recipes.map(recipe => (
                                        <tr key={recipe.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-8 py-4 text-sm font-black text-slate-400">#{recipe.id}</td>
                                            <td className="px-8 py-4">
                                                <div className="flex flex-col justify-center">
                                                    <span className="font-bold text-slate-800 dark:text-white capitalize">{recipe.product?.name || '-'}</span>
                                                    <span className="text-xs font-semibold text-slate-500">{recipe.product?.category || 'Kategori Yok'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20">
                                                    <i className="fat fa-leaf text-orange-500/60 text-xs"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">{recipe.ingredient?.name || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className="font-mono text-sm font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900/50 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                                                    {Number(recipe.quantity).toFixed(3)} {recipe.unit}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(recipe)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-500 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(recipe.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-500 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center">
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
                                                    <i className="fat fa-clipboard-list-check text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Kayıtlı Reçete Bulunamadı</p>
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-orange-500`}></i>
                                    {formData.id === 0 ? 'YENİ REÇETE KALEMİ' : 'REÇETE DÜZENLE'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ürünün içinde kullanılacak hammaddeyi belirleyin</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all hover:scale-105 active:scale-95">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Satılan Ürün (Ana Ürün)</label>
                                    <div className="relative">
                                        <i className="fat fa-mug-hot absolute left-4 top-4 text-orange-500/50"></i>
                                        <select required value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                            <option value={0} disabled>Ürün Seçiniz...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.category || 'Kat. Yok'})</option>
                                            ))}
                                        </select>
                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">İçerik (Hammadde)</label>
                                    <div className="relative">
                                        <i className="fat fa-leaf text-orange-500/50 absolute left-4 top-4"></i>
                                        <select required value={formData.ingredientId} onChange={(e) => setFormData({ ...formData, ingredientId: Number(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                            <option value={0} disabled>Hammadde Seçiniz...</option>
                                            {products.filter(p => (p as any).isIngredient && p.id !== formData.productId).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Miktar</label>
                                    <div className="relative">
                                        <i className="fat fa-weight-scale absolute left-4 top-3.5 text-orange-500/50"></i>
                                        <input type="number" step="0.001" min="0.001" required value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Birim</label>
                                    <div className="relative">
                                        <i className="fat fa-scale-unbalanced absolute left-4 top-4 text-orange-500/50"></i>
                                        <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                            <option value="gr">Gram (gr)</option>
                                            <option value="kg">Kilogram (kg)</option>
                                            <option value="ml">Mililitre (ml)</option>
                                            <option value="lt">Litre (lt)</option>
                                            <option value="adet">Adet</option>
                                            <option value="porsiyon">Porsiyon</option>
                                        </select>
                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex flex-col sm:flex-row gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-1/3 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    İPTAL ET
                                </button>
                                <button type="submit" className="w-full sm:w-2/3 py-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    REÇETE KALEMİNİ KAYDET
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
