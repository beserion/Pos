'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import SearchableSelect from '@/components/SearchableSelect';
import { API_URL } from '@/lib/apiConfig';

interface StockMovement {
    id: number;
    stockCardId: number;
    stockCardName?: string;
    warehouseId: number;
    warehouseName?: string;
    movementType: string;
    qtyIn: number;
    qtyOut: number;
    qtyBefore: number;
    businessDate: string;
    documentNo: string;
    sourceType: string;
    createdAt: string;
}

export function PageClient() {
    const t = useTranslations('StockCards'); // Reusing some translations
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user, hasFeature } = useAuth();
    
    
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [stockCards, setStockCards] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [stockCardFilter, setStockCardFilter] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        stockCardId: 0,
        warehouseId: 0,
        qty: 1,
        movementType: 'adjustment',
        description: '',
        documentNo: ''
    });

    useEffect(() => {
        if (user?.token && hasFeature('inventory_system')) {
            fetchInitialData();
            fetchMovements();
        }
    }, [user, page, stockCardFilter, warehouseFilter, typeFilter, hasFeature]);

    const fetchInitialData = async () => {
        try {
            const [scRes, whRes] = await Promise.all([
                axios.get(`${API_URL}/stock-cards?limit=1000`, { headers: { Authorization: `Bearer ${user?.token}` } }),
                axios.get(`${API_URL}/warehouses`, { headers: { Authorization: `Bearer ${user?.token}` } })
            ]);
            setStockCards(scRes.data.data || []);
            setWarehouses(whRes.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });
            if (stockCardFilter) params.append('stockCardId', stockCardFilter);
            if (warehouseFilter) params.append('warehouseId', warehouseFilter);
            if (typeFilter) params.append('movementType', typeFilter);

            const res = await axios.get(`${API_URL}/stock-movements?${params.toString()}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setMovements(res.data.data);
            setTotalPages(res.data.lastPage || 1);
        } catch (error) {
            console.error(error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/stock-movements/manual`, formData, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            setIsAddModalOpen(false);
            fetchMovements();
        } catch (error: any) {
            showSwal({ title: tc('error'), text: error.response?.data?.message || tc('saveError'), icon: 'error' });
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'purchase': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'sale': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'transfer': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
            case 'waste': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    if (user && !hasFeature('inventory_system')) {
        return (
            <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pt-20 text-start">
                <PremiumModuleLocked moduleName="Stok Hareketleri Sistemi" featureKey="inventory_system" />
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300 text-start">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-truck-ramp-box me-3 text-teal-600 dark:text-teal-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-teal-600 dark:text-teal-400 leading-none uppercase tracking-[0.25em]">STOK HAREKETLERİ</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Stok Giriş, Çıkış ve Transfer İşlemleri</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => {
                            setFormData({ stockCardId: 0, warehouseId: 0, qty: 1, movementType: 'adjustment', description: '', documentNo: '' });
                            setIsAddModalOpen(true);
                        }} className="px-6 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center gap-2">
                            <i className="fat fa-plus-circle text-lg"></i> MANUEL İŞLEM
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin/stock-cards`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-3xl border border-white dark:border-slate-700/50 shadow-sm flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">STOK KARTI</label>
                        <div className="-m-2 w-full mt-1">
                            <SearchableSelect
                                value={stockCardFilter}
                                onChange={(val) => { setStockCardFilter(val.toString()); setPage(1); }}
                                options={[
                                    { value: '', label: 'Tümü' },
                                    ...stockCards.map(sc => ({ value: sc.id.toString(), label: sc.name }))
                                ]}
                            />
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-3xl border border-white dark:border-slate-700/50 shadow-sm flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DEPO</label>
                        <div className="-m-2 w-full mt-1">
                            <SearchableSelect
                                value={warehouseFilter}
                                onChange={(val) => { setWarehouseFilter(val.toString()); setPage(1); }}
                                options={[
                                    { value: '', label: 'Tümü' },
                                    ...warehouses.map(wh => ({ value: wh.id.toString(), label: wh.name }))
                                ]}
                            />
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-3xl border border-white dark:border-slate-700/50 shadow-sm flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">HAREKET TİPİ</label>
                        <div className="-m-2 w-full mt-1">
                            <SearchableSelect
                                value={typeFilter}
                                onChange={(val) => { setTypeFilter(val.toString()); setPage(1); }}
                                options={[
                                    { value: '', label: 'Tümü' },
                                    { value: 'purchase', label: 'Satın Alma' },
                                    { value: 'sale', label: 'Satış' },
                                    { value: 'waste', label: 'Zayiat' },
                                    { value: 'adjustment', label: 'Düzeltme' },
                                    { value: 'transfer', label: 'Transfer' }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-2xl">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">TARİH</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">STOK KARTI</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">DEPO</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">TİP</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ÖNCEKİ</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">GİRİŞ</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">ÇIKIŞ</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SONUÇ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {movements.map(mov => (
                                        <tr key={mov.id} className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-all group">
                                            <td className="px-8 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                                        {new Date(mov.businessDate).toLocaleDateString('tr-TR')}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {new Date(mov.createdAt).toLocaleTimeString('tr-TR')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">
                                                {mov.stockCardName || mov.stockCardId}
                                            </td>
                                            <td className="px-8 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight text-sm">
                                                {mov.warehouseName || mov.warehouseId}
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${getTypeColor(mov.movementType)}`}>
                                                    {mov.movementType}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-center font-bold text-slate-400">{mov.qtyBefore}</td>
                                            <td className="px-8 py-4 text-center font-black text-emerald-600">{mov.qtyIn > 0 ? `+${mov.qtyIn}` : '-'}</td>
                                            <td className="px-8 py-4 text-center font-black text-red-500">{mov.qtyOut > 0 ? `-${mov.qtyOut}` : '-'}</td>
                                            <td className="px-8 py-4 text-center font-black text-slate-700 dark:text-white bg-slate-100/50 dark:bg-slate-900/50">
                                                {mov.qtyBefore + mov.qtyIn - mov.qtyOut}
                                            </td>
                                        </tr>
                                    ))}
                                    {movements.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Hareket kaydı bulunamadı</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sayfa {page} / {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-100 disabled:opacity-30" disabled={page <= 1}>
                                    <i className="fat fa-chevron-left text-xs"></i>
                                </button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-100 disabled:opacity-30" disabled={page >= totalPages}>
                                    <i className="fat fa-chevron-right text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for Manual Entry */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-plus-circle text-teal-600"></i>
                                    MANUEL STOK HAREKETİ
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Eksik/Fazla veya Düzeltme Girişi</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSaveManual} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">STOK KARTI</label>
                                    <div className="-m-2 w-full mt-1">
                                        <SearchableSelect
                                            value={(formData.stockCardId || '').toString()}
                                            onChange={(val) => setFormData({ ...formData, stockCardId: parseInt(val) })}
                                            options={[
                                                { value: '', label: 'Seçiniz' },
                                                ...stockCards.map(sc => ({ value: sc.id.toString(), label: sc.name }))
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">DEPO</label>
                                    <div className="-m-2 w-full mt-1">
                                        <SearchableSelect
                                            value={(formData.warehouseId || '').toString()}
                                            onChange={(val) => setFormData({ ...formData, warehouseId: parseInt(val) })}
                                            options={[
                                                { value: '', label: 'Seçiniz' },
                                                ...warehouses.map(wh => ({ value: wh.id.toString(), label: wh.name }))
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">HAREKET TİPİ</label>
                                    <div className="-m-2 w-full mt-1">
                                        <SearchableSelect
                                            value={formData.movementType}
                                            onChange={(val) => setFormData({ ...formData, movementType: val.toString() })}
                                            options={[
                                                { value: 'adjustment', label: 'Düzeltme (Adjustment)' },
                                                { value: 'purchase', label: 'Satın Alma (In)' },
                                                { value: 'waste', label: 'Zayiat (Out)' }
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">MİKTAR</label>
                                    <input 
                                        type="number" 
                                        step="0.001" 
                                        required
                                        value={formData.qty} 
                                        onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">AÇIKLAMA</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-teal-500/10 outline-none min-h-[100px]"
                                    placeholder="Neden bu hareketi yapıyorsunuz?..."
                                />
                            </div>

                            <button type="submit" className="w-full py-4 bg-teal-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-teal-500/20 hover:bg-teal-700 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                HAREKETİ KAYDET
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
