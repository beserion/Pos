'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, RefreshCw, BarChart2, Users, XCircle, RotateCcw, Tag, FileSpreadsheet, Printer } from 'lucide-react';
import { API_URL } from '@/lib/apiConfig';
import { exportToExcel, print80mmThermal } from '../../utils/reportExport';

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) fetchData();
  }, [user, loading]);

  const fmt = (n: number) => n?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

  const handleExportExcel = () => {
    if (!data) return;
    
    const ciroHeaders = ['Ciro Kalemi', 'Tutar'];
    const ciroRows = [
      ['Nakit Ciro', `${fmt(data.gunCirosu?.nakitCiro)} ₺`],
      ['Kart Ciro', `${fmt(data.gunCirosu?.kartCiro)} ₺`],
      ['Cari Ciro', `${fmt(data.gunCirosu?.cariCiro)} ₺`],
      ['Diğer Ciro', `${fmt(data.gunCirosu?.digerCiro)} ₺`],
      ['Toplam Ciro', `${fmt(data.gunCirosu?.toplamCiro)} ₺`],
    ];

    const ozetHeaders = ['Gösterge', 'Değer'];
    const ozetRows = [
      ['Satış Adedi', data.islemOzeti?.satisAdedi || 0],
      ['İndirim Toplamı', `${fmt(data.islemOzeti?.indirimToplam)} ₺`],
      ['İptal Ürün Adedi', data.islemOzeti?.iptalUrunAdedi || 0],
      ['İptal Ürün Toplam', `${fmt(data.islemOzeti?.iptalUrunToplam)} ₺`],
      ['İade Ürün Adedi', data.islemOzeti?.iadeUrunAdedi || 0],
      ['İade Ürün Toplam', `${fmt(data.islemOzeti?.iadeUrunToplam)} ₺`],
      ['İade Toplam (Genel)', `${fmt(data.islemOzeti?.iadeToplam)} ₺`],
      ['Açık Masa Sayısı', data.acikMasa?.sayi || 0],
      ['Açık Masa Toplamı', `${fmt(data.acikMasa?.toplam)} ₺`],
    ];

    const garsonHeaders = ['Sıra', 'Garson/Kasiyer Adı', 'Adisyon Sayısı', 'Toplam Ciro'];
    const garsonRows = (data.garsonlarToplamlar || []).map((g: any, idx: number) => [
      idx + 1,
      g.garsonAdi,
      g.adisyonSayisi,
      `${fmt(g.toplam)} ₺`
    ]);

    const sheets = [
      { name: 'Ciro Özet', headers: ciroHeaders, rows: ciroRows },
      { name: 'İşlem Özetleri', headers: ozetHeaders, rows: ozetRows },
      { name: 'Garson Dağılımları', headers: garsonHeaders, rows: garsonRows }
    ];

    if (data.dovizAnalizi && data.dovizAnalizi.length > 0) {
      const dovizHeaders = ['Döviz Cinsi', 'Toplam Tutar'];
      const dovizRows = data.dovizAnalizi.map((d: any) => [d.currency, fmt(d.totalAmount)]);
      sheets.push({ name: 'Alınan Döviz Analizi', headers: dovizHeaders, rows: dovizRows });
    }

    exportToExcel(`Satis_Analizi_${filterDate}`, sheets);
  };

  const handlePrint80mm = () => {
    if (!data) return;

    const rows = [
      ['NAKIT CIRO', `${fmt(data.gunCirosu?.nakitCiro)} TL`],
      ['KART CIRO', `${fmt(data.gunCirosu?.kartCiro)} TL`],
      ['CARI CIRO', `${fmt(data.gunCirosu?.cariCiro)} TL`],
      ['DIGER CIRO', `${fmt(data.gunCirosu?.digerCiro)} TL`],
    ];

    const summaryItems = [
      { label: 'TOPLAM CIRO', value: `${fmt(data.gunCirosu?.toplamCiro)} TL`, bold: true },
      { label: 'SATIS ADEDI', value: String(data.islemOzeti?.satisAdedi || 0) },
      { label: 'INDIRIM TOPLAM', value: `${fmt(data.islemOzeti?.indirimToplam)} TL` },
      { label: 'IPTAL TUTAR', value: `${fmt(data.islemOzeti?.iptalUrunToplam)} TL` },
      { label: 'IADE TUTAR', value: `${fmt(data.islemOzeti?.iadeToplam)} TL` },
      { label: 'ACIK MASA ADET', value: String(data.acikMasa?.sayi || 0) },
      { label: 'ACIK MASA TUTAR', value: `${fmt(data.acikMasa?.toplam)} TL` },
    ];

    const customBlocks = [];
    if (data.garsonlarToplamlar && data.garsonlarToplamlar.length > 0) {
      customBlocks.push({
        title: 'GARSON / KASIYER TOPLAMLARI',
        items: data.garsonlarToplamlar.map((g: any) => ({
          label: `${g.garsonAdi} (${g.adisyonSayisi} Ad.)`,
          value: `${fmt(g.toplam)} TL`
        }))
      });
    }

    if (data.dovizAnalizi && data.dovizAnalizi.length > 0) {
      customBlocks.push({
        title: 'ALINAN DOVIZ TOPLAMLARI',
        items: data.dovizAnalizi.map((d: any) => ({
          label: d.currency,
          value: fmt(d.totalAmount)
        }))
      });
    }

    print80mmThermal({
      title: 'SATIS ANALIZ RAPORU',
      subtitle: `Donem: ${filterDate}`,
      dateStr: new Date().toLocaleString('tr-TR'),
      cashierName: user?.firstName || user?.name || 'Sistem Yoneticisi',
      headers: ['CIRO KALEMI', 'TUTAR'],
      rows: rows,
      summaryItems: summaryItems,
      customBlocks: customBlocks
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]" />
      </div>

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

      {/* ── SCREEN ONLY LAYOUT ── */}
      <div className="relative z-10 p-8 max-w-7xl mx-auto screen-only-layout print:hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><BarChart2 size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Satış Analizi</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Günlük ciro ve tahsilat özeti</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button onClick={() => fetchData(filterDate)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/30 transition-all active:scale-95 cursor-pointer">
              <RefreshCw size={16} /> Yenile
            </button>
            <button onClick={handleExportExcel} disabled={!data} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
              <FileSpreadsheet size={16} /> Excel'e Aktar
            </button>
            <button onClick={handlePrint80mm} disabled={!data} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
              <Printer size={16} /> 80mm Yazdır
            </button>
            <button onClick={() => window.print()} disabled={!data} className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
              <Printer size={16} /> A4 Yazdır / PDF
            </button>
            <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              <MetricCard label="Satış Adedi" value={data.islemOzeti?.satisAdedi} icon={<Users size={18} className="text-indigo-500" />} />
              <MetricCard label="İndirim Toplamı" value={`${fmt(data.islemOzeti?.indirimToplam)} ₺`} icon={<Tag size={18} className="text-amber-500" />} />
              <MetricCard label="İptal Ürün" value={data.islemOzeti?.iptalUrunAdedi} icon={<XCircle size={18} className="text-orange-500" />} danger />
              <MetricCard label="İptal Toplam" value={`${fmt(data.islemOzeti?.iptalUrunToplam)} ₺`} icon={<Tag size={18} className="text-orange-500" />} danger />
              <MetricCard label="İade Ürün" value={data.islemOzeti?.iadeUrunAdedi} icon={<RotateCcw size={18} className="text-rose-500" />} danger />
              <MetricCard label="İade Ürün Toplam" value={`${fmt(data.islemOzeti?.iadeUrunToplam)} ₺`} icon={<Tag size={18} className="text-rose-500" />} danger />
              <MetricCard label="İade Toplam (Genel)" value={`${fmt(data.islemOzeti?.iadeToplam)} ₺`} icon={<RotateCcw size={18} className="text-slate-400" />} />
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

              {/* Alınan Döviz Analizi */}
              {data.dovizAnalizi && data.dovizAnalizi.length > 0 && (
                <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-5 text-lg">Alınan Döviz Analizi</h3>
                  <div className="space-y-3">
                    {data.dovizAnalizi.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase">{d.currency}</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{fmt(d.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── PRINT ONLY LAYOUT (A4 Kurumsal PDF Şablonu) ── */}
      {data && (
        <div className="hidden print:block print-only-layout w-full bg-white text-black p-2 font-sans text-xs">
          
          {/* Resmi Rapor Başlığı */}
          <div className="border-b-2 border-slate-950 pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/PosNetX4_icon.png" alt="PosNetX Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
              <div>
                <h1 className="text-base font-bold tracking-wider text-slate-900 uppercase">PosNetX RESTORAN YÖNETİM SİSTEMLERİ</h1>
                <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5 uppercase">GÜNLÜK SATIŞ ANALİZ RAPORU</h2>
                <p className="text-[8.5px] text-slate-500 mt-0.5 italic font-medium">Bu belge resmi işletme raporu olup mali denetim ve operasyonel analizler için üretilmiştir.</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] text-slate-800 font-medium space-y-0.5">
              <div><strong>Aktif İşletme Günü:</strong> {filterDate}</div>
              <div><strong>Rapor Dönemi:</strong> {filterDate}</div>
              <div><strong>Raporlama Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Raporlayan Yetkili:</strong> {user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
            </div>
          </div>

          {/* Minimalist Özet Tablosu (Executive KPI Summary) */}
          <div className="grid grid-cols-3 gap-2 mb-2 border border-slate-300 bg-slate-50/50 p-2 rounded-lg avoid-break">
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Günün Toplam Cirosu</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(data.gunCirosu?.toplamCiro)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Satış Adedi</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{data.islemOzeti?.satisAdedi} Adet</div>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Toplam İndirim</span>
              <div className="text-sm font-black text-rose-800 mt-0.5">{fmt(data.islemOzeti?.indirimToplam)} ₺</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2 avoid-break">
            <div className="border border-slate-200 p-2 rounded-lg bg-white">
              <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">1. Günün Cirosu</h3>
              <div className="space-y-0.5 text-[8.5px]">
                <div className="flex justify-between"><span>Nakit Ciro:</span><span className="font-bold">{fmt(data.gunCirosu?.nakitCiro)} ₺</span></div>
                <div className="flex justify-between"><span>Kart Ciro:</span><span className="font-bold">{fmt(data.gunCirosu?.kartCiro)} ₺</span></div>
                <div className="flex justify-between"><span>Cari Ciro:</span><span className="font-bold">{fmt(data.gunCirosu?.cariCiro)} ₺</span></div>
                <div className="flex justify-between"><span>Diğer Ciro:</span><span className="font-bold">{fmt(data.gunCirosu?.digerCiro)} ₺</span></div>
                <div className="flex justify-between border-t pt-0.5 font-bold text-slate-950"><span>TOPLAM CİRO:</span><span>{fmt(data.gunCirosu?.toplamCiro)} ₺</span></div>
              </div>
            </div>
            
            <div className="border border-slate-200 p-2 rounded-lg bg-white">
              <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">2. İşlem & Masa Durumu</h3>
              <div className="space-y-0.5 text-[8.5px]">
                <div className="flex justify-between"><span>Satış Kalem Adedi:</span><span className="font-bold">{data.islemOzeti?.satisAdedi}</span></div>
                <div className="flex justify-between"><span>Toplam İndirim:</span><span className="font-bold">{fmt(data.islemOzeti?.indirimToplam)} ₺</span></div>
                <div className="flex justify-between text-rose-800"><span>İade Toplam:</span><span className="font-bold">{fmt(data.islemOzeti?.iadeToplam)} ₺</span></div>
                <div className="flex justify-between text-orange-950"><span>İptal Toplam:</span><span className="font-bold">{fmt(data.islemOzeti?.iptalUrunToplam)} ₺</span></div>
                <div className="flex justify-between border-t pt-0.5"><span>Açık Masa Adedi:</span><span className="font-bold">{data.acikMasa?.sayi}</span></div>
                <div className="flex justify-between"><span>Açık Masa Toplamı:</span><span className="font-bold">{fmt(data.acikMasa?.toplam)} ₺</span></div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 p-2 rounded-lg mb-2 avoid-break bg-white">
            <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">3. Garson / Kasiyer Ciro Dağılımları</h3>
            <table className="print-table-corp">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Sıra</th>
                  <th style={{ width: '50%' }}>Personel Adı</th>
                  <th style={{ width: '20%' }}>Adisyon Adedi</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Toplam Satış</th>
                </tr>
              </thead>
              <tbody>
                {(data.garsonlarToplamlar || []).map((g: any, i: number) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="font-bold">{g.garsonAdi}</td>
                    <td>{g.adisyonSayisi}</td>
                    <td style={{ textAlign: 'right' }} className="font-bold">{fmt(g.toplam)} ₺</td>
                  </tr>
                ))}
                {(data.garsonlarToplamlar || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-slate-400">Veri bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Alınan Döviz Analizi */}
          {data.dovizAnalizi && data.dovizAnalizi.length > 0 && (
            <div className="border border-slate-200 p-2 rounded-lg mb-2 avoid-break bg-white">
              <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">4. Alınan Döviz Analizi</h3>
              <table className="print-table-corp">
                <thead>
                  <tr>
                    <th>Döviz Cinsi</th>
                    <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dovizAnalizi.map((d: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-bold">{d.currency}</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(d.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* İmza Onay Alanı */}
          <div className="mt-4 border-t pt-3 grid grid-cols-2 gap-4 text-center avoid-break">
            <div>
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Raporu Hazırlayan</div>
              <div className="text-xs font-bold text-slate-950">{user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Kasa Sorumlusu / İmza</div>
              <div className="mt-5 border-b border-dashed border-slate-300 w-28 mx-auto"></div>
            </div>
            <div>
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Kontrol Eden / Onaylayan</div>
              <div className="text-xs font-bold text-slate-900">İşletme Yetkilisi</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Yönetici / Kaşe - İmza</div>
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
    <div className="space-y-4 animate-pulse">
      <div className="h-48 bg-slate-200 dark:bg-slate-800/40 rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[...Array(7)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800/40 rounded-2xl" />)}
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
