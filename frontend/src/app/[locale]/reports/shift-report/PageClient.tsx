'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, Clock, Search, AlertTriangle, Users, FileSpreadsheet, Printer } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { exportToExcel, print80mmThermal } from '../../utils/reportExport';
import { API_URL } from '@/lib/apiConfig';

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

  const handleExportExcel = () => {
    if (!data) return;

    const vInfo = data.vardiyaBilgisi || {};
    const oInfo = data.acilisBilgisi || {};
    const tInfo = data.tahsilat || {};
    const iInfo = data.islemler || {};
    const kInfo = data.kapanis || {};

    const shiftHeaders = ['Parametre', 'Değer'];
    const shiftRows = [
      ['Vardiya No', vInfo.vardiyaNo || '—'],
      ['Kullanıcı', vInfo.kullanici || '—'],
      ['Kasa', vInfo.kasaAdi || '—'],
      ['Durum', vInfo.durum === 'CLOSED' ? 'Kapalı' : 'Açık'],
      ['Açılış Zamanı', fmtDT(vInfo.acilisSaati)],
      ['Kapanış Zamanı', fmtDT(vInfo.kapanisSaati)],
      ['Toplam Süre', durationStr(vInfo.sureDakika)],
      ['İş Günü', vInfo.businessDate || '—'],
      [],
      ['AÇILIŞ BİLGİSİ', ''],
      ['Açılış Nakdi', `${fmt(oInfo.acilisNakdi)} ₺`],
      ['Not', oInfo.not || '—'],
      [],
      ['TAHSİLAT BİLGİSİ', ''],
      ['Nakit', `${fmt(tInfo.nakit)} ₺`],
      ['Kredi Kartı', `${fmt(tInfo.krediKarti)} ₺`],
      ['Cari', `${fmt(tInfo.cari)} ₺`],
      ['Adisyon Sayısı', tInfo.adisyonSayisi || 0],
      ['Toplam Tahsilat', `${fmt(tInfo.toplamTahsilat)} ₺`],
      [],
      ['İŞLEM ÖZETİ', ''],
      ['Satış Toplamı', `${fmt(iInfo.satisToplam)} ₺`],
      ['İade Toplamı', `${fmt(iInfo.iadeToplam)} ₺`],
      ['İndirim Toplamı', `${fmt(iInfo.indirimToplam)} ₺`],
      ['İptal Adedi', iInfo.iptalAdedi || 0],
      [],
      ['KAPANIŞ ÖZETİ', ''],
      ['Beklenen Nakit', `${fmt(kInfo.expectedTotal || kInfo.beklenenNakit)} ₺`],
      ['Sayılan Nakit', `${fmt(kInfo.confirmedTotal || kInfo.sayilanNakit)} ₺`],
      ['Sayım Farkı', `${fmt(kInfo.fark)} ₺`],
    ];

    exportToExcel(`Vardiya_Raporu_${vInfo.vardiyaNo || 'No'}`, [
      { name: 'Vardiya Özeti', headers: shiftHeaders, rows: shiftRows }
    ]);
  };

  const handlePrint80mm = () => {
    if (!data) return;

    const vInfo = data.vardiyaBilgisi || {};
    const tInfo = data.tahsilat || {};
    const iInfo = data.islemler || {};
    const kInfo = data.kapanis || {};

    const rows = [
      ['Nakit', `${fmt(tInfo.nakit)} TL`],
      ['Kredi Karti', `${fmt(tInfo.krediKarti)} TL`],
      ['Cari', `${fmt(tInfo.cari)} TL`],
    ];

    const summaryItems = [
      { label: 'TOPLAM TAHSILAT', value: `${fmt(tInfo.toplamTahsilat)} TL`, bold: true },
      { label: 'Satis Toplam', value: `${fmt(iInfo.satisToplam)} TL` },
      { label: 'Iade Toplam', value: `${fmt(iInfo.iadeToplam)} TL` },
      { label: 'Indirim Toplam', value: `${fmt(iInfo.indirimToplam)} TL` },
      { label: 'Adisyon Adet', value: String(tInfo.adisyonSayisi || 0) },
      { label: 'Beklenen Nakit', value: `${fmt(kInfo.expectedTotal || kInfo.beklenenNakit)} TL` },
      { label: 'Sayilan Nakit', value: `${fmt(kInfo.confirmedTotal || kInfo.sayilanNakit)} TL` },
      { label: 'Sayim Farki', value: `${fmt(kInfo.fark)} TL`, bold: true },
    ];

    print80mmThermal({
      title: 'VARDIYA RAPORU',
      subtitle: `No: ${vInfo.vardiyaNo || '—'} - ${vInfo.kullanici || '—'}`,
      dateStr: new Date().toLocaleString('tr-TR'),
      cashierName: vInfo.kullanici || '—',
      headers: ['TAHSILAT KALEMI', 'TUTAR'],
      rows: rows,
      summaryItems: summaryItems
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .screen-only-layout {
            display: none !important;
          }
          .print-only-layout {
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
          }
          .print-table-corp {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 4px !important;
            margin-bottom: 6px !important;
            font-size: 8pt !important;
          }
          .print-table-corp th {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            font-weight: 700 !important;
            border: 1px solid #cbd5e1 !important;
            padding: 2px 4px !important;
            text-align: left !important;
            text-transform: uppercase !important;
            font-size: 7pt !important;
          }
          .print-table-corp td {
            border: 1px solid #cbd5e1 !important;
            padding: 2px 4px !important;
            color: #334155 !important;
            line-height: 1.15 !important;
          }
          .print-table-corp tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── SCREEN VIEW ── */}
      <div className="relative z-10 p-8 max-w-5xl mx-auto screen-only-layout print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg"><Clock size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Personel Vardiya Raporu</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Personele göre vardiya, tahsilat and satış özeti</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <>
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer">
                  <FileSpreadsheet size={16} /> Excel'e Aktar
                </button>
                <button onClick={handlePrint80mm} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer">
                  <Printer size={16} /> 80mm Yazdır
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-sm shadow-md hover:bg-emerald-100 hover:shadow-lg transition-all active:scale-95 cursor-pointer">
                  <Printer size={16} /> A4 Yazdır / PDF
                </button>
              </>
            )}
            <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
              <ArrowLeft size={18} />
            </button>
          </div>
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
            <button onClick={fetchReport} disabled={!selectedUserId || isLoading} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-md shadow-amber-500/30 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
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

      {/* ── PRINT ONLY LAYOUT (A4 Kurumsal PDF Şablonu) ── */}
      {data && (
        <div className="hidden print:block print-only-layout w-full bg-white text-black p-2 font-sans text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-950 pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/PosNetX4_icon.png" alt="PosNetX Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
              <div>
                <h1 className="text-base font-bold tracking-wider text-slate-900 uppercase">PosNetX RESTORAN YÖNETİM SİSTEMLERİ</h1>
                <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5 uppercase">PERSONEL VARDİYA RAPORU</h2>
                <p className="text-[8.5px] text-slate-500 mt-0.5 italic font-medium">Bu belge resmi işletme raporu olup mali denetim ve operasyonel analizler için üretilmiştir.</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] text-slate-800 font-medium space-y-0.5">
              <div><strong>Vardiya No:</strong> {data.vardiyaBilgisi?.vardiyaNo || '—'}</div>
              <div><strong>İş Günü:</strong> {data.vardiyaBilgisi?.businessDate || '—'}</div>
              <div><strong>Raporlama Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Raporlayan Yetkili:</strong> {user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
            </div>
          </div>

          {/* Minimalist Özet Tablosu (Executive KPI Summary) */}
          <div className="grid grid-cols-4 gap-2 mb-2 border border-slate-300 bg-slate-50/50 p-2 rounded-lg avoid-break">
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Açılış Nakdi</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(data.acilisBilgisi?.acilisNakdi)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Toplam Tahsilat</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(data.tahsilat?.toplamTahsilat)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Net Satış</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(data.islemler?.satisToplam)} ₺</div>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Kasa Sayım Farkı</span>
              <div className={`text-sm font-black mt-0.5 ${(data.kapanis?.fark || 0) !== 0 ? 'text-rose-800' : 'text-emerald-800'}`}>{fmt(data.kapanis?.fark)} ₺</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            {/* Sol Sütun */}
            <div className="space-y-3">
              {/* 1. Genel & Açılış Bilgileri */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">1. Genel & Açılış Bilgileri</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>Vardiya Personeli:</span><span className="font-bold">{data.vardiyaBilgisi?.kullanici || '—'}</span></div>
                  <div className="flex justify-between"><span>Kasa Adı:</span><span className="font-bold">{data.vardiyaBilgisi?.kasaAdi || '—'}</span></div>
                  <div className="flex justify-between"><span>Açılış Zamanı:</span><span className="font-bold">{fmtDT(data.vardiyaBilgisi?.acilisSaati)}</span></div>
                  <div className="flex justify-between"><span>Kapanış Zamanı:</span><span className="font-bold">{fmtDT(data.vardiyaBilgisi?.kapanisSaati)}</span></div>
                  <div className="flex justify-between"><span>Çalışma Süresi:</span><span className="font-bold">{durationStr(data.vardiyaBilgisi?.sureDakika)}</span></div>
                  <div className="flex justify-between border-t pt-0.5"><span>Toplam Açılış Nakdi:</span><span className="font-bold">{fmt(data.acilisBilgisi?.acilisNakdi)} ₺</span></div>
                  {data.acilisBilgisi?.not && <div className="flex justify-between"><span>Not:</span><span className="italic">{data.acilisBilgisi.not}</span></div>}
                </div>
              </div>

              {/* 2. Tahsilat Detayları */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">2. Tahsilat Dağılımı</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>Nakit Tahsilat:</span><span className="font-bold">{fmt(data.tahsilat?.nakit)} ₺</span></div>
                  <div className="flex justify-between"><span>Kredi Kartı Tahsilatı:</span><span className="font-bold">{fmt(data.tahsilat?.krediKarti)} ₺</span></div>
                  <div className="flex justify-between"><span>Cari Tahsilat:</span><span className="font-bold">{fmt(data.tahsilat?.cari)} ₺</span></div>
                  <div className="flex justify-between border-t pt-0.5"><span>Adisyon Adedi:</span><span className="font-bold">{data.tahsilat?.adisyonSayisi} Adet</span></div>
                  <div className="flex justify-between font-black text-slate-950"><span>TOPLAM TAHSİLAT:</span><span>{fmt(data.tahsilat?.toplamTahsilat)} ₺</span></div>
                </div>
              </div>
            </div>

            {/* Sağ Sütun */}
            <div className="space-y-3">
              {/* 3. İşlem Özetleri */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">3. İşlem Detayları</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>Satış Toplamı:</span><span className="font-bold">{fmt(data.islemler?.satisToplam)} ₺</span></div>
                  <div className="flex justify-between text-rose-800"><span>Toplam İade:</span><span className="font-bold">{fmt(data.islemler?.iadeToplam)} ₺</span></div>
                  <div className="flex justify-between text-amber-800"><span>Uygulanan İndirim:</span><span className="font-bold">{fmt(data.islemler?.indirimToplam)} ₺</span></div>
                  <div className="flex justify-between"><span>İptal Edilen Adet:</span><span className="font-bold">{data.islemler?.iptalAdedi} Adet</span></div>
                </div>
              </div>

              {/* 4. Sayım & Kapanış Mutabakatı */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">4. Kasa Sayım & Mutabakat</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>Beklenen Nakit:</span><span className="font-bold">{fmt(data.kapanis?.beklenenNakit)} ₺</span></div>
                  <div className="flex justify-between"><span>Sayılan Nakit:</span><span className="font-bold">{fmt(data.kapanis?.sayilanNakit)} ₺</span></div>
                  <div className={`flex justify-between border-t pt-0.5 font-black ${(data.kapanis?.fark || 0) !== 0 ? 'text-rose-800' : 'text-emerald-800'}`}>
                    <span>MUTABAKAT FARKI:</span>
                    <span>{fmt(data.kapanis?.fark)} ₺</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* İmza Onay Alanı */}
          <div className="mt-4 border-t pt-3 grid grid-cols-2 gap-4 text-center avoid-break">
            <div>
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Vardiya Personeli (Teslim Eden)</div>
              <div className="text-xs font-bold text-slate-950">{data.vardiyaBilgisi?.kullanici || '—'}</div>
              <div className="mt-5 border-b border-dashed border-slate-300 w-28 mx-auto"></div>
            </div>
            <div>
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Kasa Sorumlusu (Teslim Alan)</div>
              <div className="text-xs font-bold text-slate-900">Yönetici / Kasiyer</div>
              <div className="mt-5 border-b border-dashed border-slate-300 w-28 mx-auto"></div>
            </div>
          </div>

          {/* Resmi Rapor Alt Bilgi */}
          <div className="mt-4 text-center text-[7.5px] text-slate-400 border-t pt-3 avoid-break">
            * Bu rapor PosNetX Restoran Otomasyon ve Yönetim Sistemleri veri tabanından anlık olarak üretilmiştir. *
          </div>
        </div>
      )}
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
