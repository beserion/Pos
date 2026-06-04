'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, Printer, RefreshCw, Search, FileSpreadsheet } from 'lucide-react';
import { API_URL } from '@/lib/apiConfig';
import { exportToExcel, print80mmThermal } from '../../utils/reportExport';

const fmt = (n: number) => {
  if (n === undefined || n === null || isNaN(n)) return '0,00';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPercent = (val: number, total: number) => {
  if (!total || isNaN(val) || isNaN(total)) return '0,00';
  const pct = (val / total) * 100;
  return pct.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) fetchData();
  }, [user, loading]);

  // Calculations for visual elements
  const cashCollection = data?.tahsilatDetay?.find((t: any) => t.odemeYontemi === 'CASH')?.toplam || 0;
  const cardCollection = data?.tahsilatDetay?.find((t: any) => t.odemeYontemi === 'CREDIT_CARD')?.toplam || 0;
  const cariCollection = data?.tahsilatDetay?.find((t: any) => t.odemeYontemi === 'CARI')?.toplam || 0;
  const payoutTotal = data?.payoutTotal || 0;
  
  const grandCollectionTotal = cashCollection + cardCollection + cariCollection;

  // Nakit Toplamları
  const satisNakit = cashCollection;
  const cariNakit = data?.cariNakit || 0;
  const avans = 0;
  const mkOdeme = 0;
  const nakitToplami = satisNakit + cariNakit + avans + mkOdeme;
  const digerTahsilat = data?.tahsilatDetay?.filter((t: any) => t.odemeYontemi !== 'CASH' && t.odemeYontemi !== 'CREDIT_CARD' && t.odemeYontemi !== 'CARI')
    ?.reduce((sum: number, curr: any) => sum + curr.toplam, 0) || 0;
  const kulupKart = 0;

  // Kredi Kartı Toplamları
  const satisKredi = cardCollection;
  const cariKredi = data?.cariKredi || 0;
  const krediToplam = satisKredi + cariKredi;

  // İşlem Toplamları
  const iadeItemTotal = data?.islemDetaylari?.filter((i: any) => i.status === 'REFUNDED')?.reduce((sum: number, curr: any) => sum + curr.toplam, 0) || 0;
  const odenmezItemTotal = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'NON_PAYABLE' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.retailToplam, 0) || 0;
  const silinenItemTotal = data?.islemDetaylari?.filter((i: any) => i.status === 'CANCELLED')?.reduce((sum: number, curr: any) => sum + curr.toplam, 0) || 0;
  const ikramItemTotal = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'COMPLIMENTARY' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.retailToplam, 0) || 0;
  const satisItemTotal = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'SALE' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.toplam, 0) || 0;
  const personelItemTotal = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'STAFF' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.retailToplam, 0) || 0;
  const promosyonItemTotal = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'PROMOTION' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.retailToplam, 0) || 0;

  const iadeItemQty = data?.islemDetaylari?.filter((i: any) => i.status === 'REFUNDED')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;
  const satisItemQty = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'SALE' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;
  const ikramItemQty = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'COMPLIMENTARY' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;
  const silinenItemQty = data?.islemDetaylari?.filter((i: any) => i.status === 'CANCELLED')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;
  const odenmezItemQty = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'NON_PAYABLE' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;
  const personelItemQty = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'STAFF' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;
  const promosyonItemQty = data?.islemDetaylari?.filter((i: any) => i.transactionType === 'PROMOTION' && i.status === 'ACTIVE')?.reduce((sum: number, curr: any) => sum + curr.adet, 0) || 0;

  const grandIslemTotal = iadeItemTotal + odenmezItemTotal + silinenItemTotal + ikramItemTotal + satisItemTotal + personelItemTotal + promosyonItemTotal;

  // İndirim Toplamları
  const satisIndirim = data?.satisIndirim || 0;
  const cariIndirim = data?.cariIndirim || 0;
  const grandIndirimTotal = satisIndirim + cariIndirim;

  // Kategori Bazlı Ürünler
  const categories: Record<string, any[]> = {};
  if (data?.urunKategoriSatis) {
    data.urunKategoriSatis.forEach((item: any) => {
      const cat = item.kategori || 'Diğer';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    });
  }

  // Garson Toplamı
  const waiterSatisToplam = data?.garsonlarToplamlar?.reduce((sum: number, curr: any) => sum + curr.satisToplam, 0) || 0;
  const waiterIndirimToplam = data?.garsonlarToplamlar?.reduce((sum: number, curr: any) => sum + curr.indirimToplam, 0) || 0;

  // Kasiyer Toplamı
  const cashierToplam = data?.kasiyerTahsilat?.reduce((sum: number, curr: any) => sum + curr.toplam, 0) || 0;

  // Müşteri Toplamı
  const handleExportExcel = () => {
    if (!data) return;

    const finansHeaders = ['Kalem Grubu', 'Detay Açıklama', 'Tutar'];
    const finansRows = [
      ['TAHSİLAT', 'Nakit Tahsilat', `${fmt(cashCollection)} ₺`],
      ['TAHSİLAT', 'Kredi Kartı Tahsilat', `${fmt(cardCollection)} ₺`],
      ['TAHSİLAT', 'Cari Hesap Tahsilat', `${fmt(cariCollection)} ₺`],
      ['TAHSİLAT', 'Kasadan Ödeme (Gider) (-)', `${fmt(payoutTotal)} ₺`],
      ['TAHSİLAT', 'NET TAHSİLAT', `${fmt(grandCollectionTotal - payoutTotal)} ₺`],
      [],
      ['NAKİT DETAY', 'Satış Nakit', `${fmt(satisNakit)} ₺`],
      ['NAKİT DETAY', 'Cari Nakit', `${fmt(cariNakit)} ₺`],
      ['NAKİT DETAY', 'Diğer Tahsilatlar', `${fmt(digerTahsilat)} ₺`],
      ['NAKİT DETAY', 'TOPLAM NAKİT', `${fmt(nakitToplami + digerTahsilat)} ₺`],
      [],
      ['KREDİ KARTI', 'Satış Kredi', `${fmt(satisKredi)} ₺`],
      ['KREDİ KARTI', 'Cari Kredi', `${fmt(cariKredi)} ₺`],
      ['KREDİ KARTI', 'TOPLAM KREDİ', `${fmt(krediToplam)} ₺`],
      [],
      ['İŞLEM TUTARLARI', 'Satış İşlemleri', `${fmt(satisItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'İkram İşlemleri', `${fmt(ikramItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'Silinen (İptal) İşlemler', `${fmt(silinenItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'İade İşlemleri', `${fmt(iadeItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'Ödenmez İşlemler', `${fmt(odenmezItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'Personel Satışları', `${fmt(personelItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'Promosyon Satışları', `${fmt(promosyonItemTotal)} ₺`],
      ['İŞLEM TUTARLARI', 'TOPLAM İŞLEM', `${fmt(grandIslemTotal)} ₺`],
      [],
      ['İNDİRİMLER', 'Satış İndirimi', `${fmt(satisIndirim)} ₺`],
      ['İNDİRİMLER', 'Cari İndirimi', `${fmt(cariIndirim)} ₺`],
      ['İNDİRİMLER', 'TOPLAM İNDİRİM', `${fmt(grandIndirimTotal)} ₺`],
    ];

    if (data.dovizAnalizi && data.dovizAnalizi.length > 0) {
      finansRows.push([]);
      data.dovizAnalizi.forEach((d: any) => {
        finansRows.push(['DÖVİZ TAHSİLAT', d.currency, fmt(d.totalAmount)]);
      });
    }

    const urunHeaders = ['Kategori', 'Ürün Adı', 'Satış Adedi', 'Toplam Ciro'];
    const urunRows: any[][] = [];
    Object.entries(categories).forEach(([category, items]) => {
      items.forEach((p: any) => {
        urunRows.push([category, p.urunAdi, p.adet, `${fmt(p.toplam)} ₺`]);
      });
    });

    const digerHeaders = ['Grup', 'Ad / Tanım', 'Detay (Açıklama / Adet)', 'Tutar'];
    const digerRows: any[][] = [];
    
    (data.acikHesapDetay || []).forEach((a: any) => {
      digerRows.push(['Açık Hesap (Cari)', a.cariAdi, 'Cari Borç Kaydı', `${fmt(a.toplam)} ₺`]);
    });
    
    (data.kasiyerTahsilat || []).forEach((k: any) => {
      digerRows.push(['Kasa Tahsilat', k.kasaAdi, 'Kasa Ciro Toplamı', `${fmt(k.toplam)} ₺`]);
    });
    
    (data.garsonlarToplamlar || []).forEach((g: any) => {
      digerRows.push(['Garson Satış', g.garsonAdi, `İndirim: ${fmt(g.indirimToplam)} ₺`, `${fmt(g.satisToplam)} ₺`]);
    });

    exportToExcel(`Detayli_Satis_Analizi_${startDate}_${endDate}`, [
      { name: 'Finansal Özetler', headers: finansHeaders, rows: finansRows },
      { name: 'Ürün Satışları', headers: urunHeaders, rows: urunRows },
      { name: 'Cari & Kasa & Garson', headers: digerHeaders, rows: digerRows }
    ]);
  };

  const handlePrint80mm = () => {
    if (!data) return;

    const rows = [
      ['Satis Nakit', `${fmt(satisNakit)} TL`],
      ['Cari Nakit', `${fmt(cariNakit)} TL`],
      ['Satis Kredi', `${fmt(satisKredi)} TL`],
      ['Cari Kredi', `${fmt(cariKredi)} TL`],
      ['Cari Hesap', `${fmt(cariCollection)} TL`],
      ['Kasa Gider (-)', `${fmt(payoutTotal)} TL`],
    ];

    const summaryItems = [
      { label: 'NET TAHSILAT', value: `${fmt(grandCollectionTotal - payoutTotal)} TL`, bold: true },
      { label: 'Satis Indirim', value: `${fmt(satisIndirim)} TL` },
      { label: 'Cari Indirim', value: `${fmt(cariIndirim)} TL` },
      { label: 'Silinen (Iptal)', value: `${fmt(silinenItemTotal)} TL` },
      { label: 'Iade Toplam', value: `${fmt(iadeItemTotal)} TL` },
      { label: 'Ikram Toplam', value: `${fmt(ikramItemTotal)} TL` },
      { label: 'Adisyon Adet', value: String(data.genelToplamlar?.adisyonSayisi || 0) },
    ];

    const customBlocks = [];
    
    const categorySummaryItems = [];
    for (const [cat, items] of Object.entries(categories)) {
      const catSum = (items as any[]).reduce((sum, item) => sum + item.toplam, 0);
      categorySummaryItems.push({
        label: cat,
        value: `${fmt(catSum)} TL`
      });
    }
    if (categorySummaryItems.length > 0) {
      customBlocks.push({
        title: 'KATEGORI BAZLI SATISLAR',
        items: categorySummaryItems
      });
    }

    if (data.kasiyerTahsilat && data.kasiyerTahsilat.length > 0) {
      customBlocks.push({
        title: 'KASA / KASIYER TAHSILAT',
        items: data.kasiyerTahsilat.map((k: any) => ({
          label: k.kasaAdi,
          value: `${fmt(k.toplam)} TL`
        }))
      });
    }

    if (data.garsonlarToplamlar && data.garsonlarToplamlar.length > 0) {
      customBlocks.push({
        title: 'GARSON SATIS TOPLAMLARI',
        items: data.garsonlarToplamlar.map((g: any) => ({
          label: g.garsonAdi,
          value: `${fmt(g.satisToplam)} TL`
        }))
      });
    }

    print80mmThermal({
      title: 'DETAYLI SATIS ANALIZI',
      subtitle: `Donem: ${startDate} - ${endDate}`,
      dateStr: new Date().toLocaleString('tr-TR'),
      cashierName: user?.firstName || user?.name || 'Sistem Yoneticisi',
      headers: ['FINANS GRUBU', 'TUTAR'],
      rows: rows,
      summaryItems: summaryItems,
      customBlocks: customBlocks
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] font-sans">
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
      
      {/* ── SCREEN VIEW (Ekranda Görünecek Kısım) ── */}
      <div className="print:hidden p-8 max-w-8xl mx-auto space-y-8">
        
        {/* Header - POSAPP Standard (formtitle) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center">
            <i className="fat fa-chart-line-up me-4 text-emerald-600 dark:text-emerald-400" style={{ fontSize: '50px' }}></i>
            <div>
              <h3 className="mb-0 text-3xl font-extralight text-emerald-600 dark:text-emerald-400 leading-none uppercase tracking-[0.25em]">
                DETAYLI SATIŞ ANALİZİ
              </h3>
              <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-1">
                Kasa hareketleri, döviz, açık hesap tahsilatları ve cins bazlı ürün satış özetleri
              </h5>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={isLoading || !data}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={16} /> Excel'e Aktar
            </button>
            <button
              onClick={handlePrint80mm}
              disabled={isLoading || !data}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Printer size={16} /> 80mm Yazdır
            </button>
            <button
              onClick={() => window.print()}
              disabled={isLoading || !data}
              className="px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Printer size={16} /> A4 Yazdır / PDF
            </button>
            <button
              onClick={() => router.push(`/${locale}/reports`)}
              className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Geri Dön
            </button>
          </div>
        </div>

        {/* Date Filter & Refresh */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white dark:border-slate-800 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Başlangıç Tarihi</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" 
              />
            </div>
            <span className="text-slate-400 font-bold self-end mb-2">–</span>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bitiş Tarihi</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" 
              />
            </div>
          </div>
          <button 
            onClick={fetchData} 
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
            Filtrele ve Güncelle
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-[32px] animate-pulse" />
            ))}
          </div>
        ) : !data ? (
          <div className="bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl p-20 text-center text-slate-400 dark:text-slate-500 font-bold">
            Veri bulunamadı. Lütfen filtre değiştirip tekrar deneyin.
          </div>
        ) : (
          <>
            {/* KPI Cards - POSAPP Standard (cardrighticon) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
              {[
                { label: 'Net Satış', value: `${fmt(data.genelToplamlar?.netSatis)} ₺`, icon: 'fa-wallet', color: 'emerald', glow: 'rgba(16,185,129,0.3)' },
                { label: 'Nakit Tahsilat', value: `${fmt(cashCollection)} ₺`, icon: 'fa-money-bill-wave', color: 'indigo', glow: 'rgba(99,102,241,0.3)' },
                { label: 'Kredi Kartı', value: `${fmt(cardCollection)} ₺`, icon: 'fa-credit-card', color: 'purple', glow: 'rgba(168,85,247,0.3)' },
                { label: 'Cari Hesap', value: `${fmt(cariCollection)} ₺`, icon: 'fa-user-tie', color: 'amber', glow: 'rgba(245,158,11,0.3)' },
                { label: 'Kasadan Ödeme (-)', value: `${fmt(payoutTotal)} ₺`, icon: 'fa-hand-holding-usd', color: 'rose', glow: 'rgba(244,63,94,0.3)' },
                { label: 'Adisyon Sayısı', value: data.genelToplamlar?.adisyonSayisi || 0, icon: 'fa-receipt', color: 'cyan', glow: 'rgba(6,182,212,0.3)' }
              ].map((card, i) => (
                <div 
                  key={i} 
                  className={`bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-800 flex items-center justify-between transition-all hover:border-${card.color}-300 dark:hover:border-${card.color}-500/40 hover:scale-[1.03] cursor-pointer`}
                  style={{
                    boxShadow: `0 4px 20px -2px rgba(0,0,0,0.05)`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 12px 30px -5px ${card.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 20px -2px rgba(0,0,0,0.05)`;
                  }}
                >
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{card.value}</h3>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-${card.color}-50 dark:bg-${card.color}-500/10 flex items-center justify-center text-${card.color}-600 dark:text-${card.color}-400`}>
                    <i className={`fat ${card.icon} text-2xl`}></i>
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Sol Taraf (Tahsilat ve Finansal Detaylar) - 5 Sütun */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* Tahsilat Toplamları */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <i className="fat fa-hand-holding-usd text-emerald-500"></i> Tahsilat Toplamları & Oranları
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: 'NAKİT', val: cashCollection, pct: fmtPercent(cashCollection, grandCollectionTotal) },
                      { name: 'KREDİ', val: cardCollection, pct: fmtPercent(cardCollection, grandCollectionTotal) },
                      { name: 'CARİ', val: cariCollection, pct: fmtPercent(cariCollection, grandCollectionTotal) },
                      { name: 'ÖDEME (-)', val: payoutTotal, pct: '—', neg: true },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/50">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">{row.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{row.pct ? `%${row.pct}` : ''}</span>
                          <span className={`font-black text-sm ${row.neg ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                            {row.neg ? '-' : ''}{fmt(row.val)} ₺
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-2">
                      <span className="font-black text-sm">TOPLAM TAHSİLAT</span>
                      <span className="font-black text-base">{fmt(grandCollectionTotal - payoutTotal)} ₺</span>
                    </div>
                  </div>
                </div>

                {/* Nakit Kırılımı */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <i className="fat fa-money-bill-wave text-indigo-500"></i> Nakit Detay Toplamları
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: 'SATIŞ NAKİT', val: satisNakit },
                      { name: 'CARİ NAKİT', val: cariNakit },
                      { name: 'AVANS', val: avans },
                      { name: 'M.K. ÖDEME', val: mkOdeme },
                      { name: 'DİĞER TAHSİLATLAR', val: digerTahsilat },
                      { name: 'KULÜP KART', val: kulupKart },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">{row.name}</span>
                        <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(row.val)} ₺</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-2 font-black text-sm">
                      <span>NAKİT TOPLAMI</span>
                      <span>{fmt(nakitToplami + digerTahsilat)} ₺</span>
                    </div>
                  </div>
                </div>

                {/* Kredi Kartı & Döviz Analizi */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-credit-card text-purple-500"></i> Kredi Kartı Detayları
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">SATIŞ KREDİ</span>
                        <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(satisKredi)} ₺</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">CARİ KREDİ</span>
                        <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(cariKredi)} ₺</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-sm">
                        <span>TOPLAM KREDİ</span>
                        <span>{fmt(krediToplam)} ₺</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-coins text-amber-500"></i> Alınan Döviz Analizi
                    </h4>
                    <div className="space-y-2">
                      {data.dovizAnalizi?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Döviz tahsilatı bulunmamaktadır.</p>
                      ) : (
                        data.dovizAnalizi?.map((d: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                            <span className="font-bold text-sm text-slate-600 dark:text-slate-400">{d.currency}</span>
                            <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(d.totalAmount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* İşlem Toplamları */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <i className="fat fa-tasks text-cyan-500"></i> İşlem Toplamları
                  </h4>
                  <div className="space-y-2">
                    {[
                      { name: 'SATIŞ', val: satisItemTotal, qty: satisItemQty },
                      { name: 'İKRAM', val: ikramItemTotal, qty: ikramItemQty },
                      { name: 'SİLİNEN (İPTAL)', val: silinenItemTotal, qty: silinenItemQty, danger: true },
                      { name: 'İADE', val: iadeItemTotal, qty: iadeItemQty, danger: true },
                      { name: 'ÖDENMEZ', val: odenmezItemTotal, qty: odenmezItemQty },
                      { name: 'PERSONEL', val: personelItemTotal, qty: personelItemQty },
                      { name: 'PROMOSYON', val: promosyonItemTotal, qty: promosyonItemQty },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">{row.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{Number(row.qty).toFixed(0)} Adet</span>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">% {fmtPercent(row.val, grandIslemTotal)}</span>
                          <span className={`font-black text-sm ${row.danger ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{fmt(row.val)} ₺</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mt-2 font-black text-sm">
                      <span>İŞLEM TOPLAMI</span>
                      <span>{fmt(grandIslemTotal)} ₺</span>
                    </div>
                  </div>
                </div>

                {/* İndirimler & Açık Hesap Detay */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-tags text-rose-500"></i> İndirim Toplamları
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">SATIŞ İNDİRİMİ</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">% {fmtPercent(satisIndirim, grandIndirimTotal)}</span>
                          <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(satisIndirim)} ₺</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <span className="font-bold text-sm text-slate-600 dark:text-slate-400">CARİ HESAP İNDİRİMİ</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">% {fmtPercent(cariIndirim, grandIndirimTotal)}</span>
                          <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(cariIndirim)} ₺</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-sm">
                        <span>TOPLAM İNDİRİM</span>
                        <span>{fmt(grandIndirimTotal)} ₺</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-book-open text-emerald-500"></i> Açık Hesap Detayları (Cari Liste)
                    </h4>
                    <div className="space-y-2">
                      {data.acikHesapDetay?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Aktif açık hesap / cari satışı bulunmamaktadır.</p>
                      ) : (
                        data.acikHesapDetay?.map((a: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/50">
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{a.cariAdi}</span>
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{fmt(a.toplam)} ₺</span>
                          </div>
                        ))
                      )}
                      {data.acikHesapDetay?.length > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                          <span>AÇIK HESAP TOPLAM</span>
                          <span>{fmt(cariCollection)} ₺</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Sağ Taraf (Ürün Satış ve Operasyonel Detaylar) - 7 Sütun */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* Bölüm Detaylı İşlem Dağılımı */}
                {data.categoryTransactionTotals && data.categoryTransactionTotals.length > 0 && (
                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-chart-network text-emerald-500"></i> Bölüm Detaylı İşlem Dağılımı (Kategori x İşlem Tipi)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {data.categoryTransactionTotals.map((ct: any, idx: number) => {
                        const typeStr = ct.transactionType === 'SALE' && ct.status === 'ACTIVE' ? 'SATIŞ' :
                                        ct.transactionType === 'COMPLIMENTARY' && ct.status === 'ACTIVE' ? 'İKRAM' :
                                        ct.status === 'CANCELLED' ? 'İPTAL' :
                                        ct.status === 'REFUNDED' ? 'İADE' :
                                        ct.transactionType === 'NON_PAYABLE' && ct.status === 'ACTIVE' ? 'ÖDENMEZ' :
                                        ct.transactionType === 'STAFF' && ct.status === 'ACTIVE' ? 'PERSONEL' :
                                        ct.transactionType === 'PROMOTION' && ct.status === 'ACTIVE' ? 'PROMOSYON' : ct.transactionType || ct.status;
                        
                        let bg = 'bg-slate-50/50 dark:bg-slate-800/10';
                        let textCol = 'text-slate-800 dark:text-white';
                        if (ct.status === 'CANCELLED' || ct.status === 'REFUNDED') {
                          bg = 'bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20';
                          textCol = 'text-rose-500';
                        } else if (ct.transactionType === 'COMPLIMENTARY') {
                          bg = 'bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20';
                          textCol = 'text-emerald-500';
                        }
                        
                        return (
                          <div key={idx} className={`p-4 rounded-2xl flex flex-col justify-between ${bg}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{ct.categoryName}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                ct.status === 'CANCELLED' || ct.status === 'REFUNDED' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' :
                                ct.transactionType === 'COMPLIMENTARY' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>{typeStr}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{Number(ct.quantity).toFixed(0)} Adet</span>
                              <span className={`text-sm font-black ${textCol}`}>{fmt(ct.total)} ₺</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ürün Satış Özeti (Cinslere Göre) */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <i className="fat fa-boxes-stacked text-emerald-500"></i> Ürün Satış Özeti (Cins Bazlı)
                  </h4>
                  
                  {Object.keys(categories).length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Bu tarih aralığında ürün satışı bulunmamaktadır.</p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(categories).map(([category, items], idx) => {
                        const categorySum = items.reduce((sum, item) => sum + item.toplam, 0);
                        return (
                          <div key={idx} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/20">
                            <div className="bg-slate-100/50 dark:bg-slate-800/40 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                              <span className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">{category}</span>
                              <span className="font-black text-xs text-slate-500 dark:text-slate-400">Toplam: {fmt(categorySum)} ₺</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                              {items.map((p, pIdx) => (
                                <div key={pIdx} className="px-4 py-3 flex justify-between items-center hover:bg-slate-100/20 dark:hover:bg-slate-800/10">
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{p.urunAdi}</span>
                                  <div className="flex items-center gap-6">
                                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-8 text-right">{p.adet} Adet</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white w-24 text-right">{fmt(p.toplam)} ₺</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Garson & Kasiyer Satış Toplamları */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Garson Toplamları */}
                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-users-crown text-indigo-500"></i> Garson Satış Toplamları
                    </h4>
                    <div className="space-y-2">
                      {data.garsonlarToplamlar?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Garson kaydı bulunmamaktadır.</p>
                      ) : (
                        data.garsonlarToplamlar?.map((g: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/50">
                            <div>
                              <div className="font-bold text-sm text-slate-800 dark:text-white">{g.garsonAdi}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">İndirim: {fmt(g.indirimToplam)} ₺</div>
                            </div>
                            <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{fmt(g.satisToplam)} ₺</span>
                          </div>
                        ))
                      )}
                      {data.garsonlarToplamlar?.length > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-sm">
                          <span>TOPLAM</span>
                          <span>{fmt(waiterSatisToplam)} ₺</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kasiyer Toplamları */}
                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <i className="fat fa-cash-register text-purple-500"></i> Kasiyer / Kasa Tahsilat
                    </h4>
                    <div className="space-y-2">
                      {data.kasiyerTahsilat?.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">Kasa kaydı bulunmamaktadır.</p>
                      ) : (
                        data.kasiyerTahsilat?.map((k: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/50">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{k.kasaAdi}</span>
                            <span className="font-black text-sm text-purple-600 dark:text-purple-400">{fmt(k.toplam)} ₺</span>
                          </div>
                        ))
                      )}
                      {data.kasiyerTahsilat?.length > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-sm">
                          <span>TOPLAM</span>
                          <span>{fmt(cashierToplam)} ₺</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Müşteri ve Masa Toplamları */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <i className="fat fa-hamburger text-amber-500"></i> Müşteri / Hizmet Tipi Toplamları
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: 'PAKET (SERVİS)', val: data.musteriToplamlari?.find((m: any) => m.tip === 'PAKET')?.toplam || 0, adet: data.musteriToplamlari?.find((m: any) => m.tip === 'PAKET')?.adet || 0 },
                      { name: 'MASA (KİŞİ)', val: data.musteriToplamlari?.find((m: any) => m.tip === 'MASA')?.toplam || 0, adet: data.musteriToplamlari?.find((m: any) => m.tip === 'MASA')?.adet || 0 }
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                        <div>
                          <span className="font-bold text-sm text-slate-800 dark:text-white">{row.name}</span>
                          <span className="text-xs text-slate-400 font-bold block">{row.adet} Adisyon</span>
                        </div>
                        <span className="font-black text-sm text-slate-800 dark:text-white">{fmt(row.val)} ₺</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 font-black text-sm text-slate-800 dark:text-white mt-2">
                      <span>TOPLAM</span>
                      <span>{fmt(data.musteriToplamlari?.reduce((sum: number, m: any) => sum + m.toplam, 0) || 0)} ₺</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </div>

      {/* ── PRINT VIEW (Yazdırıldığında Görünecek Kısım - A4 Kurumsal Düzen) ── */}
      {data && (
        <div className="hidden print:block print-only-layout w-full bg-white text-black p-2 font-sans text-xs">
          
          {/* Resmi Rapor Başlığı */}
          <div className="border-b-2 border-slate-950 pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/PosNetX4_icon.png" alt="PosNetX Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
              <div>
                <h1 className="text-base font-bold tracking-wider text-slate-900 uppercase">PosNetX RESTORAN YÖNETİM SİSTEMLERİ</h1>
                <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5 uppercase">AYRINTILI SATIŞ ANALİZ RAPORU</h2>
                <p className="text-[8.5px] text-slate-500 mt-0.5 italic font-medium">Bu belge resmi işletme raporu olup mali denetim ve operasyonel analizler için üretilmiştir.</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] text-slate-800 font-medium space-y-0.5">
              <div><strong>Aktif İşletme Günü:</strong> {startDate === endDate ? startDate : `${startDate} / ${endDate}`}</div>
              <div><strong>Rapor Dönemi:</strong> {startDate} – {endDate}</div>
              <div><strong>Raporlama Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Raporlayan Yetkili:</strong> {user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
            </div>
          </div>

          {/* Minimalist Özet Tablosu (Executive KPI Summary) */}
          <div className="grid grid-cols-6 gap-2 mb-2 border border-slate-300 bg-slate-50/50 p-2 rounded-lg avoid-break">
            <div className="text-center border-r border-slate-200">
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Net Satış</span>
              <div className="text-[11px] font-black text-slate-900 mt-0.5">{fmt(data.genelToplamlar?.netSatis)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Nakit Tahsilat</span>
              <div className="text-[11px] font-black text-slate-900 mt-0.5">{fmt(cashCollection)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Kredi Kartı</span>
              <div className="text-[11px] font-black text-slate-900 mt-0.5">{fmt(cardCollection)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Cari Hesap</span>
              <div className="text-[11px] font-black text-slate-900 mt-0.5">{fmt(cariCollection)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Kasadan Ödeme (-)</span>
              <div className="text-[11px] font-black text-rose-800 mt-0.5">{fmt(payoutTotal)} ₺</div>
            </div>
            <div className="text-center">
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider block">Adisyon Adet</span>
              <div className="text-[11px] font-black text-slate-900 mt-0.5">{data.genelToplamlar?.adisyonSayisi || 0}</div>
            </div>
          </div>

          {/* Two-Column Grid layout */}
          <div className="grid grid-cols-2 gap-4 items-start">
            
            {/* Left Column (Finans ve Tahsilat) */}
            <div className="space-y-4">
              
              {/* Tahsilat Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">1. TAHSİLAT TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <thead>
                    <tr>
                      <th>ÖDEME YÖNTEMİ</th>
                      <th style={{ textAlign: 'right' }}>TUTAR</th>
                      <th style={{ textAlign: 'right', width: '50px' }}>ORAN%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold">NAKİT</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cashCollection)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(cashCollection, grandCollectionTotal)}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">KREDİ</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cardCollection)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(cardCollection, grandCollectionTotal)}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">CARİ</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cariCollection)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(cariCollection, grandCollectionTotal)}</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-rose-800">ÖDEME (-)</td>
                      <td style={{ textAlign: 'right' }} className="font-bold text-rose-800">{fmt(payoutTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%0,00</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>NET TAHSİLAT</td>
                      <td style={{ textAlign: 'right' }}>{fmt(grandCollectionTotal - payoutTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%100</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Nakit Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">2. NAKİT TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <tbody>
                    <tr>
                      <td>SATIŞ NAKİT</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(satisNakit)} ₺</td>
                    </tr>
                    <tr>
                      <td>CARİ NAKİT</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cariNakit)} ₺</td>
                    </tr>
                    <tr>
                      <td>AVANS</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(avans)} ₺</td>
                    </tr>
                    <tr>
                      <td>M.K.ÖDEME</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(mkOdeme)} ₺</td>
                    </tr>
                    <tr>
                      <td>DİĞER TAHSİLATLAR TOPLAMI</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(digerTahsilat)} ₺</td>
                    </tr>
                    <tr>
                      <td>KULÜP KART TAHSİ. TOPLAMI</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(kulupKart)} ₺</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>NAKİT TOPLAMI</td>
                      <td style={{ textAlign: 'right' }}>{fmt(nakitToplami + digerTahsilat)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Kredi Kartı Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">3. KREDİ KARTI TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <tbody>
                    <tr>
                      <td>SATIŞ KREDİ</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(satisKredi)} ₺</td>
                    </tr>
                    <tr>
                      <td>CARİ KREDİ</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cariKredi)} ₺</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM KREDİ</td>
                      <td style={{ textAlign: 'right' }}>{fmt(krediToplam)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Alınan Döviz Analizi */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">4. ALINAN DÖVİZ ANALİZİ</h3>
                <table className="print-table-corp">
                  <tbody>
                    {data.dovizAnalizi?.map((d: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-bold uppercase">{d.currency}</td>
                        <td style={{ textAlign: 'right' }} className="font-bold">{fmt(d.totalAmount)}</td>
                      </tr>
                    ))}
                    {data.dovizAnalizi?.length === 0 && (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center' }} className="text-slate-400">Kayıt yok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* İşlem Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">5. İŞLEM TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <thead>
                    <tr>
                      <th>İŞLEM TÜRÜ</th>
                      <th style={{ textAlign: 'right' }}>MİKTAR</th>
                      <th style={{ textAlign: 'right' }}>TUTAR</th>
                      <th style={{ textAlign: 'right', width: '50px' }}>ORAN%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>İADE</td>
                      <td style={{ textAlign: 'right' }}>{Number(iadeItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold text-rose-800">{fmt(iadeItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(iadeItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr>
                      <td>ÖDENMEZ</td>
                      <td style={{ textAlign: 'right' }}>{Number(odenmezItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(odenmezItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(odenmezItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr>
                      <td>SİLİNEN (İPTAL)</td>
                      <td style={{ textAlign: 'right' }}>{Number(silinenItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold text-rose-800">{fmt(silinenItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(silinenItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr>
                      <td>İKRAM</td>
                      <td style={{ textAlign: 'right' }}>{Number(ikramItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(ikramItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(ikramItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr>
                      <td>SATIŞ</td>
                      <td style={{ textAlign: 'right' }}>{Number(satisItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(satisItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(satisItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr>
                      <td>PERSONEL</td>
                      <td style={{ textAlign: 'right' }}>{Number(personelItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(personelItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(personelItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr>
                      <td>PROMOSYON</td>
                      <td style={{ textAlign: 'right' }}>{Number(promosyonItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(promosyonItemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(promosyonItemTotal, grandIslemTotal)}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM İŞLEM</td>
                      <td style={{ textAlign: 'right' }}>{Number(satisItemQty + ikramItemQty + silinenItemQty + iadeItemQty + odenmezItemQty + personelItemQty + promosyonItemQty).toFixed(0)} Ad.</td>
                      <td style={{ textAlign: 'right' }}>{fmt(grandIslemTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%100</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* İndirim Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">6. İNDİRİM TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <thead>
                    <tr>
                      <th>TÜR</th>
                      <th style={{ textAlign: 'right' }}>TUTAR</th>
                      <th style={{ textAlign: 'right', width: '50px' }}>ORAN%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>SATIŞ İNDİRİMİ</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(satisIndirim)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(satisIndirim, grandIndirimTotal)}</td>
                    </tr>
                    <tr>
                      <td>CARİ HESAP İNDİRİMİ</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cariIndirim)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%{fmtPercent(cariIndirim, grandIndirimTotal)}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM İNDİRİM</td>
                      <td style={{ textAlign: 'right' }}>{fmt(grandIndirimTotal)} ₺</td>
                      <td style={{ textAlign: 'right' }}>%100</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Açık Hesap Detay */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">7. AÇIK HESAP DETAY</h3>
                <table className="print-table-corp">
                  <tbody>
                    {data.acikHesapDetay?.map((a: any, idx: number) => (
                      <tr key={idx}>
                        <td>{a.cariAdi}</td>
                        <td style={{ textAlign: 'right' }} className="font-bold">{fmt(a.toplam)} ₺</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM CARİ HESAP</td>
                      <td style={{ textAlign: 'right' }}>{fmt(cariCollection)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bölüm Detaylı İşlem Dağılımı (A4) */}
              {data.categoryTransactionTotals && data.categoryTransactionTotals.length > 0 && (
                <div className="avoid-break">
                  <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">7.1. BÖLÜM İŞLEM DETAY DAĞILIMI</h3>
                  <table className="print-table-corp">
                    <thead>
                      <tr>
                        <th>Bölüm (Kategori)</th>
                        <th>İşlem Tipi</th>
                        <th style={{ textAlign: 'right' }}>Miktar</th>
                        <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categoryTransactionTotals.map((ct: any, idx: number) => {
                        const typeStr = ct.transactionType === 'SALE' && ct.status === 'ACTIVE' ? 'SATIŞ' :
                                        ct.transactionType === 'COMPLIMENTARY' && ct.status === 'ACTIVE' ? 'İKRAM' :
                                        ct.status === 'CANCELLED' ? 'İPTAL' :
                                        ct.status === 'REFUNDED' ? 'İADE' :
                                        ct.transactionType === 'NON_PAYABLE' && ct.status === 'ACTIVE' ? 'ÖDENMEZ' :
                                        ct.transactionType === 'STAFF' && ct.status === 'ACTIVE' ? 'PERSONEL' :
                                        ct.transactionType === 'PROMOTION' && ct.status === 'ACTIVE' ? 'PROMOSYON' : ct.transactionType || ct.status;
                        
                        return (
                          <tr key={idx}>
                            <td>{ct.categoryName}</td>
                            <td>{typeStr}</td>
                            <td style={{ textAlign: 'right' }}>{Number(ct.quantity).toFixed(0)} Adet</td>
                            <td style={{ textAlign: 'right' }} className="font-bold">{fmt(ct.total)} ₺</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Right Column (Ürün Satış ve Operasyon) */}
            <div className="space-y-4">
              
              {/* Ürün Satış Özeti */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">8. ÜRÜN SATIŞ ÖZETİ</h3>
                
                {Object.entries(categories).map(([category, items], idx) => {
                  const categorySum = items.reduce((sum, item) => sum + item.toplam, 0);
                  return (
                    <div key={idx} className="mb-2">
                      <div className="font-bold text-[8.5px] uppercase border-b border-black/30 pb-0.5 mb-1">{category}</div>
                      <table className="print-table-corp" style={{ fontSize: '7.5px' }}>
                        <thead>
                          <tr>
                            <th>ÜRÜN ADI</th>
                            <th style={{ textAlign: 'right', width: '40px' }}>MİK</th>
                            <th style={{ textAlign: 'right', width: '70px' }}>TUTAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((p, pIdx) => (
                            <tr key={pIdx}>
                              <td>{p.urunAdi}</td>
                              <td style={{ textAlign: 'right' }} className="font-bold">{p.adet}</td>
                              <td style={{ textAlign: 'right' }} className="font-bold">{fmt(p.toplam)} ₺</td>
                            </tr>
                          ))}
                          <tr style={{ fontWeight: 'bold', borderTop: '1px solid #cbd5e1' }}>
                            <td>TOPLAM</td>
                            <td style={{ textAlign: 'right' }}></td>
                            <td style={{ textAlign: 'right' }}>{fmt(categorySum)} ₺</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* Garson Satış Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">9. GARSON SATIŞ TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <thead>
                    <tr>
                      <th>GARSON</th>
                      <th style={{ textAlign: 'right' }}>İNDİRİM</th>
                      <th style={{ textAlign: 'right' }}>TUTAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.garsonlarToplamlar?.map((g: any, idx: number) => (
                      <tr key={idx}>
                        <td className="font-bold">{g.garsonAdi}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(g.indirimToplam)} ₺</td>
                        <td style={{ textAlign: 'right' }} className="font-bold">{fmt(g.satisToplam)} ₺</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM</td>
                      <td style={{ textAlign: 'right' }}>{fmt(waiterIndirimToplam)} ₺</td>
                      <td style={{ textAlign: 'right' }}>{fmt(waiterSatisToplam)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Kasiyer Tahsilat Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">10. KASİYER TAHSİLAT TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <thead>
                    <tr>
                      <th>KASA</th>
                      <th style={{ textAlign: 'right' }}>TUTAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kasiyerTahsilat?.map((k: any, idx: number) => (
                      <tr key={idx}>
                        <td>{k.kasaAdi}</td>
                        <td style={{ textAlign: 'right' }} className="font-bold">{fmt(k.toplam)} ₺</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM KASA</td>
                      <td style={{ textAlign: 'right' }}>{fmt(cashierToplam)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Müşteri Toplamları */}
              <div className="avoid-break">
                <h3 className="font-bold text-[9.5px] border-b pb-0.5 mb-1 uppercase tracking-wide">11. MÜŞTERİ HİZMET TİPİ TOPLAMLARI</h3>
                <table className="print-table-corp">
                  <tbody>
                    <tr>
                      <td>PAKET (SERVİS)</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(data.musteriToplamlari?.find((m: any) => m.tip === 'PAKET')?.toplam || 0)} ₺</td>
                    </tr>
                    <tr>
                      <td>MASA (KİŞİ)</td>
                      <td style={{ textAlign: 'right' }} className="font-bold">{fmt(data.musteriToplamlari?.find((m: any) => m.tip === 'MASA')?.toplam || 0)} ₺</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                      <td>TOPLAM</td>
                      <td style={{ textAlign: 'right' }}>{fmt(data.musteriToplamlari?.reduce((sum: number, m: any) => sum + m.toplam, 0) || 0)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

          </div>

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
