'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, BarChart2, Banknote, CreditCard, Users, XCircle, RotateCcw, Tag, ChevronDown } from 'lucide-react';

const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:3050'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');

const today = () => new Date().toISOString().split('T')[0];

export function PageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { theme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(today());

  const fetchData = async (date = filterDate) => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const res = await axios.get(`${API_URL}/reports/sales-analysis?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (error) {
      console.error('Error fetching sales analysis:', error);
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) fetchData();
  }, [user, loading]);

  const fmt = (n: number) => n?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]" />
      </div>
      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><BarChart2 size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Satış Analizi</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Günlük ciro ve tahsilat özeti</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button onClick={() => fetchData(filterDate)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/30 transition-all active:scale-95">
              <RefreshCw size={16} /> Yenile
            </button>
            <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm">
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>

        {isLoading ? <LoadingSkeleton /> : !data ? <EmptyState /> : (
          <>
            {/* Günün Cirosu — ÜSTTE VE BÜYÜK */}
            <div className="relative bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-[32px] p-8 mb-8 shadow-xl overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-indigo-50 dark:bg-indigo-500/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-blue-50 dark:bg-blue-500/5 blur-2xl pointer-events-none" />
              <p className="relative z-10 text-slate-500 dark:text-slate-400 font-semibold text-sm uppercase tracking-widest mb-3">Günün Cirosu</p>
              <div className="relative z-10 text-6xl font-black text-slate-800 dark:text-white mb-5">{fmt(data.gunCirosu?.toplamCiro)} ₺</div>
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                <CiroBadge label="Nakit" value={fmt(data.gunCirosu?.nakitCiro)} icon="💵" />
                <CiroBadge label="Kart" value={fmt(data.gunCirosu?.kartCiro)} icon="💳" />
                <CiroBadge label="Cari" value={fmt(data.gunCirosu?.cariCiro)} icon="📋" />
                <CiroBadge label="Diğer" value={fmt(data.gunCirosu?.digerCiro)} icon="🔀" />
              </div>
            </div>

            {/* İşlem Özeti */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <MetricCard label="Satış Adedi" value={data.islemOzeti?.satisAdedi} icon={<Users size={18} className="text-indigo-500" />} />
              <MetricCard label="İade Toplamı" value={`${fmt(data.islemOzeti?.iadeToplam)} ₺`} icon={<RotateCcw size={18} className="text-rose-500" />} danger />
              <MetricCard label="İptal Adedi" value={data.islemOzeti?.iptalAdedi} icon={<XCircle size={18} className="text-orange-500" />} danger />
              <MetricCard label="İndirim Toplamı" value={`${fmt(data.islemOzeti?.indirimToplam)} ₺`} icon={<Tag size={18} className="text-amber-500" />} />
              <MetricCard label="İptal Ürün" value={data.islemOzeti?.iptalUrunAdedi} icon={<XCircle size={18} className="text-slate-400" />} />
              <MetricCard label="İade Ürün" value={data.islemOzeti?.iadeUrunAdedi} icon={<RotateCcw size={18} className="text-slate-400" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Açık Masa */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-lg">Açık Masa Durumu</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Açık Masa Sayısı</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-300">{data.acikMasa?.sayi || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                    <span className="text-sm font-bold text-rose-700 dark:text-rose-400">Açık Toplam</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-300">{fmt(data.acikMasa?.toplam)} ₺</span>
                  </div>
                </div>
              </div>

              {/* Garson Toplamları */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-lg">Garson / Kasiyer Toplamları</h3>
                {data.garsonlarToplamlar?.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">Veri bulunamadı.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {data.garsonlarToplamlar?.map((g: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black text-sm">{i + 1}</div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white text-sm">{g.garsonAdi}</div>
                            <div className="text-xs text-slate-400">{g.adisyonSayisi} adisyon</div>
                          </div>
                        </div>
                        <div className="font-black text-indigo-600 dark:text-indigo-400">{fmt(g.toplam)} ₺</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CiroBadge({ label, value, icon }: any) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
      <span className="text-2xl">{icon}</span>
      <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-2">{label}</div>
      <div className="text-slate-800 dark:text-slate-200 font-black text-xl">{value} ₺</div>
    </div>
  );
}

function MetricCard({ label, value, icon, danger = false }: any) {
  return (
    <div className={`bg-white dark:bg-slate-800/80 border rounded-2xl p-5 shadow-md ${danger ? 'border-rose-100 dark:border-rose-500/20' : 'border-slate-100 dark:border-slate-700/50'}`}>
      <div className="flex items-center justify-between mb-3">{icon}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 bg-indigo-100 dark:bg-indigo-900/20 rounded-3xl animate-pulse" />
      <div className="grid grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 text-slate-400">
      <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
      <p className="font-bold">Seçilen tarih için veri bulunamadı.</p>
    </div>
  );
}
