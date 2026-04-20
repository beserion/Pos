'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal } from '@/app/[locale]/utils/swal';
import { useLocale } from 'next-intl';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import SearchableSelect from '@/components/SearchableSelect';

interface RoutingEntry {
    productId: number;
    productName: string;
    productTypeName: string;
    categoryName: string;
    hasCardOverride: boolean;
    hasGroupOverride: boolean;
    effectiveProfileName: string;
    effectiveSource: string;
}

const SOURCE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    'STOCK_CARD': { label: 'Stok Kartı', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 border-purple-200', icon: 'fa-id-card' },
    'STOCK_GROUP': { label: 'Stok Grubu', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200', icon: 'fa-layer-group' },
    'PRODUCT_TYPE': { label: 'Ürün Cinsi', color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 border-teal-200', icon: 'fa-shapes' },
    'DEFAULT': { label: 'Tanımsız', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-200', icon: 'fa-triangle-exclamation' },
};

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user, hasFeature } = useAuth();
    
    const [items, setItems] = useState<RoutingEntry[]>([]);
    const [filtered, setFiltered] = useState<RoutingEntry[]>([]);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { 
        if (user?.token && hasFeature('kds_system')) {
            fetchData(); 
        } else if (user === null) {
            setLoading(false); 
        }
    }, [user, hasFeature]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const res = await axios.get(`${API}/order-routing/control-list`, { headers: { Authorization: `Bearer ${user.token}` } });
            setItems(res.data);
            setFiltered(res.data);
        } catch { showSwal({ title: 'Hata', text: 'Veri yüklenemedi', icon: 'error' }); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        let result = items;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(i => i.productName.toLowerCase().includes(q) || i.productTypeName.toLowerCase().includes(q) || i.categoryName.toLowerCase().includes(q));
        }
        if (filterSource) result = result.filter(i => i.effectiveSource === filterSource);
        setFiltered(result);
    }, [search, filterSource, items]);

    const stats = {
        total: items.length,
        byType: items.filter(i => i.effectiveSource === 'PRODUCT_TYPE').length,
        byGroup: items.filter(i => i.effectiveSource === 'STOCK_GROUP').length,
        byCard: items.filter(i => i.effectiveSource === 'STOCK_CARD').length,
        unresolved: items.filter(i => i.effectiveSource === 'DEFAULT').length,
    };

    if (user && !hasFeature('kds_system')) {
        return (
            <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pt-20">
                <PremiumModuleLocked moduleName="Akıllı Mutfak Yönlendirme Kontrolü" featureKey="kds_system" />
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-lime-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-green-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-clipboard-list-check me-3 text-lime-600 dark:text-lime-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-lime-600 dark:text-lime-400 leading-none uppercase tracking-[0.25em]">YÖNLENDİRME KONTROLÜ</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-lime-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Her ürünün etkin çıktı profilini ve kural kaynağını inceleyin</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => fetchData()} className="px-6 py-3 bg-lime-50 dark:bg-lime-500/10 border border-lime-200 dark:border-lime-500/20 text-lime-600 dark:text-lime-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-lime-100 transition-all flex items-center gap-2">
                            <i className="fat fa-arrows-rotate text-lg"></i> Yenile
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'Toplam Ürün', value: stats.total, icon: 'fa-boxes-stacked', color: 'text-slate-500' },
                        { label: 'Ürün Cinsi', value: stats.byType, icon: 'fa-shapes', color: 'text-teal-500' },
                        { label: 'Stok Grubu', value: stats.byGroup, icon: 'fa-layer-group', color: 'text-blue-500' },
                        { label: 'Stok Kartı', value: stats.byCard, icon: 'fa-id-card', color: 'text-purple-500' },
                        { label: 'Tanımsız', value: stats.unresolved, icon: 'fa-triangle-exclamation', color: stats.unresolved > 0 ? 'text-red-500' : 'text-emerald-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-[24px] border border-white dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{s.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center ${s.color}`}>
                                <i className={`fat ${s.icon} text-xl`}></i>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün, cins veya kategori ara..." className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-lime-500/10 outline-none" />
                    </div>
                    <div className="w-[250px]">
                        <SearchableSelect
                            value={filterSource}
                            onChange={(val) => setFilterSource(val.toString())}
                            options={[
                                { value: '', label: 'Tüm Kaynaklar' },
                                { value: 'PRODUCT_TYPE', label: 'Ürün Cinsi' },
                                { value: 'STOCK_GROUP', label: 'Stok Grubu' },
                                { value: 'STOCK_CARD', label: 'Stok Kartı' },
                                { value: 'DEFAULT', label: 'Tanımsız' }
                            ]}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-600 mb-4"></div>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 460px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÜRÜN</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÜRÜN CİNSİ</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">KATEGORİ</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">KART OVERRIDE</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">GRUP OVERRIDE</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ETKİN PROFİL</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">KURAL KAYNAĞI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {filtered.map(item => {
                                        const source = SOURCE_LABELS[item.effectiveSource] || SOURCE_LABELS['DEFAULT'];
                                        return (
                                            <tr key={item.productId} className="hover:bg-lime-500/5 dark:hover:bg-lime-500/10 transition-all">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-400">#{item.productId}</span>
                                                        <span className="font-bold text-slate-800 dark:text-white">{item.productName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.productTypeName}</span></td>
                                                <td className="px-6 py-3"><span className="text-sm font-bold text-slate-500">{item.categoryName}</span></td>
                                                <td className="px-6 py-3">
                                                    {item.hasCardOverride ? <span className="text-emerald-500 font-black text-xs uppercase tracking-widest"><i className="fat fa-circle-check mr-1"></i>Var</span> : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                                <td className="px-6 py-3">
                                                    {item.hasGroupOverride ? <span className="text-emerald-500 font-black text-xs uppercase tracking-widest"><i className="fat fa-circle-check mr-1"></i>Var</span> : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                                <td className="px-6 py-3"><span className="text-sm font-black text-slate-800 dark:text-white">{item.effectiveProfileName}</span></td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${source.color}`}>
                                                        <i className={`fat ${source.icon}`}></i> {source.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={7} className="p-20 text-center"><div className="flex flex-col items-center opacity-40"><i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i><p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Sonuç bulunamadı</p></div></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
