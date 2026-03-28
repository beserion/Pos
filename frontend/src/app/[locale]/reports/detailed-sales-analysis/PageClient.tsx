'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, BarChart, RefreshCw, Search } from 'lucide-react';

const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:3050'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');

const fmt = (n: number) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().split('T')[0];

export function PageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const res = await axios.get(`${API_URL}/reports/detailed-sales-analysis?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) fetchData();
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg"><BarChart size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Detaylı Satış Analizi</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Ürün kırılımları, ödeme yöntemleri, indirim & iade detayları</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 shadow-sm" />
            <span className="text-slate-400 font-bold">–</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500 shadow-sm" />
            <button onClick={fetchData} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-md shadow-violet-500/30 transition-all active:scale-95">
              <Search size={16} /> Filtrele
            </button>
            <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm">
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)}
          </div>
        ) : !data ? (
          <p className="text-center text-slate-400 py-20 font-bold">Veri bulunamadı.</p>
        ) : (
          <>
            {/* Genel Toplamlar Üst Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Net Satış', value: `${fmt(data.genelToplamlar.netSatis)} ₺`, color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-500/20' },
                { label: 'Adisyon Sayısı', value: data.genelToplamlar.adisyonSayisi, color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-500/20' },
                { label: 'İndirim', value: `${fmt(data.genelToplamlar.toplamIndirim)} ₺`, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20' },
                { label: 'Servis Bedeli', value: `${fmt(data.genelToplamlar.toplamServis)} ₺`, color: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-500/20' },
                { label: 'İade', value: `${fmt(data.genelToplamlar.toplamIade)} ₺`, color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-500/20' },
              ].map((c) => (
                <div key={c.label} className={`${c.color} border rounded-3xl p-5 shadow-sm`}>
                  <div className="opacity-80 text-xs font-semibold mb-1">{c.label}</div>
                  <div className="text-2xl font-black">{c.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Tahsilat Detayı */}
              <Section title="Tahsilat Kırılımı (Ödeme Yöntemine Göre)">
                {data.tahsilatDetay?.map((t: any, i: number) => (
                  <Row key={i} label={t.odemeYontemi} sub={`${t.adet} adet`} value={`${fmt(t.toplam)} ₺`} />
                ))}
              </Section>

              {/* İndirim Özeti */}
              <Section title="İndirim Özeti">
                <Row label="Toplam İndirim" value={`${fmt(data.indirimOzeti?.toplamIndirim)} ₺`} highlight />
                <Row label="İndirim Yapılan Adisyon" value={data.indirimOzeti?.indirimliAdisyon} />
                {data.iadeIptalDetay?.map((d: any, i: number) => (
                  <Row key={i} label={d.durum === 'CANCELLED' ? 'İptal' : 'İade'} sub={`${d.adet} adet`} value={`${fmt(d.toplam)} ₺`} danger />
                ))}
              </Section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Ürün Satış Özeti */}
              <Section title="Ürün Satış Özeti (En Çok Satılanlar)">
                {data.urunSatisOzeti?.slice(0, 15).map((u: any, i: number) => (
                  <Row key={i} label={u.urunAdi} sub={`${u.adet} adet`} value={`${fmt(u.toplam)} ₺`} rank={i + 1} />
                ))}
              </Section>

              {/* Kategori */}
              <Section title="Kategori / Grup Özeti">
                {data.grupSatisToplam?.map((g: any, i: number) => (
                  <Row key={i} label={g.kategori} sub={`${g.adet} adet`} value={`${fmt(g.toplam)} ₺`} />
                ))}
              </Section>
            </div>

            {/* Garson */}
            <Section title="Garson / Kasiyer Toplamları">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.garsonlarToplamlar?.map((g: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center font-black text-sm">{i + 1}</div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-sm">{g.garsonAdi}</div>
                        <div className="text-xs text-slate-400">{g.adisyonSayisi} adisyon • {fmt(g.indirimToplam)} ₺ indirim</div>
                      </div>
                    </div>
                    <div className="font-black text-violet-600 dark:text-violet-400">{fmt(g.satisToplam)} ₺</div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
      <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, sub, value, highlight = false, danger = false, rank }: any) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${highlight ? 'bg-violet-50 dark:bg-violet-500/10' : danger ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
      <div className="flex items-center gap-3">
        {rank && <span className="text-xs font-black text-slate-400 w-5">{rank}.</span>}
        <div>
          <div className={`font-bold text-sm ${highlight ? 'text-violet-700 dark:text-violet-300' : danger ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{label}</div>
          {sub && <div className="text-xs text-slate-400">{sub}</div>}
        </div>
      </div>
      <span className={`font-black text-sm ${highlight ? 'text-violet-600' : danger ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{value}</span>
    </div>
  );
}
