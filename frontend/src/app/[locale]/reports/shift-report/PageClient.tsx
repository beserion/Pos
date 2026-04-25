'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, Clock, Search, AlertTriangle, Users } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';

const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:3050'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');

const fmt = (n: number) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

export function PageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(today());
  const [endDate, setEndDate] = useState<string>(today());
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) fetchUsers();
  }, [user, loading]);

  const fetchUsers = async () => {
    try {
      const token = Cookies.get('token');
      const res = await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
      setAllUsers(res.data || []);
    } catch { setAllUsers([]); }
  };

  const fetchReport = async () => {
    if (!selectedUserId) return;
    setIsLoading(true); setError(null); setData(null);
    try {
      const token = Cookies.get('token');
      const res = await axios.get(`${API_URL}/reports/shift-report/by-user`, {
        params: { userId: selectedUserId, startDate, endDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.data) {
        setError('Seçilen personel ve tarih aralığında vardiya bulunamadı.');
      } else {
        setData(res.data);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Vardiya raporu alınamadı.');
    } finally { setIsLoading(false); }
  };

  const durationStr = (min: number | null) => {
    if (!min) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
  };

  const fmtDT = (dt: string) => dt ? new Date(dt).toLocaleString('tr-TR') : '—';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <div className="relative z-10 p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg"><Clock size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Personel Vardiya Raporu</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Personele göre vardiya, tahsilat ve satış özeti</p>
            </div>
          </div>
          <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Personel Seçimi */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Users size={12} /> Personel
              </label>
              <div className="-m-2 w-full mt-1">
                <SearchableSelect
                  value={selectedUserId}
                  onChange={(val) => setSelectedUserId(val.toString())}
                  options={[
                    { value: '', label: '— Personel Seçin —' },
                    ...allUsers.map((u) => ({ value: u.id.toString(), label: `${u.firstName} ${u.lastName}` }))
                  ]}
                />
              </div>
            </div>

            {/* Başlangıç Tarihi */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Başlangıç</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
            </div>

            {/* Bitiş Tarihi */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Bitiş</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={fetchReport} disabled={!selectedUserId || isLoading} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-md shadow-amber-500/30 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
              <Search size={16} /> Raporu Getir
            </button>
          </div>
          {error && <div className="mt-3 flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-xl text-sm"><AlertTriangle size={16} />{error}</div>}
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)}
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Personel Başlık Kartı */}
            <div className="relative bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-[32px] p-8 mb-6 shadow-xl overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-amber-50 dark:bg-amber-500/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-orange-50 dark:bg-orange-500/5 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-widest">{data.vardiyaBilgisi?.vardiyaNo}</p>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{data.vardiyaBilgisi?.kullanici || '—'}</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">{data.vardiyaBilgisi?.kasaAdi}</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-black text-sm ${data.vardiyaBilgisi?.durum === 'CLOSED' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>
                  {data.vardiyaBilgisi?.durum === 'CLOSED' ? '✓ Kapalı' : '● Açık'}
                </div>
              </div>
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniBlock label="İlk Açılış" value={fmtDT(data.vardiyaBilgisi?.acilisSaati)} />
                <MiniBlock label="Son Kapanış" value={fmtDT(data.vardiyaBilgisi?.kapanisSaati)} />
                <MiniBlock label="Toplam Süre" value={durationStr(data.vardiyaBilgisi?.sureDakika)} />
                <MiniBlock label="Dönem" value={data.vardiyaBilgisi?.businessDate || '—'} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Açılış Bilgisi */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">📂 Genel Bilgi</h3>
                <VRow label="Toplam Açılış Nakdi" value={`${fmt(data.acilisBilgisi?.acilisNakdi || 0)} ₺`} />
                {data.acilisBilgisi?.not && <VRow label="Bilgi" value={data.acilisBilgisi.not} />}
              </div>

              {/* Tahsilat */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">💰 Tahsilat</h3>
                <VRow label="Nakit" value={`${fmt(data.tahsilat?.nakit)} ₺`} />
                <VRow label="Kredi Kartı" value={`${fmt(data.tahsilat?.krediKarti)} ₺`} />
                <VRow label="Cari" value={`${fmt(data.tahsilat?.cari)} ₺`} />
                <VRow label="Adisyon Sayısı" value={data.tahsilat?.adisyonSayisi} />
                <div className="border-t border-slate-100 dark:border-slate-700 mt-3 pt-3">
                  <VRow label="Toplam Tahsilat" value={`${fmt(data.tahsilat?.toplamTahsilat)} ₺`} bold />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* İşlemler */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">📊 İşlem Özeti</h3>
                <VRow label="Satış Toplamı" value={`${fmt(data.islemler?.satisToplam)} ₺`} bold />
                <VRow label="İade" value={`${fmt(data.islemler?.iadeToplam)} ₺`} danger />
                <VRow label="İndirim" value={`${fmt(data.islemler?.indirimToplam)} ₺`} />
                <VRow label="İptal Adedi" value={data.islemler?.iptalAdedi} />
              </div>

              {/* Kapanış */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">🔒 Kapanış Özeti</h3>
                <VRow label="Beklenen Nakit" value={`${fmt(data.kapanis?.beklenenNakit)} ₺`} />
                <VRow label="Sayılan Nakit" value={`${fmt(data.kapanis?.sayilanNakit)} ₺`} />
                <div className="border-t border-slate-100 dark:border-slate-700 mt-3 pt-3">
                  <VRow
                    label="Fark"
                    value={`${fmt(Math.abs(data.kapanis?.fark || 0))} ₺ ${(data.kapanis?.fark || 0) < 0 ? '(Noksanlık)' : (data.kapanis?.fark || 0) > 0 ? '(Fazlalık)' : ''}`}
                    danger={(data.kapanis?.fark || 0) !== 0}
                    bold
                  />
                </div>
              </div>
            </div>

            {/* Vardiyalar listesi */}
            {data.vardiaylar && data.vardiaylar.length > 0 && (
              <div className="mt-6 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">🕐 Vardiyalar</h3>
                <div className="space-y-2">
                  {data.vardiaylar.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">#{v.id}</span>
                        <span className="ml-3 text-sm font-bold text-slate-700 dark:text-slate-200">{v.kasaAdi || '—'}</span>
                        <span className="ml-3 text-xs text-slate-400">{v.businessDate}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${v.durum === 'CLOSED' ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'}`}>
                        {v.durum === 'CLOSED' ? 'Kapalı' : 'Açık'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-20 text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">Yukarıdan personel seçerek vardiya raporunu görüntüleyin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBlock({ label, value }: any) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
      <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">{label}</div>
      <div className="text-slate-800 dark:text-slate-200 font-bold text-sm">{value}</div>
    </div>
  );
}

function VRow({ label, value, bold = false, danger = false }: any) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className={`text-sm font-medium ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-black' : 'font-bold'} ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>{value}</span>
    </div>
  );
}
