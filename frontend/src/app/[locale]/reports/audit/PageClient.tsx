'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, ShieldCheck, Search, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { API_URL } from '@/lib/apiConfig';



const today = () => new Date().toISOString().split('T')[0];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  ADISYON_CANCEL: { label: 'Adisyon İptali', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
  ITEM_CANCEL: { label: 'Ürün İptali', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' },
  ITEM_REFUND: { label: 'Ürün İadesi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  SALE_REFUND: { label: 'Satış İadesi', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  DISCOUNT: { label: 'İskonto', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  SHIFT_OPEN: { label: 'Vardiya Açma', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  SHIFT_CLOSE: { label: 'Vardiya Kapama', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' },
  END_OF_DAY: { label: 'Gün Sonu', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
  USER_LOGIN: { label: 'Giriş', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  USER_LOGOUT: { label: 'Çıkış', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  FAILED_LOGIN: { label: 'Hatalı Giriş', color: 'bg-rose-200 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
  OVERRIDE: { label: 'Yetkili Onay', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  PRICE_CHANGE: { label: 'Fiyat Değişimi', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300' },
  QTY_CHANGE: { label: 'Miktar Değişimi', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300' },
};

const getAction = (type: string) => ACTION_LABELS[type] || { label: type, color: 'bg-slate-100 text-slate-600' };

export function PageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [data, setData] = useState<{ data: any[]; total: number; page: number; lastPage: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: today(), endDate: today(), actionType: '', tableNo: '', saleId: '',
  });

  const fetchData = async (p = page) => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const params = new URLSearchParams({
        page: String(p), limit: '30',
        startDate: filters.startDate, endDate: filters.endDate,
        ...(filters.actionType ? { actionType: filters.actionType } : {}),
        ...(filters.tableNo ? { tableNo: filters.tableNo } : {}),
        ...(filters.saleId ? { saleId: filters.saleId } : {}),
      });
      const res = await axios.get(`${API_URL}/reports/audit?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch { setData(null); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) fetchData();
  }, [user, loading]);

  const handleFilter = () => { setPage(1); fetchData(1); };
  const handlePage = (p: number) => { setPage(p); fetchData(p); };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg"><ShieldCheck size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Denetim Raporu</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Tüm kritik işlemlerin satır bazlı denetim kaydı</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchData()} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
              <RefreshCw size={15} /> Yenile
            </button>
            <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm">
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Başlangıç</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Bitiş</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">İşlem Tipi</label>
              <div className="-m-2 w-full mt-1">
                <SearchableSelect
                    value={filters.actionType}
                    onChange={(val) => setFilters(f => ({ ...f, actionType: val.toString() }))}
                    options={[
                        { value: '', label: 'Tümü' },
                        ...Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v.label }))
                    ]}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Masa No</label>
              <input type="text" value={filters.tableNo} onChange={e => setFilters(f => ({ ...f, tableNo: e.target.value }))} placeholder="Masa adı..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div className="flex items-end">
              <button onClick={handleFilter} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-xl shadow-md shadow-rose-500/20 hover:opacity-90 active:scale-95 transition-all text-sm">
                <Filter size={15} /> Filtrele
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  {['Tarih/Saat', 'İşlem', 'Belge No', 'Masa', 'Ürün', 'Tutar', 'Kullanıcı', 'Açıklama'].map(h => (
                    <th key={h} className="text-left px-5 py-4 font-black text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                      {[...Array(8)].map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : data?.data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-slate-400 font-bold">Bu filtre için denetim kaydı bulunamadı.</td></tr>
                ) : data?.data.map((log) => {
                  const action = getAction(log.actionType);
                  return (
                    <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs font-medium">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('tr-TR') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${action.color}`}>{action.label}</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">{log.saleId || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{log.tableNo || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">{log.productName || '—'}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {log.amount ? `${Number(log.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{log.userId || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{log.description || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.lastPage > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{data.total} kayıt — Sayfa {data.page}/{data.lastPage}</span>
              <div className="flex gap-2">
                <button onClick={() => handlePage(data.page - 1)} disabled={data.page <= 1} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => handlePage(data.page + 1)} disabled={data.page >= data.lastPage} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
