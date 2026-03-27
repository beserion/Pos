'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface PageClientProps {
    sessionId: number;
}

export function PageClient({ sessionId }: PageClientProps) {
    const t = useTranslations('InventoryCount');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    
    const [session, setSession] = useState<any>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, COUNTED, UNCOUNTED, HAS_DIFF
    const [categories, setCategories] = useState<string[]>([]);
    
    // Auto-save timer
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [pendingChanges, setPendingChanges] = useState<{ [id: number]: any }>({});
    
    // Bar helper modal
    const [helperModalOpen, setHelperModalOpen] = useState(false);
    const [activeLineForHelper, setActiveLineForHelper] = useState<any>(null);
    const [helperClosedQty, setHelperClosedQty] = useState(0);
    const [helperOpenQty, setHelperOpenQty] = useState(0);

    useEffect(() => {
        if (user?.token) {
            fetchSession();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, sessionId]);

    const fetchSession = async () => {
        if (!user?.token || !sessionId) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const res = await axios.get(`${API_URL}/inventory-sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            
            setSession(res.data);
            setLines(res.data.lines || []);
            
            // Extract categories
            const cats = new Set<string>();
            res.data.lines?.forEach((l: any) => {
                if (l.stockCard?.category) cats.add(l.stockCard.category);
            });
            setCategories(Array.from(cats));
            
        } catch (error: any) {
            console.error('Error fetching session', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Sayım fişi bulunamadı.', icon: 'error' });
            router.push(`/${locale}/inventory/count`);
        } finally {
            setLoading(false);
        }
    };
    
    const triggerAutoSave = () => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        
        autoSaveTimerRef.current = setTimeout(async () => {
            await saveDraft(true); // true = silent background map
        }, 3000);
    };

    const handleLineChange = (lineId: number, field: string, value: any) => {
        if (session?.status !== 'DRAFT' && session?.status !== 'IN_PROGRESS') return;
        
        const updatedLines = lines.map(line => {
            if (line.id === lineId) {
                const updated = { ...line, [field]: value };
                
                // If they changing countedQty, automatically mark as counted
                if (field === 'countedQty' && value !== null && value !== '') {
                    updated.isCounted = true;
                    // Note: Difference calculation is usually done in backend, but we can optimistically calculate for UI
                    const parsedVal = parseFloat(value) || 0;
                    updated.differenceQty = parsedVal - parseFloat(updated.theoreticalQty || 0);
                    updated.differenceCost = updated.differenceQty * parseFloat(updated.unitCost || 0);
                }
                
                // Mark for pending save
                setPendingChanges(prev => ({
                    ...prev,
                    [lineId]: {
                        countedQty: field === 'countedQty' ? (value === '' ? null : parseFloat(value)) : line.countedQty,
                        description: field === 'description' ? value : line.description,
                        isCounted: field === 'isCounted' ? value : (field === 'countedQty' ? true : line.isCounted)
                    }
                }));
                
                return updated;
            }
            return line;
        });
        
        setLines(updatedLines);
        triggerAutoSave();
    };

    const saveDraft = async (silent = false) => {
        if (!user?.token || Object.keys(pendingChanges).length === 0) return;
        
        try {
            if (!silent) setSaving(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            
            const promises = Object.entries(pendingChanges).map(([lineId, data]) => 
                axios.patch(`${API_URL}/inventory-sessions/lines/${lineId}`, data, {
                    headers: { Authorization: `Bearer ${user.token}` }
                })
            );
            
            await Promise.all(promises);
            setPendingChanges({}); // Clear pending changes
            
            if (!silent) {
                toastSwal({ title: 'Kaydedildi', text: 'Taslak başarıyla güncellendi.', icon: 'success' });
                // Re-fetch to get accurate calculations from backend
                await fetchSession();
            }
        } catch (error) {
            console.error('Error saving draft', error);
            if (!silent) showSwal({ title: tc('error'), text: 'Kaydetme sırasında bir hata oluştu.', icon: 'error' });
        } finally {
            if (!silent) setSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!user?.token || !session) return;
        
        // Check if there are uncounted lines
        const uncountedCount = lines.filter(l => !l.isCounted).length;
        
        // Force save any pending changes first
        if (Object.keys(pendingChanges).length > 0) {
            await saveDraft(false);
        }
        
        const result = await showSwal({
            title: 'Sayımı Onayla',
            html: `
                Sayımı onaylamak üzeresiniz. Bu işlem sonucunda stokların seviyeleri güncellenecek ve gerekli sayım fazlası/eksiği hareketleri oluşturulacaktır.<br/><br/>
                ${uncountedCount > 0 ? `<div class="bg-amber-100 text-amber-800 p-3 rounded-lg border border-amber-200"><strong>${uncountedCount} adet sayılmamış stok kartı var.</strong> Bunlar için fark oluşturulmayacak ve mevcut stok seviyeleri korunacaktır.</div>` : ''}
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Onayla ve Uygula',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#10b981'
        });

        if (result.isConfirmed) {
            try {
                setSaving(true);
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.post(`${API_URL}/inventory-sessions/${session.id}/approve`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                
                await showSwal({ title: 'Başarılı', text: 'Sayım onaylandı ve stok hareketleri oluşturuldu.', icon: 'success' });
                fetchSession();
            } catch (error: any) {
                console.error('Error approving session', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Onaylama başarısız.', icon: 'error' });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleCancelSession = async () => {
        if (!user?.token || !session) return;
        
        const result = await showSwal({
            title: 'Sayımı İptal Et',
            text: 'Bu sayım fişini iptal etmek istediğinize emin misiniz? Yapılan tüm girişler silinmez ancak fiş devre dışı kalır.',
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Evet, İptal Et',
            cancelButtonText: 'Vazgeç',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                setSaving(true);
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.post(`${API_URL}/inventory-sessions/${session.id}/cancel`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                
                toastSwal({ title: 'İptal Edildi', text: 'Sayım iptal edildi.', icon: 'success' });
                fetchSession();
            } catch (error: any) {
                console.error('Error cancelling session', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || 'İptal işlemi başarısız.', icon: 'error' });
            } finally {
                setSaving(false);
            }
        }
    };

    // Open Bar Helper Modal
    const openHelperModal = (line: any) => {
        vibrate();
        setActiveLineForHelper(line);
        // Try to guess empty values
        const currentQty = parseFloat(line.countedQty) || 0;
        const convRate = parseFloat(line.stockCard?.conversionRate) || 1;
        
        if (currentQty > 0 && convRate > 1 && line.stockCard?.purchaseUnit && line.stockCard?.baseUnit) {
            const closed = Math.floor(currentQty / convRate);
            const open = currentQty % convRate;
            setHelperClosedQty(closed);
            setHelperOpenQty(parseFloat(open.toFixed(2)));
        } else {
            setHelperClosedQty(0);
            setHelperOpenQty(0);
        }
        setHelperModalOpen(true);
    };

    const applyHelperCalculation = () => {
        if (!activeLineForHelper) return;
        
        const convRate = parseFloat(activeLineForHelper.stockCard?.conversionRate) || 1;
        const totalBaseQty = (helperClosedQty * convRate) + helperOpenQty;
        
        handleLineChange(activeLineForHelper.id, 'countedQty', parseFloat(totalBaseQty.toFixed(2)));
        setHelperModalOpen(false);
    };

    const vibrate = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    // Derived flags
    const isReadOnly = session?.status === 'COMPLETED' || session?.status === 'CANCELLED';
    const isBlindCount = session?.isBlindCount;

    // Filtered Lines
    const filteredLines = lines.filter(line => {
        let match = true;
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            match = match && (line.stockCard?.name?.toLowerCase().includes(q) || line.stockCard?.code?.toLowerCase().includes(q));
        }
        
        if (filterCategory) {
            match = match && line.stockCard?.category === filterCategory;
        }
        
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'COUNTED') match = match && line.isCounted;
            if (filterStatus === 'UNCOUNTED') match = match && !line.isCounted;
            if (filterStatus === 'HAS_DIFF') match = match && line.isCounted && parseFloat(line.differenceQty) !== 0;
        }
        
        return match;
    });

    // KPIs
    const kpiTotalLines = lines.length;
    const kpiCountedLines = lines.filter(l => l.isCounted).length;
    const kpiDiffCost = lines.reduce((sum, l) => sum + (parseFloat(l.differenceCost) || 0), 0);

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className={`absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none z-0 ${session?.status === 'COMPLETED' ? 'bg-emerald-500/5' : session?.status === 'CANCELLED' ? 'bg-red-500/5' : 'bg-indigo-500/5'}`}></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none z-0"></div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sayım Fişi Yükleniyor...</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full z-10 relative">
                    {/* Header */}
                    <div className="px-[50px] py-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border-b border-white dark:border-slate-700 shadow-sm shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push(`/${locale}/inventory/count`)} className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm">
                                <i className="fat fa-arrow-left"></i>
                            </button>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase m-0 leading-none">
                                    SAYIM FİŞİ <span className="text-indigo-600 dark:text-indigo-400 opacity-80">#{session.id}</span>
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                        <i className="fat fa-calendar mr-1"></i> {new Date(session.sessionDate).toLocaleDateString('tr-TR')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                        <i className="fat fa-building mr-1"></i> {session.warehouse?.name || 'Tüm Depolar'}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${session.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : session.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                                        {session.status === 'COMPLETED' ? 'ONAYLANDI' : session.status === 'CANCELLED' ? 'İPTAL EDİLDİ' : 'AÇIK (DEVAM EDİYOR)'}
                                    </span>
                                    {isBlindCount && (
                                        <span className="text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                                            <i className="fat fa-eye-slash mr-1"></i> Kör Sayım
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {/* <button className="px-5 py-2.5 bg-white border border-slate-200 dark:bg-slate-700 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest whitespace-nowrap shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                                <i className="fat fa-print"></i> Yazdır
                            </button> */}
                            
                            {!isReadOnly && (
                                <>
                                    <button onClick={handleCancelSession} disabled={saving} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest whitespace-nowrap shadow-sm hover:bg-red-100 transition-all flex items-center gap-2 disabled:opacity-50">
                                        <i className="fat fa-ban"></i> İptal Et
                                    </button>

                                    <button onClick={() => saveDraft(false)} disabled={saving || Object.keys(pendingChanges).length === 0} className="px-5 py-2.5 bg-white border border-slate-200 dark:bg-slate-700 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:text-slate-400">
                                        {saving ? <i className="fat fa-spinner fa-spin"></i> : <i className="fat fa-floppy-disk"></i>}
                                        Taslağı Kaydet
                                        {Object.keys(pendingChanges).length > 0 && <span className="bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px]">{Object.keys(pendingChanges).length}</span>}
                                    </button>

                                    <button onClick={handleApprove} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-md hover:shadow-lg hover:from-emerald-600 transition-all active:scale-95 flex items-center gap-2">
                                        <i className="fat fa-check-double"></i> SAYIMI ONAYLA (UYGULA)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col px-[50px] py-6 relative">
                        
                        {/* Session Note */}
                        {session.note && (
                            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex items-start gap-4 shrink-0">
                                <i className="fat fa-note-sticky text-amber-500 text-2xl mt-1"></i>
                                <div>
                                    <h6 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">Sayım Notu / Açıklaması</h6>
                                    <p className="text-sm font-bold text-amber-900/70 dark:text-amber-300/70 m-0">{session.note}</p>
                                </div>
                            </div>
                        )}

                        {/* Top Controls: Search, Filters & KPIs */}
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 shrink-0">
                            {/* Search & Filters */}
                            <div className="flex items-center gap-3">
                                <div className="relative w-64">
                                    <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Stok adı veya kodu ile ara..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="relative">
                                    <select 
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                                    >
                                        <option value="">Tüm Kategoriler</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <i className="fat fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                                </div>
                                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === 'ALL' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tümü</button>
                                    <button onClick={() => setFilterStatus('COUNTED')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === 'COUNTED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Sayılan</button>
                                    <button onClick={() => setFilterStatus('UNCOUNTED')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === 'UNCOUNTED' ? 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Sayılmayan</button>
                                </div>
                            </div>
                            
                            {/* Linear KPI */}
                            <div className="flex items-center gap-6 bg-white dark:bg-slate-800 px-6 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ml-auto">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İlerleme</span>
                                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">{kpiCountedLines} <span className="text-sm text-slate-400 font-bold">/ {kpiTotalLines}</span></span>
                                </div>
                                <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700"></div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fark Tutarı</span>
                                    <span className={`text-lg font-black leading-none mt-0.5 ${kpiDiffCost > 0 ? 'text-emerald-500' : kpiDiffCost < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                        {kpiDiffCost > 0 ? '+' : ''}{kpiDiffCost.toFixed(2)} ₺
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Data Grid */}
                        <div className="flex-1 overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-sm rounded-3xl flex flex-col">
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Adı & Kod</th>
                                            {!isBlindCount && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Teorik Miktar</th>}
                                            <th className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center w-64 bg-indigo-50/50 dark:bg-indigo-500/5">Sayılan FİİLİ Miktar</th>
                                            {!isBlindCount && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fark</th>}
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {filteredLines.map((line, idx) => {
                                            const diffQty = parseFloat(line.differenceQty) || 0;
                                            const isNegative = diffQty < 0;
                                            const isPositive = diffQty > 0;
                                            
                                            // Determine input color based on state
                                            let inputColorClass = "bg-white border-slate-200 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 font-black text-slate-800 dark:text-white";
                                            if (line.isCounted) {
                                                if (isNegative && !isBlindCount) inputColorClass = "bg-red-50 border-red-300 focus:border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400";
                                                else if (isPositive && !isBlindCount) inputColorClass = "bg-emerald-50 border-emerald-300 focus:border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
                                                else inputColorClass = "bg-indigo-50 border-indigo-200 focus:border-indigo-500 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-500/30 dark:text-indigo-400";
                                            }

                                            return (
                                                <tr key={line.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${line.isCounted ? '' : 'opacity-80'}`}>
                                                    <td className="px-6 py-3">
                                                        <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">{idx + 1}</span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500">
                                                                <i className={`fat ${line.stockCard?.category === 'Alkol' ? 'fa-wine-bottle text-red-400' : 'fa-box'}`}></i>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{line.stockCard?.name}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{line.stockCard?.code} &bull; {line.stockCard?.category}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    
                                                    {!isBlindCount && (
                                                        <td className="px-6 py-3 text-right">
                                                            <span className="text-lg font-black text-slate-400 tracking-tight">
                                                                {parseFloat(line.theoreticalQty).toFixed(2)} <span className="text-xs">{line.unit}</span>
                                                            </span>
                                                        </td>
                                                    )}
                                                    
                                                    <td className="px-6 py-3 bg-indigo-50/30 dark:bg-indigo-900/10 relative">
                                                        <div className="flex items-stretch gap-0 w-full max-w-[200px] mx-auto group">
                                                            <input 
                                                                type="number" 
                                                                step="any"
                                                                value={line.countedQty === null ? '' : line.countedQty}
                                                                onChange={(e) => handleLineChange(line.id, 'countedQty', e.target.value)}
                                                                onFocus={(e) => { vibrate(); e.target.select(); }}
                                                                disabled={isReadOnly}
                                                                placeholder="Miktar Girin"
                                                                className={`w-full text-center px-2 py-2.5 rounded-l-xl border-y border-l shadow-inner outline-none transition-all ${inputColorClass}`}
                                                                style={{ MozAppearance: 'textfield' }} // hide spin buttons
                                                            />
                                                            <span className={`px-3 py-2.5 border-y font-bold text-xs uppercase tracking-widest flex items-center border-l-0 ${line.isCounted ? (isNegative && !isBlindCount ? 'bg-red-100 border-red-300 text-red-600 dark:bg-red-900/40 dark:border-red-500/30' : (isPositive && !isBlindCount ? 'bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-900/40 dark:border-emerald-500/30' : 'bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/40 dark:border-indigo-500/30')) : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600'}`}>
                                                                {line.unit}
                                                            </span>
                                                            
                                                            {!isReadOnly && line.stockCard?.purchaseUnit && line.stockCard?.conversionRate > 1 && (
                                                                <button 
                                                                    onClick={() => openHelperModal(line)}
                                                                    title="Bar Sayım Yardımcısı (Şişe + Kalan Türünden)"
                                                                    className={`px-3 py-2.5 rounded-r-xl border-y border-r font-black flex items-center transition-all hover:bg-orange-500 hover:text-white hover:border-orange-600 ${line.isCounted ? (isNegative && !isBlindCount ? 'bg-red-50 border-red-300 text-red-400 dark:bg-red-900/20 dark:border-red-500/30' : (isPositive && !isBlindCount ? 'bg-emerald-50 border-emerald-300 text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-500/30' : 'bg-indigo-50 border-indigo-200 text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-500/30')) : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-600'}`}
                                                                >
                                                                    <i className="fat fa-calculator"></i>
                                                                </button>
                                                            )}
                                                            {isReadOnly || !line.stockCard?.purchaseUnit || line.stockCard?.conversionRate <= 1 ? (
                                                                <span className={`px-2 py-2.5 rounded-r-xl border-y border-r flex items-center ${line.isCounted ? (isNegative && !isBlindCount ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-500/30' : (isPositive && !isBlindCount ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-500/30' : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-500/30')) : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-600'}`}></span>
                                                            ) : null}
                                                        </div>
                                                    </td>

                                                    {!isBlindCount && (
                                                        <td className="px-6 py-3 text-right">
                                                            {line.isCounted ? (
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`text-base font-black tracking-tight ${isNegative ? 'text-red-500' : isPositive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                                        {isPositive ? '+' : ''}{diffQty.toFixed(2)}
                                                                    </span>
                                                                    {diffQty !== 0 && (
                                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${isNegative ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
                                                                            ({(parseFloat(line.differenceCost) || 0).toFixed(2)} ₺)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
                                                            )}
                                                        </td>
                                                    )}

                                                    <td className="px-6 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input type="checkbox" disabled={isReadOnly} checked={line.isCounted} onChange={(e) => handleLineChange(line.id, 'isCounted', e.target.checked)} className="sr-only peer" />
                                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                                                            </label>
                                                            
                                                            {/* Note Button */}
                                                            <button 
                                                                disabled={isReadOnly}
                                                                onClick={() => {
                                                                    const note = window.prompt('Satır Açıklaması:', line.description || '');
                                                                    if (note !== null) handleLineChange(line.id, 'description', note);
                                                                }}
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${line.description ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                            >
                                                                <i className="fat fa-comment-dots text-sm"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredLines.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center p-12 opacity-50">
                                                    <i className="fat fa-search text-4xl text-slate-400 mb-3"></i>
                                                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Aramaya Uygun Stok Bulunamadı</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Bar Helper Modal */}
            {helperModalOpen && activeLineForHelper && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-900/20">
                            <i className="fat fa-calculator text-3xl text-orange-500 mb-2"></i>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white capitalize leading-tight mb-1">{activeLineForHelper.stockCard?.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest m-0 flex justify-center gap-2">
                                <span>1 {activeLineForHelper.stockCard?.purchaseUnit} = {activeLineForHelper.stockCard?.conversionRate} {activeLineForHelper.stockCard?.baseUnit}</span>
                            </p>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Kapalı (Tam) {activeLineForHelper.stockCard?.purchaseUnit}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">x {activeLineForHelper.stockCard?.conversionRate} {activeLineForHelper.stockCard?.baseUnit}</span>
                                </label>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setHelperClosedQty(Math.max(0, helperClosedQty - 1))} className="w-14 h-14 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center text-xl font-black active:scale-95 transition-transform">-</button>
                                    <input 
                                        type="number" 
                                        value={helperClosedQty === 0 ? '' : helperClosedQty} 
                                        onChange={(e) => setHelperClosedQty(parseInt(e.target.value) || 0)} 
                                        onFocus={(e) => e.target.select()}
                                        className="w-full h-14 text-center text-2xl font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 focus:border-orange-500 rounded-2xl outline-none"
                                        style={{ MozAppearance: 'textfield' }}
                                    />
                                    <button onClick={() => setHelperClosedQty(helperClosedQty + 1)} className="w-14 h-14 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center text-xl font-black active:scale-95 transition-transform">+</button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Açık {activeLineForHelper.stockCard?.purchaseUnit} Kalanı ({activeLineForHelper.stockCard?.baseUnit})
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="any"
                                        value={helperOpenQty === 0 ? '' : helperOpenQty} 
                                        onChange={(e) => setHelperOpenQty(parseFloat(e.target.value) || 0)} 
                                        onFocus={(e) => e.target.select()}
                                        className="w-full h-14 text-center pr-12 text-2xl font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 focus:border-orange-500 rounded-2xl outline-none"
                                        style={{ MozAppearance: 'textfield' }}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 uppercase">{activeLineForHelper.stockCard?.baseUnit}</span>
                                </div>
                                {/* Quick buttons for open qty */}
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[10, 20, 35, 50].map(val => (
                                        <button 
                                            key={val} 
                                            onClick={() => setHelperOpenQty(val)}
                                            className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg text-xs font-black text-slate-600 dark:text-slate-300"
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Calculation Review */}
                            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex justify-between items-center mt-2">
                                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">TOPLAM ({activeLineForHelper.stockCard?.baseUnit})</span>
                                <span className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                                    {((helperClosedQty * (parseFloat(activeLineForHelper.stockCard?.conversionRate) || 1)) + parseFloat(helperOpenQty as any || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex gap-3">
                            <button onClick={() => setHelperModalOpen(false)} className="flex-1 py-3.5 rounded-2xl font-black text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                                İPTAL
                            </button>
                            <button onClick={applyHelperCalculation} className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-all active:scale-95">
                                UYGULA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
