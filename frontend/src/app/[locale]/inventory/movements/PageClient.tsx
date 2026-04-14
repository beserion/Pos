'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

export function PageClient() {
    const t = useTranslations('StockMovements');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();

    const [movements, setMovements] = useState<any[]>([]);
    const [stockCards, setStockCards] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterStockCard, setFilterStockCard] = useState('');
    const [filterType, setFilterType] = useState('');
    const [limit, setLimit] = useState(100);

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const [manualForm, setManualForm] = useState({
        stockCardId: 0,
        movementType: 'MANUAL_IN',
        quantity: '',
        warehouseId: -1,
        description: ''
    });

    const [transferForm, setTransferForm] = useState({
        stockCardId: 0,
        fromWarehouseId: -1,
        toWarehouseId: -1,
        quantity: '',
        description: ''
    });

    const movementTypes = [
        { id: 'MANUAL_IN', label: 'Manuel Giriş' },
        { id: 'MANUAL_OUT', label: 'Manuel Çıkış' },
        { id: 'WASTAGE', label: 'Fire' },
        { id: 'STAFF_CONSUME', label: 'Personel Tüketimi' },
        { id: 'COMPLIMENTARY', label: 'İkram' },
        { id: 'PURCHASE', label: 'Alış / Fatura' }
    ];

    useEffect(() => {
        if (user?.token) {
            fetchFilters();
            fetchData();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, filterStockCard, filterType, limit]);

    const fetchFilters = async () => {
        if (!user?.token) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const [cardsRes, whRes] = await Promise.all([
                axios.get(`${API_URL}/stock-cards?limit=1000`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/warehouses`, { headers: { Authorization: `Bearer ${user.token}` } }).catch(() => ({ data: [] }))
            ]);
            setStockCards(cardsRes.data.data || []);
            setWarehouses(whRes.data || []);
        } catch (error) {
            console.error('Error fetching filters', error);
        }
    };

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';

            let query = `?limit=${limit}`;
            if (filterStockCard) query += `&stockCardId=${filterStockCard}`;
            if (filterType) query += `&movementType=${filterType}`;

            const res = await axios.get(`${API_URL}/stock-movements${query}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setMovements(res.data.data || []);
        } catch (error) {
            console.error('Error fetching movements', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;

        if (manualForm.stockCardId === 0 || !manualForm.quantity || parseFloat(manualForm.quantity) <= 0) {
            showSwal({ title: 'Hata', text: 'Lütfen geçerli bir stok kartı ve miktar giriniz.', icon: 'warning' });
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';

            // Get selected card to find unit
            const card = stockCards.find(c => c.id === manualForm.stockCardId);

            const payload = {
                ...manualForm,
                quantity: parseFloat(manualForm.quantity),
                warehouseId: manualForm.warehouseId !== -1 ? manualForm.warehouseId : null,
                unit: card?.baseUnit || 'adet'
            };

            await axios.post(`${API_URL}/stock-movements/manual`, payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            toastSwal({ title: 'Başarılı', text: 'Hareket kaydedildi.', icon: 'success' });
            setIsManualModalOpen(false);
            setManualForm({ ...manualForm, quantity: '', description: '' }); // reset some fields
            fetchData(); // refresh list
        } catch (error: any) {
            console.error('Error creating manual movement', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Kayıt başarısız.', icon: 'error' });
        }
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;

        if (transferForm.stockCardId === 0 || transferForm.fromWarehouseId === -1 || transferForm.toWarehouseId === -1 || !transferForm.quantity || parseFloat(transferForm.quantity) <= 0) {
            showSwal({ title: 'Hata', text: 'Tüm alanları eksiksiz bir şekilde doldurunuz.', icon: 'warning' });
            return;
        }

        if (transferForm.fromWarehouseId === transferForm.toWarehouseId) {
            showSwal({ title: 'Hata', text: 'Kaynak ve hedef depo aynı olamaz.', icon: 'warning' });
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';

            const payload = {
                ...transferForm,
                quantity: parseFloat(transferForm.quantity)
            };

            await axios.post(`${API_URL}/stock-movements/transfer`, payload, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            toastSwal({ title: 'Başarılı', text: 'Transfer kaydedildi.', icon: 'success' });
            setIsTransferModalOpen(false);
            setTransferForm({ ...transferForm, quantity: '', description: '' });
            fetchData();
        } catch (error: any) {
            console.error('Error creating transfer', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Transfer başarısız.', icon: 'error' });
        }
    };

    const getTypeStyle = (type: string) => {
        // determines styling for movement types
        if (type === 'PURCHASE' || type === 'MANUAL_IN' || type === 'COUNT_SURPLUS') {
            return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' };
        }
        if (type === 'RECIPE_CONSUME' || type === 'MANUAL_OUT' || type === 'COUNT_DEFICIT' || type === 'WASTAGE' || type === 'STAFF_CONSUME') {
            return { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' };
        }
        if (type === 'RECIPE_REVERSE' || type === 'COMPLIMENTARY') {
            return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20' };
        }
        if (type === 'TRANSFER_IN' || type === 'TRANSFER_OUT') {
            return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20' };
        }
        return { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' };
    };

    const formatTypeLabel = (type: string) => {
        const dictionary: Record<string, string> = {
            'PURCHASE': 'Alış / Giriş',
            'RECIPE_CONSUME': 'Reçete Tüketimi (Satış)',
            'RECIPE_REVERSE': 'Satış İptal İadesi',
            'MANUAL_IN': 'Manuel Giriş',
            'MANUAL_OUT': 'Manuel Çıkış',
            'WASTAGE': 'Fire',
            'STAFF_CONSUME': 'Personel Tüketimi',
            'COMPLIMENTARY': 'İkram',
            'TRANSFER_IN': 'Depo Girişi (Transfer)',
            'TRANSFER_OUT': 'Depo Çıkışı (Transfer)',
            'COUNT_SURPLUS': 'Sayım Fazlası',
            'COUNT_DEFICIT': 'Sayım Eksiği',
            'PRODUCTION': 'Üretim',
            'PRODUCTION_CONSUME': 'Üretim Tüketimi'
        };
        return dictionary[type] || type;
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 mb-6">
                    <div className="flex items-center gap-4">
                        <i className="fat fa-arrow-right-arrow-left text-blue-500/80 drop-shadow-sm transition-transform hover:scale-110 hover:rotate-3 duration-300 ease-out" style={{ fontSize: '50px' }}></i>
                        <div className="flex flex-col">
                            <h3 className="mb-0 text-3xl font-extralight text-blue-600 dark:text-blue-400 leading-none uppercase tracking-[0.25em]">
                                Stok Hareketleri
                            </h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-blue-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                Tüm Stok Giriş, Çıkış ve Transfer İşlemleri
                            </h5>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setIsTransferModalOpen(true)} className="px-5 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all flex items-center gap-2 active:scale-95">
                            <i className="fat fa-truck-moving text-base"></i> Depolar Arası Transfer
                        </button>
                        <button onClick={() => router.push(`/${locale}/inventory/`)} className="px-6 py-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-3xl border border-white dark:border-slate-700/50 shadow-sm shrink-0 mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <i className="fat fa-filter text-slate-400 ml-2"></i>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Filtreler</span>
                    </div>

                    <div className="relative min-w-[200px] flex-1 md:flex-none">
                        <select value={filterStockCard} onChange={(e) => setFilterStockCard(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm focus:border-blue-500 outline-none appearance-none">
                            <option value="">Tüm Stok Kartları</option>
                            {stockCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <i className="fat fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                    </div>

                    <div className="relative min-w-[200px] flex-1 md:flex-none">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm focus:border-blue-500 outline-none appearance-none">
                            <option value="">Tüm İşlem Tipleri</option>
                            <option value="PURCHASE">Alış / Girişler</option>
                            <option value="RECIPE_CONSUME">Reçete Tüketimleri</option>
                            <option value="RECIPE_REVERSE">Satış İptal İadeleri</option>
                            <option value="TRANSFER_IN">Transferler</option>
                            <option value="COUNT_DEFICIT">Sayım Farkları</option>
                        </select>
                        <i className="fat fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                    </div>

                    <div className="relative min-w-[120px]">
                        <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm focus:border-blue-500 outline-none appearance-none">
                            <option value="50">Son 50</option>
                            <option value="100">Son 100</option>
                            <option value="500">Son 500</option>
                        </select>
                        <i className="fat fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                    </div>
                </div>

                {/* Data Grid */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-sm rounded-[32px] flex flex-col">
                        <div className="overflow-auto min-h-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Tarih</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Kartı</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem Tipi</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Miktar</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hareket Sonrası Stok</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Açıklama / Referans</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {movements.map(mov => {
                                        const styles = getTypeStyle(mov.movementType);
                                        const isPositive = mov.quantity > 0;

                                        return (
                                            <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white">
                                                            {new Date(mov.createdAt).toLocaleDateString('tr-TR')}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                            {new Date(mov.createdAt).toLocaleTimeString('tr-TR')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                                                            <i className="fat fa-box text-xs"></i>
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300 leading-tight">
                                                            {mov.stockCard?.name} <span className="text-[10px] text-slate-400 font-normal">({mov.stockCard?.code})</span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border w-max flex items-center gap-1.5 ${styles.bg} ${styles.color}`}>
                                                        {formatTypeLabel(mov.movementType)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className={`text-base font-black tracking-tight ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {isPositive ? '+' : ''}{mov.quantity} <span className="text-xs uppercase ml-1 opacity-70">{mov.unit}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="text-sm font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                                                        {mov.stockAfter} <span className="text-xs uppercase">{mov.unit}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col gap-1 max-w-xs">
                                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 m-0 truncate" title={mov.description}>
                                                            {mov.description || '-'}
                                                        </p>
                                                        {mov.warehouse && (
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest inline-flex items-center gap-1">
                                                                <i className="fat fa-building text-slate-300"></i> {mov.warehouse.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {movements.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center p-12 opacity-50">
                                                <i className="fat fa-file-invoice text-4xl text-slate-400 mb-3"></i>
                                                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Stok hareketi bulunamadı</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Movement Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-plus-circle text-blue-500"></i> YENİ STOK HAREKETİ
                                </h2>
                            </div>
                            <button onClick={() => setIsManualModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 transition-all shadow-sm">&times;</button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[70vh]">
                            <form id="manualForm" onSubmit={handleManualSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">İşlem Tipi</label>
                                    <select required value={manualForm.movementType} onChange={(e) => setManualForm({ ...manualForm, movementType: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:border-blue-500 outline-none">
                                        {movementTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Stok Kartı</label>
                                    <select required value={manualForm.stockCardId} onChange={(e) => setManualForm({ ...manualForm, stockCardId: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:border-blue-500 outline-none">
                                        <option value={0}>Seçiniz...</option>
                                        {stockCards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.baseUnit})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Depo (Opsiyonel)</label>
                                        <select value={manualForm.warehouseId} onChange={(e) => setManualForm({ ...manualForm, warehouseId: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:border-blue-500 outline-none">
                                            <option value={-1}>Genel</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Miktar</label>
                                        <input type="number" step="any" required value={manualForm.quantity} onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-black text-center text-slate-800 dark:text-white focus:border-blue-500 outline-none shadow-inner" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Açıklama</label>
                                    <textarea value={manualForm.description} onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:border-blue-500 outline-none resize-none" placeholder="İşlem nedeni..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50/50 dark:bg-slate-900/20">
                            <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-600 transition-all hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">İPTAL</button>
                            <button type="submit" form="manualForm" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all">KAYDET</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        <div className="p-6 border-b border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-truck-moving text-indigo-500"></i> DEPOLAR ARASI TRANSFER
                                </h2>
                            </div>
                            <button onClick={() => setIsTransferModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 transition-all shadow-sm">&times;</button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[70vh]">
                            <form id="transferForm" onSubmit={handleTransferSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Stok Kartı</label>
                                    <select required value={transferForm.stockCardId} onChange={(e) => setTransferForm({ ...transferForm, stockCardId: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:border-indigo-500 outline-none">
                                        <option value={0}>Seçiniz...</option>
                                        {stockCards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.baseUnit})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-end relative">
                                    <div>
                                        <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 px-1">ÇIKIŞ (Kaynak Depo)</label>
                                        <select required value={transferForm.fromWarehouseId} onChange={(e) => {
                                            const newFromId = parseInt(e.target.value);
                                            setTransferForm(prev => ({
                                                ...prev,
                                                fromWarehouseId: newFromId,
                                                toWarehouseId: prev.toWarehouseId === newFromId ? -1 : prev.toWarehouseId
                                            }));
                                        }} className="w-full px-2 py-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/50 rounded-xl text-sm font-bold text-rose-900 dark:text-rose-300 focus:border-rose-500 outline-none">
                                            <option value={-1}>Seçiniz...</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id} disabled={transferForm.toWarehouseId !== -1 && w.id === transferForm.toWarehouseId}>
                                                    {w.name} {transferForm.toWarehouseId !== -1 && w.id === transferForm.toWarehouseId ? '(Hedef Seçili)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="absolute left-[calc(50%-12px)] mb-2 z-10 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md pointer-events-none">
                                        <i className="fat fa-arrow-right text-[10px]"></i>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 px- text-right">GİRİŞ (Hedef Depo)</label>
                                        <select required value={transferForm.toWarehouseId} onChange={(e) => {
                                            const newToId = parseInt(e.target.value);
                                            setTransferForm(prev => ({
                                                ...prev,
                                                toWarehouseId: newToId,
                                                fromWarehouseId: prev.fromWarehouseId === newToId ? -1 : prev.fromWarehouseId
                                            }));
                                        }} className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-sm font-bold text-emerald-900 dark:text-emerald-300 focus:border-emerald-500 outline-none">
                                            <option value={-1}>Seçiniz...</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id} disabled={transferForm.fromWarehouseId !== -1 && w.id === transferForm.fromWarehouseId}>
                                                    {w.name} {transferForm.fromWarehouseId !== -1 && w.id === transferForm.fromWarehouseId ? '(Kaynak Seçili)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Miktar</label>
                                    <input type="number" step="any" required value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-black text-center text-slate-800 dark:text-white focus:border-indigo-500 outline-none shadow-inner" placeholder="Transfer Miktarı" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Açıklama</label>
                                    <textarea value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:border-indigo-500 outline-none resize-none" placeholder="Not (Opsiyonel)"></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50/50 dark:bg-slate-900/20">
                            <button type="button" onClick={() => setIsTransferModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-600 transition-all hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">İPTAL</button>
                            <button type="submit" form="transferForm" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-all flex justify-center items-center gap-2">
                                <i className="fat fa-truck-moving"></i> TRANSFERİ BAŞLAT
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
