'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import {
  ArrowLeft,
  Search,
  Printer,
  Calendar,
  RefreshCw,
  Percent,
  User,
  Grid,
  Info,
  Tag,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, print80mmThermal } from '../../../utils/reportExport';
import { API_URL } from '@/lib/apiConfig';

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
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async (start = startDate, end = endDate) => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const res = await axios.get(
        `${API_URL}/reports/discounts?startDate=${start}&endDate=${end}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      let activeDate = today();
      try {
        const token = Cookies.get('token');
        const res = await axios.get(`${API_URL}/business-day/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.activeBusinessDate) {
          activeDate = res.data.activeBusinessDate.split('T')[0];
        }
      } catch (e) {
        console.error('Error fetching business day status:', e);
      }
      setStartDate(activeDate);
      setEndDate(activeDate);
      await fetchData(activeDate, activeDate);
    };

    if (!loading && !user) {
      router.push(`/${locale}/login`);
    } else if (user) {
      initialize();
    }
  }, [user, loading]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!data || !data.items) return;

    const headers = ['Masa', 'Adisyon No', 'Tarih/Saat', 'Yetkili', 'Ürün', 'Adet', 'Kategori', 'Ürün İndirimi', 'Genel İndirim', 'Net Tutar'];
    const rows = filteredItems.map((item: any) => [
      item.tableName || '—',
      item.saleId || '—',
      new Date(item.transactionDate).toLocaleString('tr-TR'),
      item.staffName || '—',
      item.productName === 'Masa Geneli' ? 'Masa Geneli' : item.productName || '—',
      item.quantity || 0,
      item.productTypeName || '—',
      item.discountAmount > 0 ? `%${item.discountRate} (-${item.discountAmount} ₺)` : '—',
      item.saleDiscountAmount > 0 ? `%${item.saleDiscountRate} (-${item.saleDiscountAmount} ₺)` : '—',
      item.total || 0
    ]);

    exportToExcel(`Indirim_Raporu_${startDate}_${endDate}`, [
      { name: 'İndirimler', headers, rows }
    ]);
  };

  const handlePrint80mm = () => {
    if (!filteredItems || filteredItems.length === 0) return;

    const rows = filteredItems.map((item: any) => [
      `${item.tableName || '—'} - ${item.productName === 'Masa Geneli' ? 'M.Genel' : item.productName?.substring(0, 10)}`,
      item.discountAmount > 0 ? `-${item.discountAmount} TL` : `-${item.saleDiscountAmount} TL`
    ]);

    const summaryItems = [
      { label: 'TOPLAM INDIRIM', value: `${fmt(totalDiscountAmount)} TL`, bold: true },
      { label: 'INDIRIMLI ADET', value: `${totalQuantity} Adet` },
      { label: 'TOPLAM ADISYON', value: String(totalDiscountedTransactions) }
    ];

    print80mmThermal({
      title: 'INDIRIM RAPORU',
      subtitle: `Tarih: ${startDate} - ${endDate}`,
      dateStr: new Date().toLocaleString('tr-TR'),
      cashierName: user?.firstName || '—',
      headers: ['URUN / MASA', 'TUTAR'],
      rows: rows,
      summaryItems: summaryItems
    });
  };

  // Ham veriyi işleme ve genel masa indirimlerini tek satıra indirgeme
  const processedItems = (() => {
    if (!data?.items) return [];

    const transformedItems: any[] = [];
    const processedSaleGeneralDiscounts = new Set();

    data.items.forEach((item: any) => {
      // Ürün satır indirimi varsa, bağımsız satır olarak ekle
      if (item.discountAmount > 0) {
        transformedItems.push({
          ...item,
          saleDiscountAmount: 0,
          saleDiscountRate: 0,
        });
      }

      // Genel masa indirimi varsa ve bu adisyon için henüz genel satır eklenmediyse ekle
      if (item.saleDiscountAmount > 0 && !processedSaleGeneralDiscounts.has(item.saleId)) {
        processedSaleGeneralDiscounts.add(item.saleId);
        transformedItems.push({
          ...item,
          id: `general-${item.saleId}`,
          productName: 'Masa Geneli',
          productTypeName: 'Genel İndirim',
          quantity: 0, // Adet KPI'ını etkilememesi için 0 yapıyoruz
          discountAmount: 0,
          discountRate: 0,
          saleDiscountAmount: item.saleDiscountAmount,
          saleDiscountRate: item.saleDiscountRate,
          total: item.saleTotalAmount,
        });
      }
    });

    return transformedItems;
  })();

  // Canlı arama kelimesine göre filtrele
  const filteredItems = processedItems.filter((item: any) => {
    const term = searchTerm.toLowerCase();
    return (
      item.tableName?.toLowerCase().includes(term) ||
      item.productName?.toLowerCase().includes(term) ||
      item.staffName?.toLowerCase().includes(term) ||
      item.productTypeName?.toLowerCase().includes(term)
    );
  });

  // Dinamik KPI hesaplamaları
  // 1. Toplam İndirimli Ürün Adeti
  const totalQuantity = filteredItems.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0);

  // 2. Çift saymayı önleyen akıllı genel ve satır indirim toplamı
  const uniqueSalesMap = new Map();
  filteredItems.forEach((item: any) => {
    if (item.saleDiscountAmount > 0 && !uniqueSalesMap.has(item.saleId)) {
      uniqueSalesMap.set(item.saleId, Number(item.saleDiscountAmount || 0));
    }
  });
  const totalGeneralDiscount = Array.from(uniqueSalesMap.values()).reduce((a, b) => a + b, 0);
  const totalItemDiscount = filteredItems.reduce((acc: number, curr: any) => acc + Number(curr.discountAmount || 0), 0);
  const totalDiscountAmount = totalGeneralDiscount + totalItemDiscount;

  // 3. Toplam İndirimli Adisyon Sayısı
  const totalDiscountedTransactions = new Set(filteredItems.map((item: any) => item.saleId)).size;

  return (
    <div className="w-full min-h-screen font-sans relative transition-colors duration-300 bg-slate-955">
      
      {/* PREMIUM DYNAMIC NEON GLOW BLOBS (Glassmorphism Arka Planı) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden print:hidden">
        {/* Sol üst neon parıltısı - Emerald/Green Tonları */}
        <div className="absolute -top-[15%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-600/15 to-teal-600/20 blur-[130px] animate-[pulse_8s_infinite_alternate]" />
        {/* Sağ alt neon parıltısı */}
        <div className="absolute -bottom-[15%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-600/15 blur-[130px] animate-[pulse_10s_infinite_alternate]" />
      </div>

      {/* PRINT-SPECIFIC CSS RULES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
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
            padding: 1px 3px !important;
            color: #334155 !important;
            line-height: 1.0 !important;
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

      {/* EKRAN TASARIMI (Yazdırma esnasında gizlenecektir) */}
      <div className="w-full px-[50px] py-12 min-h-screen bg-slate-955 dark:bg-slate-955 relative overflow-hidden flex flex-col justify-start screen-only-layout print:hidden">
        <div className="relative z-10 w-full max-w-8xl mx-auto flex-1 flex flex-col">
          
          {/* HEADER - formtitle Standart Uyumu */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center">
              <div className="relative me-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md animate-pulse" />
                <Percent 
                  className="relative text-emerald-400"
                  style={{ fontSize: '50px', width: '50px', height: '50px' }}
                />
              </div>
              <div>
                <h3 className="mb-0 text-3xl font-extralight text-emerald-400 leading-none uppercase tracking-[0.25em]">
                  Detaylı İndirim Raporu
                </h3>
                <h5 className="text-slate-400 mb-0 text-lg font-medium mt-1.5 leading-relaxed">
                  Adisyonlara ve ürün satırlarına uygulanan tüm indirimlerin masa, yetkili personel ve kategori bazlı dökümü.
                </h5>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {data && filteredItems.length > 0 && (
                <>
                  <button
                    onClick={handleExportExcel}
                    className="px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-[0_4px_20px_-3px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet size={16} /> Excel'e Aktar
                  </button>
                  <button
                    onClick={handlePrint80mm}
                    className="px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-[0_4px_20px_-3px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Printer size={16} /> 80mm Yazdır
                  </button>
                </>
              )}
              <button
                onClick={handlePrint}
                disabled={isLoading || !data}
                className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-[0_4px_20px_-3px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer size={16} /> A4 Yazdır / PDF
              </button>

              <button
                onClick={() => router.push(`/${locale}/reports/detailed`)}
                className="px-6 py-3 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/10 dark:border-slate-800/80 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-white/20 dark:hover:bg-slate-900/60 hover:shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ArrowLeft size={16} /> Geri Dön
              </button>
            </div>
          </div>

          {/* CONTROLS BAR */}
          <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 dark:border-slate-800/60 shadow-[0_20px_40px_rgba(0,0,0,0.2)] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 rounded-2xl px-4 py-2">
                <Calendar size={16} className="text-emerald-400" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="bg-transparent border-none text-slate-200 text-sm font-medium outline-none" 
                />
              </div>
              <span className="text-slate-400 font-bold">–</span>
              <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-800 rounded-2xl px-4 py-2">
                <Calendar size={16} className="text-emerald-400" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="bg-transparent border-none text-slate-200 text-sm font-medium outline-none" 
                />
              </div>
              <button 
                onClick={() => fetchData()} 
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all hover:scale-102 active:scale-95"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Filtrele
              </button>
            </div>

            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Masa, ürün, personel veya kategori ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* LOADING & EMPTY STATE NODES */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-32">
              <div className="relative w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-6 animate-pulse">Rapor Yükleniyor...</p>
            </div>
          ) : !data || filteredItems.length === 0 ? (
            <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-2xl p-16 rounded-[40px] border border-white/10 dark:border-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center flex flex-col items-center justify-center min-h-[300px]">
              <Info size={40} className="text-emerald-400/60 mb-4 animate-bounce" />
              <h4 className="text-xl font-black text-white leading-tight uppercase tracking-wider mb-2">Veri Bulunamadı</h4>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">Seçilen tarihlerde ve arama filtrelerinde indirim işlemi bulunmamaktadır.</p>
            </div>
          ) : (
            <>
              {/* SUMMARY CARDS (KPIs) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 dark:border-slate-800/60 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Toplam İndirim Tutarı</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{fmt(totalDiscountAmount)} ₺</h3>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Tag size={28} />
                  </div>
                </div>

                <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 dark:border-slate-800/60 flex items-center justify-between transition-all hover:border-teal-300 dark:hover:border-teal-500/40 hover:shadow-[0_8px_30px_-5px_rgba(20,184,166,0.3)] hover:scale-[1.02] cursor-pointer">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">İndirimli Ürün Adeti</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalQuantity} Adet</h3>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Percent size={28} />
                  </div>
                </div>

                <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 dark:border-slate-800/60 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">İndirimli Adisyon</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalDiscountedTransactions} Adisyon</h3>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <User size={28} />
                  </div>
                </div>
              </div>

              {/* RAPOR PANEL GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* ANA TABLO PANELİ */}
                <div className="lg:col-span-3 bg-white/5 dark:bg-slate-900/30 backdrop-blur-2xl rounded-[32px] border border-white/10 dark:border-slate-800/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">İndirim Detay Listesi</h3>
                    <div className="text-xs text-slate-400 font-bold bg-slate-800 px-3 py-1.5 rounded-xl">{filteredItems.length} Satır Kaydı</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 dark:border-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-3">Masa</th>
                          <th className="py-4 px-3">Adisyon</th>
                          <th className="py-4 px-3">Tarih / Saat</th>
                          <th className="py-4 px-3">Yetkili</th>
                          <th className="py-4 px-3">Ürün / Adet / Cins</th>
                          <th className="py-4 px-3">Uygulanan İndirim</th>
                          <th className="py-4 px-3 text-right">Net Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 dark:divide-slate-800/20">
                        {filteredItems.map((item: any) => {
                          const hasItemDiscount = item.discountAmount > 0;
                          const hasSaleDiscount = item.saleDiscountAmount > 0;
                          
                          return (
                            <tr key={item.id} className="text-xs text-slate-300 hover:bg-white/5 dark:hover:bg-slate-900/20 transition-all">
                              <td className="py-2 px-3 font-bold text-white">{item.tableName}</td>
                              <td className="py-2 px-3 font-medium text-slate-400">#{item.saleId}</td>
                              <td className="py-2 px-3 whitespace-nowrap text-slate-400">
                                {new Date(item.transactionDate).toLocaleDateString('tr-TR')} {new Date(item.transactionDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-400">{item.staffName}</td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-white">
                                  {item.productName === 'Masa Geneli' ? 'Masa Geneli' : `${item.quantity} x ${item.productName}`}
                                </div>
                                <div className="text-[10px] text-slate-500 font-semibold">{item.productTypeName}</div>
                              </td>
                              <td className="py-2 px-3">
                                {hasItemDiscount && (
                                  <div className="text-red-500 font-extrabold">
                                    Ürün: %{item.discountRate} (-{fmt(item.discountAmount)} ₺)
                                  </div>
                                )}
                                {hasSaleDiscount && (
                                  <div className="text-red-400 font-extrabold">
                                    Genel: %{item.saleDiscountRate} (-{fmt(item.saleDiscountAmount)} ₺)
                                  </div>
                                )}
                                {!hasItemDiscount && !hasSaleDiscount && (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-emerald-400">{fmt(item.total)} ₺</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SAĞ YAN PANEL: İSTATİSTİKLER VE DAĞILIMLAR */}
                <div className="flex flex-col gap-6">
                  
                  {/* 1. ÜRÜN CİNSİ / GRUP DAĞILIMI */}
                  <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-2xl rounded-[32px] border border-white/10 dark:border-slate-800/60 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Grid size={14} className="text-emerald-400" /> Kategori & Cins Dağılımı
                    </h4>
                    <div className="flex flex-col gap-3.5">
                      {data?.categorySummary?.map((cat: any, idx: number) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                            <span className="truncate max-w-[130px]">{cat.categoryName}</span>
                            <span>{cat.totalQuantity} Adet</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>Satır İndirimi</span>
                            <span className="font-bold text-slate-400">{fmt(cat.totalValue)} ₺</span>
                          </div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className="bg-emerald-500 h-full rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (cat.totalQuantity / (totalQuantity || 1)) * 100)}%` 
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. EN ÇOK İNDİRİM YAPAN YETKİLİ */}
                  <div className="bg-white/5 dark:bg-slate-900/30 backdrop-blur-2xl rounded-[32px] border border-white/10 dark:border-slate-800/60 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <User size={14} className="text-emerald-400" /> Yetkili Aktivitesi
                    </h4>
                    <div className="flex flex-col gap-3">
                      {data?.staffSummary?.map((staff: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/30 rounded-xl border border-slate-800/40">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate max-w-[85px]">{staff.staffName}</div>
                              <div className="text-[10px] text-slate-500">{staff.itemTransactionCount} işlem</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-slate-300">{staff.totalQuantity} Adet</div>
                            <div className="text-[10px] font-bold text-emerald-400">{fmt(staff.totalValue)} ₺</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* PRINT ONLY LAYOUT (Kağıt Baskı ve PDF Şablonu) */}
      <div className="hidden print:block print-only-layout w-full bg-white text-black p-2 font-sans text-xs">
        
        {/* Resmi Rapor Başlığı */}
        <div className="border-b-2 border-slate-950 pb-1 mb-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/PosNetX4_icon.png" alt="PosNetX Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
            <div>
              <h1 className="text-base font-bold tracking-wider text-slate-900 uppercase">PosNetX RESTORAN YÖNETİM SİSTEMLERİ</h1>
              <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5 uppercase">DETAYLI İNDİRİM RAPORU</h2>
              <p className="text-[8.5px] text-slate-500 mt-0.5 italic font-medium">Bu belge resmi işletme raporu olup mali denetim ve operasyonel indirim analizleri için üretilmiştir.</p>
            </div>
          </div>
          <div className="text-right text-[8.5px] text-slate-800 font-medium space-y-0.5">
            <div><strong>Aktif İşletme Günü:</strong> {startDate === endDate ? startDate : `${startDate} / ${endDate}`}</div>
            <div><strong>Rapor Dönemi:</strong> {startDate} – {endDate}</div>
            <div><strong>Raporlama Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Raporlayan Yetkili:</strong> {user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
          </div>
        </div>

        {/* Minimalist Özet Tablosu */}
        <div className="grid grid-cols-3 gap-2 mb-2 border border-slate-300 bg-slate-50/50 p-2 rounded-lg avoid-break">
          <div className="text-center border-r border-slate-200">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Toplam İndirim Tutarı</span>
            <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(totalDiscountAmount)} ₺</div>
          </div>
          <div className="text-center border-r border-slate-200">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">İndirimli Ürün Adeti</span>
            <div className="text-sm font-black text-slate-900 mt-0.5">{totalQuantity} Adet</div>
          </div>
          <div className="text-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">İndirimli Adisyon Sayısı</span>
            <div className="text-sm font-black text-slate-900 mt-0.5">{totalDiscountedTransactions} Adet</div>
          </div>
        </div>

        {/* Ana Rapor Detay Listesi */}
        <div className="mb-2">
          <h3 className="text-[9.5px] font-bold text-slate-900 uppercase tracking-wider mb-1 border-l-4 border-slate-800 pl-1.5">
            1. İndirim Detay Listesi ({filteredItems.length} Kayıt)
          </h3>
          <table className="print-table-corp">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Adisyon No</th>
                <th style={{ width: '10%' }}>Masa</th>
                <th style={{ width: '15%' }}>Tarih / Saat</th>
                <th style={{ width: '15%' }}>Yetkili Personel</th>
                <th style={{ width: '32%' }}>İndirimli Ürünler / Miktar / Cins</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Uygulanan İndirim</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => {
                const hasItemDiscount = item.discountAmount > 0;
                const hasSaleDiscount = item.saleDiscountAmount > 0;

                return (
                  <tr key={item.id}>
                    <td className="font-mono text-slate-500">#{item.saleId}</td>
                    <td className="font-bold text-slate-900">{item.tableName}</td>
                    <td className="whitespace-nowrap">
                      {new Date(item.transactionDate).toLocaleDateString('tr-TR')} {new Date(item.transactionDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="font-medium text-slate-700">{item.staffName}</td>
                    <td>
                      <div className="font-bold text-slate-900">
                        {item.productName === 'Masa Geneli' ? 'Masa Geneli' : `${item.quantity} x ${item.productName}`}
                      </div>
                      <div className="text-[7.5px] text-slate-500 font-semibold">{item.productTypeName}</div>
                    </td>
                    <td className="text-right font-bold text-slate-900">
                      {hasItemDiscount && (
                        <div className="text-slate-900">
                          Satır: %{item.discountRate} (-{fmt(item.discountAmount)} ₺)
                        </div>
                      )}
                      {hasSaleDiscount && (
                        <div className="text-slate-700 font-medium">
                          Genel: %{item.saleDiscountRate} (-{fmt(item.saleDiscountAmount)} ₺)
                        </div>
                      )}
                      {!hasItemDiscount && !hasSaleDiscount && (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* İstatistikler ve Dağılım Payları Yan yana Tablolar */}
        <div className="grid grid-cols-2 gap-4 mb-2 avoid-break">
          
          {/* Kategori Dağılımı */}
          <div className="border border-slate-200 rounded-lg p-2 bg-white">
            <h4 className="text-[9px] font-bold text-slate-900 uppercase tracking-wider mb-1 border-b pb-1 flex items-center gap-1">
              2.1. Kategori Dağılımı
            </h4>
            <table className="w-full text-[8px]">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase text-[7px]">
                  <th className="pb-0.5 text-left">Kategori</th>
                  <th className="pb-0.5 text-center">Adet</th>
                  <th className="pb-0.5 text-right">Satır İndirimi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.categorySummary?.map((cat: any, idx: number) => (
                  <tr key={idx} className="text-slate-700">
                    <td className="py-0.5 font-medium truncate max-w-[120px]">{cat.categoryName}</td>
                    <td className="py-0.5 text-center font-bold text-slate-900">{cat.totalQuantity}</td>
                    <td className="py-0.5 text-right font-bold text-slate-900">{fmt(cat.totalValue)} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Personel Dağılımı */}
          <div className="border border-slate-200 rounded-lg p-2 bg-white">
            <h4 className="text-[9px] font-bold text-slate-900 uppercase tracking-wider mb-1 border-b pb-1 flex items-center gap-1">
              2.2. Yetkili Personel Dağılımı
            </h4>
            <table className="w-full text-[8px]">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase text-[7px]">
                  <th className="pb-0.5 text-left">Personel</th>
                  <th className="pb-0.5 text-center">Adet</th>
                  <th className="pb-0.5 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.staffSummary?.map((staff: any, idx: number) => (
                  <tr key={idx} className="text-slate-700">
                    <td className="py-0.5 font-medium truncate max-w-[120px]">{staff.staffName}</td>
                    <td className="py-0.5 text-center font-bold text-slate-900">{staff.totalQuantity}</td>
                    <td className="py-0.5 text-right font-bold text-slate-900">{fmt(staff.totalValue)} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

    </div>
  );
}
