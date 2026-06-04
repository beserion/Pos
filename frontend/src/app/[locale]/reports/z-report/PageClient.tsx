'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, FileText, Printer, AlertCircle, CheckCircle, Loader, FileSpreadsheet } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { API_URL } from '@/lib/apiConfig';
import { exportToExcel } from '../../utils/reportExport';



const fmt = (n: number) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

export function PageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [zReportList, setZReportList] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genDate, setGenDate] = useState(today());
  const [cashRegisterId, setCashRegisterId] = useState<string>('');
  const [cashRegisters, setCashRegisters] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [isDetailedLoading, setIsDetailedLoading] = useState(false);

  const fetchRegisters = async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/cash-registers`, { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data || [];
      setCashRegisters(list);
      if (list.length > 0) setCashRegisterId(String(list[0].id));
    } catch { setCashRegisters([]); }
  };

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const res = await axios.get(`${API_URL}/reports/z-reports/list`, { headers: { Authorization: `Bearer ${token}` } });
      setZReportList(res.data);
    } catch { setZReportList([]); }
    finally { setIsLoading(false); }
  };

  const generateZReport = async () => {
    setIsGenerating(true); setError(null); setSuccess(null);
    try {
      const token = Cookies.get('token');
      const res = await axios.post(`${API_URL}/reports/z-reports`, { cashRegisterId: Number(cashRegisterId), businessDate: genDate }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(`Z Raporu #${res.data.zNumber} başarıyla oluşturuldu.`);
      setSelectedReport(res.data);
      fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Z Raporu oluşturulamadı.');
    } finally { setIsGenerating(false); }
  };

  const handlePrint = async () => {
    if (!selectedReport) return;
    try {
      const token = Cookies.get('token');
      const res = await axios.post(`${API_URL}/printers/print-z-report`, {
        ...selectedReport,
        cashRegisterName: cashRegisters.find(cr => cr.id === selectedReport.cashRegisterId)?.name || `Kasa #${selectedReport.cashRegisterId}`,
        userName: user?.firstName || user?.name || 'Admin'
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSuccess('Yazıcıya gönderildi.');
      } else {
        setError(res.data.message || 'Yazdırılamadı.');
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Yazdırma hatası.');
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) {
      const token = Cookies.get('token') || '';
      fetchRegisters(token);
      fetchList();
    }
  }, [user, loading]);

  useEffect(() => {
    const fetchDetailedData = async () => {
      if (!selectedReport) {
        setDetailedData(null);
        return;
      }
      setIsDetailedLoading(true);
      try {
        const token = Cookies.get('token');
        const res = await axios.get(
          `${API_URL}/reports/detailed-sales-analysis?startDate=${selectedReport.businessDate}&endDate=${selectedReport.businessDate}&cashRegisterId=${selectedReport.cashRegisterId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDetailedData(res.data);
      } catch (err) {
        console.error('Detailed sales analysis loading error:', err);
        setDetailedData(null);
      } finally {
        setIsDetailedLoading(false);
      }
    };
    fetchDetailedData();
  }, [selectedReport]);

  // Z Raporu Excel Export
  const handleExportExcel = () => {
    if (!selectedReport) return;
    const z = selectedReport;
    
    const summaryHeaders = ['Parametre', 'Değer'];
    const summaryRows = [
      ['Z No', z.zNumber],
      ['Tarih', new Date(z.businessDate).toLocaleDateString('tr-TR')],
      ['Kasa ID', z.cashRegisterId],
      ['Net Satış / Ciro', `${fmt(z.netSales)} ₺`],
      ['Toplam Tahsilat', `${fmt(z.totalCollection)} ₺`],
      ['Nakit Tahsilat', `${fmt(z.cashCollection)} ₺`],
      ['Kredi Kartı Tahsilat', `${fmt(z.creditCardCollection)} ₺`],
      ['Cari Tahsilat', `${fmt(z.cariCollection)} ₺`],
      ['İade Toplamı', `${fmt(z.refundTotal)} ₺`],
      ['İade Ürün Adedi', z.refundCount || 0],
      ['İptal Toplamı', `${fmt(z.cancelTotal)} ₺`],
      ['İndirim Toplamı', `${fmt(z.discountTotal)} ₺`],
      ['Toplam Fiş Sayısı', z.totalReceipts || 0],
      ['Toplam Ürün Adedi', z.totalProductCount || 0],
      ['Servis Bedeli', `${fmt(z.serviceFeeTotal)} ₺`],
      ['KDV Matrahı', `${fmt(z.taxBase)} ₺`],
      ['KDV Toplamı', `${fmt(z.taxTotal)} ₺`],
      ['Beklenen Nakit', `${fmt(z.expectedTotal)} ₺`],
      ['Sayılan Nakit', `${fmt(z.confirmedTotal)} ₺`],
    ];

    const sheets = [
      { name: 'Z Raporu Özet', headers: summaryHeaders, rows: summaryRows }
    ];

    if (detailedData && detailedData.dovizAnalizi && detailedData.dovizAnalizi.length > 0) {
      const dovizHeaders = ['Döviz Cinsi', 'Toplam Tutar'];
      const dovizRows = detailedData.dovizAnalizi.map((d: any) => [d.currency, fmt(d.totalAmount)]);
      sheets.push({ name: 'Alınan Döviz Analizi', headers: dovizHeaders, rows: dovizRows });
    }

    let categoryTotals: any[] = [];
    try { categoryTotals = typeof z.categoryTotals === 'string' ? JSON.parse(z.categoryTotals) : (z.categoryTotals || []); } catch {}
    if (categoryTotals && categoryTotals.length > 0) {
      const catHeaders = ['Kategori Adı', 'Toplam Tutar'];
      const catRows = categoryTotals.map((cat: any) => [cat.name || 'Diğer', `${fmt(cat.total)} ₺`]);
      sheets.push({ name: 'Kategori Satışları', headers: catHeaders, rows: catRows });
    }

    let waiterSales: any[] = [];
    try { waiterSales = typeof z.waiterSales === 'string' ? JSON.parse(z.waiterSales) : (z.waiterSales || []); } catch {}
    if (waiterSales && waiterSales.length > 0) {
      const waiterHeaders = ['Garson Adı', 'Toplam Satış'];
      const waiterRows = waiterSales.map((ws: any) => [ws.waiterName || 'Bilinmeyen', `${fmt(ws.total)} ₺`]);
      sheets.push({ name: 'Garson Satışları', headers: waiterHeaders, rows: waiterRows });
    }

    let catTxTotals: any[] = [];
    if (detailedData?.categoryTransactionTotals) {
      catTxTotals = detailedData.categoryTransactionTotals;
    } else if (z.categoryTransactionTotals) {
      try { catTxTotals = typeof z.categoryTransactionTotals === 'string' ? JSON.parse(z.categoryTransactionTotals) : z.categoryTransactionTotals; } catch {}
    }
    if (catTxTotals && catTxTotals.length > 0) {
      const txHeaders = ['Bölüm (Kategori)', 'İşlem Tipi', 'Miktar (Adet)', 'Toplam Tutar'];
      const txRows = catTxTotals.map((ct: any) => {
        const typeStr = ct.transactionType === 'SALE' && ct.status === 'ACTIVE' ? 'SATIŞ' :
                        ct.transactionType === 'COMPLIMENTARY' && ct.status === 'ACTIVE' ? 'İKRAM' :
                        ct.status === 'CANCELLED' ? 'İPTAL' :
                        ct.status === 'REFUNDED' ? 'İADE' :
                        ct.transactionType === 'NON_PAYABLE' && ct.status === 'ACTIVE' ? 'ÖDENMEZ' :
                        ct.transactionType === 'STAFF' && ct.status === 'ACTIVE' ? 'PERSONEL' :
                        ct.transactionType === 'PROMOTION' && ct.status === 'ACTIVE' ? 'PROMOSYON' : ct.transactionType || ct.status;
        return [ct.categoryName, typeStr, Number(ct.quantity).toFixed(0), `${fmt(ct.total)} ₺`];
      });
      sheets.push({ name: 'Bölüm İşlem Dağılımları', headers: txHeaders, rows: txRows });
    }

    exportToExcel(`Z_Raporu_${z.zNumber}_${z.businessDate}`, sheets);
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

      {/* ── SCREEN ONLY LAYOUT ── */}
      <div className="relative z-10 p-8 max-w-7xl mx-auto screen-only-layout print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg"><FileText size={22} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Z Raporu</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Gün sonu resmi finansal kapanış raporu</p>
            </div>
          </div>
          <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generate Panel */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-5">Z Raporu Oluştur</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">İş Günü</label>
                  <input type="date" value={genDate} onChange={e => setGenDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Kasa</label>
                  <div className="-m-2 w-full">
                    <SearchableSelect
                        value={cashRegisterId}
                        onChange={(val) => setCashRegisterId(val.toString())}
                        options={
                            cashRegisters.length === 0 
                                ? [{ value: '', label: 'Kasa bulunamadı' }]
                                : cashRegisters.map((cr: any) => ({ value: cr.id.toString(), label: cr.name }))
                        }
                    />
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-medium"><AlertCircle size={16} />{error}</div>}
                {success && <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-medium"><CheckCircle size={16} />{success}</div>}
                <button onClick={generateZReport} disabled={isGenerating} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md shadow-emerald-500/30 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isGenerating ? <><Loader size={16} className="animate-spin" /> Oluşturuluyor...</> : <><FileText size={16} /> Z Raporu Al</>}
                </button>
              </div>
            </div>

            {/* Report List */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-4">Geçmiş Z Raporları</h3>
              {isLoading ? <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}</div> : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {zReportList.map((r) => (
                    <button key={r.id} onClick={() => setSelectedReport(r)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedReport?.id === r.id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{r.businessDate}</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">Z#{r.zNumber}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{fmt(r.netSales)} ₺</div>
                    </button>
                  ))}
                  {zReportList.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Henüz Z raporu yok.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Z Report Detail */}
          {selectedReport && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Z Raporu #{selectedReport.zNumber}</h2>
                  <p className="text-slate-500 text-sm mt-1">Program Tarihi: <span className="font-bold text-slate-800 dark:text-white">{new Date(selectedReport.businessDate).toLocaleDateString('tr-TR')}</span> ─ Kasa #{selectedReport.cashRegisterId}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer">
                    <FileSpreadsheet size={16} /> Excel'e Aktar
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all cursor-pointer">
                    <Printer size={16} /> A4 Yazdır
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-all cursor-pointer">
                    <i className="fat fa-print"></i> Termal Yazdır
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <ZBlock color="bg-emerald-50 dark:bg-emerald-500/10" label="Net Satış / Ciro" value={`${fmt(selectedReport.netSales)} ₺`} large accent="text-emerald-700 dark:text-emerald-300" />
                <ZBlock color="bg-indigo-50 dark:bg-indigo-500/10" label="Toplam Tahsilat" value={`${fmt(selectedReport.totalCollection)} ₺`} large accent="text-indigo-700 dark:text-indigo-300" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <ZBlock label="Nakit Tahsilat" value={`${fmt(selectedReport.cashCollection)} ₺`} />
                <ZBlock label="Kredi Kartı" value={`${fmt(selectedReport.creditCardCollection)} ₺`} />
                <ZBlock label="Cari" value={`${fmt(selectedReport.cariCollection)} ₺`} />
                <ZBlock label="İade" value={`${fmt(selectedReport.refundTotal)} ₺${selectedReport.refundCount > 0 ? ` (${Number(selectedReport.refundCount).toFixed(0)} Adet)` : ''}`} accent="text-rose-600" />
                <ZBlock label="İptal" value={`${fmt(selectedReport.cancelTotal)} ₺`} accent="text-orange-600" />
                <ZBlock label="İndirim" value={`${fmt(selectedReport.discountTotal)} ₺`} accent="text-amber-600" />
                <ZBlock label="Toplam Fiş" value={selectedReport.totalReceipts} />
                <ZBlock label="Toplam Ürün" value={selectedReport.totalProductCount} />
                <ZBlock label="Servis Bedeli" value={`${fmt(selectedReport.serviceFeeTotal)} ₺`} />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Vergi Özeti</p>
                  <ZBlock label="KDV Matrahı" value={`${fmt(selectedReport.taxBase)} ₺`} />
                  <div className="mt-2" />
                  <ZBlock label="KDV Toplamı" value={`${fmt(selectedReport.taxTotal)} ₺`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Kapanış Özeti</p>
                  <ZBlock label="Beklenen Nakit" value={`${fmt(selectedReport.expectedTotal)} ₺`} />
                  <div className="mt-2" />
                  <ZBlock label="Sayılan Nakit" value={`${fmt(selectedReport.confirmedTotal)} ₺`} accent="text-emerald-600" />
                </div>
              </div>

              {(selectedReport.categoryTotals?.length > 0 || selectedReport.waiterSales?.length > 0) && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedReport.categoryTotals?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Kategori Bazlı Satışlar</p>
                      <div className="space-y-2">
                        {selectedReport.categoryTotals.map((cat: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{cat.name || 'Diğer'}</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(cat.total)} ₺</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedReport.waiterSales?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Garson Satış Performansı</p>
                      <div className="space-y-2">
                        {selectedReport.waiterSales.map((ws: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{ws.waiterName || 'Bilinmeyen'}</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(ws.total)} ₺</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bölüm & İşlem Detayları Dağılımı */}
              {(() => {
                let catTxTotals = [];
                if (detailedData?.categoryTransactionTotals) {
                  catTxTotals = detailedData.categoryTransactionTotals;
                } else if (selectedReport.categoryTransactionTotals) {
                  catTxTotals = typeof selectedReport.categoryTransactionTotals === 'string'
                    ? JSON.parse(selectedReport.categoryTransactionTotals)
                    : selectedReport.categoryTransactionTotals;
                }
                
                if (catTxTotals && catTxTotals.length > 0) {
                  return (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">Bölüm Detaylı İşlem Dağılımı (Kategori x İşlem Tipi)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catTxTotals.map((ct: any, idx: number) => {
                          const typeStr = ct.transactionType === 'SALE' && ct.status === 'ACTIVE' ? 'SATIŞ' :
                                          ct.transactionType === 'COMPLIMENTARY' && ct.status === 'ACTIVE' ? 'İKRAM' :
                                          ct.status === 'CANCELLED' ? 'İPTAL' :
                                          ct.status === 'REFUNDED' ? 'İADE' :
                                          ct.transactionType === 'NON_PAYABLE' && ct.status === 'ACTIVE' ? 'ÖDENMEZ' :
                                          ct.transactionType === 'STAFF' && ct.status === 'ACTIVE' ? 'PERSONEL' :
                                          ct.transactionType === 'PROMOTION' && ct.status === 'ACTIVE' ? 'PROMOSYON' : ct.transactionType || ct.status;
                          
                          let bg = 'bg-slate-50 dark:bg-slate-900/40';
                          let textCol = 'text-slate-800 dark:text-white';
                          if (ct.status === 'CANCELLED' || ct.status === 'REFUNDED') {
                            bg = 'bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20';
                            textCol = 'text-rose-600 dark:text-rose-400';
                          } else if (ct.transactionType === 'COMPLIMENTARY') {
                            bg = 'bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20';
                            textCol = 'text-emerald-600 dark:text-emerald-400';
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
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{Number(ct.quantity).toFixed(0)} Adet</span>
                                <span className={`text-base font-black ${textCol}`}>{fmt(ct.total)} ₺</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Detailed Sales Analysis Sections */}
              {isDetailedLoading ? (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6 flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
                  <span className="ml-3 text-slate-500 dark:text-slate-400 text-sm font-semibold">Detaylı analiz verileri yükleniyor...</span>
                </div>
              ) : detailedData ? (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6 mt-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-4 uppercase tracking-wider">Detaylı Tahsilat ve Kasa Hareketleri</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <ZBlock label="Satış Nakit" value={`${fmt(detailedData.tahsilatDetay?.find((t: any) => t.odemeYontemi === 'CASH')?.toplam)} ₺`} />
                      <ZBlock label="Cari Nakit" value={`${fmt(detailedData.cariNakit)} ₺`} />
                      <ZBlock label="Satış Kredi Kartı" value={`${fmt(detailedData.tahsilatDetay?.find((t: any) => t.odemeYontemi === 'CREDIT_CARD')?.toplam)} ₺`} />
                      <ZBlock label="Cari Kredi Kartı" value={`${fmt(detailedData.cariKredi)} ₺`} />
                      <ZBlock label="Cari Hesap (Açık Hesap)" value={`${fmt(detailedData.tahsilatDetay?.find((t: any) => t.odemeYontemi === 'CARI')?.toplam)} ₺`} />
                      <ZBlock label="Kasadan Ödeme (Gider) (-)" value={`${fmt(detailedData.payoutTotal)} ₺`} accent="text-rose-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* İşlem Kırılımları */}
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">İşlem Kırılımları</p>
                      <div className="space-y-2">
                        {[
                          { name: 'SATIŞ', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'SALE' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.toplam, 0) || 0 },
                          { name: 'İKRAM', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'COMPLIMENTARY' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                          { name: 'SİLİNEN (İPTAL)', val: detailedData.islemDetaylari?.filter((i: any) => i.status === 'CANCELLED').reduce((sum: number, i: any) => sum + i.toplam, 0) || 0, danger: true },
                          { name: 'İADE', val: detailedData.islemDetaylari?.filter((i: any) => i.status === 'REFUNDED').reduce((sum: number, i: any) => sum + i.toplam, 0) || 0, danger: true },
                          { name: 'ÖDENMEZ', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'NON_PAYABLE' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                          { name: 'PERSONEL', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'STAFF' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                          { name: 'PROMOSYON', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'PROMOTION' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                        ].map((row, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{row.name}</span>
                            <span className={`text-sm font-black ${row.danger ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{fmt(row.val)} ₺</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* İndirimler & Hizmet Tipleri & Döviz */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">İndirim Detayları</p>
                        <div className="grid grid-cols-2 gap-3">
                          <ZBlock label="Satış İndirimi" value={`${fmt(detailedData.satisIndirim)} ₺`} />
                          <ZBlock label="Cari Hesap İndirimi" value={`${fmt(detailedData.cariIndirim)} ₺`} />
                        </div>
                      </div>

                      {detailedData.dovizAnalizi?.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Alınan Döviz Analizi</p>
                          <div className="space-y-2">
                            {detailedData.dovizAnalizi.map((d: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{d.currency}</span>
                                <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(d.totalAmount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailedData.musteriToplamlari?.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Hizmet Tipi Dağılımı</p>
                          <div className="space-y-2">
                            {detailedData.musteriToplamlari.map((m: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{m.tip === 'PAKET' ? 'PAKET (SERVİS)' : 'MASA (KİŞİ)'}</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-xs text-slate-400">{m.adet} Adisyon</span>
                                  <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(m.toplam)} ₺</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Açık Hesap (Cari Liste) */}
                    {detailedData.acikHesapDetay?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Açık Hesap Cari Satışları</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {detailedData.acikHesapDetay.map((a: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px]">{a.cariAdi}</span>
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-500">{fmt(a.toplam)} ₺</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Kasa Tahsilat Dağılımı */}
                    {detailedData.kasiyerTahsilat?.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Kasa / Kasiyer Tahsilat Dağılımı</p>
                        <div className="space-y-2">
                          {detailedData.kasiyerTahsilat.map((k: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{k.kasaAdi}</span>
                              <span className="text-sm font-black text-slate-800 dark:text-white">{fmt(k.toplam)} ₺</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {!selectedReport && !isLoading && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 shadow-xl flex items-center justify-center">
              <div className="text-center text-slate-400">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">Sol taraftan bir Z Raporu seçin veya yeni oluşturun.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PRINT VIEW (Yazdırıldığında Görünecek Kısım - A4 Kurumsal Düzen) ── */}
      {selectedReport && (
        <div className="hidden print:block print-only-layout w-full bg-white text-black p-2 font-sans text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-950 pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/PosNetX4_icon.png" alt="PosNetX Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
              <div>
                <h1 className="text-base font-bold tracking-wider text-slate-900 uppercase">PosNetX RESTORAN YÖNETİM SİSTEMLERİ</h1>
                <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5 uppercase">RESMİ Z RAPORU KAPANİŞ ÖZETİ</h2>
                <p className="text-[8.5px] text-slate-500 mt-0.5 italic font-medium">Bu belge resmi işletme raporu olup mali denetim ve operasyonel analizler için üretilmiştir.</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] text-slate-800 font-medium space-y-0.5">
              <div><strong>İşletme Günü:</strong> {selectedReport.businessDate}</div>
              <div><strong>Z Rapor No:</strong> Z-{selectedReport.zNumber}</div>
              <div><strong>Raporlama Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Raporlayan Yetkili:</strong> {user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
            </div>
          </div>

          {/* Minimalist Özet Tablosu (Executive KPI Summary) */}
          <div className="grid grid-cols-4 gap-2 mb-2 border border-slate-300 bg-slate-50/50 p-2 rounded-lg avoid-break">
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Net Satış / Ciro</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(selectedReport.netSales)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Toplam Tahsilat</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(selectedReport.totalCollection)} ₺</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">KDV Toplamı</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{fmt(selectedReport.taxTotal)} ₺</div>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Fiş / Ürün Sayısı</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{selectedReport.totalReceipts || 0} Fiş / {selectedReport.totalProductCount || 0} Ürün</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            {/* Sol Sütun */}
            <div className="space-y-3">
              {/* 1. Tahsilat Bilgileri */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">1. Tahsilat & Kasa Özetleri</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>Nakit Tahsilat:</span><span className="font-bold">{fmt(selectedReport.cashCollection)} ₺</span></div>
                  <div className="flex justify-between"><span>Kredi Kartı Tahsilat:</span><span className="font-bold">{fmt(selectedReport.creditCardCollection)} ₺</span></div>
                  <div className="flex justify-between"><span>Cari Tahsilat:</span><span className="font-bold">{fmt(selectedReport.cariCollection)} ₺</span></div>
                  <div className="flex justify-between text-rose-800"><span>İade Toplamı (-):</span><span className="font-bold">{fmt(selectedReport.refundTotal)} ₺{selectedReport.refundCount > 0 ? ` (${Number(selectedReport.refundCount).toFixed(0)} Ad.)` : ''}</span></div>
                  <div className="flex justify-between text-orange-950"><span>İptal Toplamı:</span><span className="font-bold">{fmt(selectedReport.cancelTotal)} ₺</span></div>
                  <div className="flex justify-between text-amber-950"><span>İndirim Toplamı:</span><span className="font-bold">{fmt(selectedReport.discountTotal)} ₺</span></div>
                  <div className="flex justify-between border-t pt-0.5 font-bold text-slate-950"><span>TOPLAM TAHSİLAT:</span><span>{fmt(selectedReport.totalCollection)} ₺</span></div>
                </div>
              </div>

              {/* 2. Vergi Özeti */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">2. Vergi Matrah Özetleri</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>KDV Matrahı:</span><span className="font-bold">{fmt(selectedReport.taxBase)} ₺</span></div>
                  <div className="flex justify-between"><span>KDV Toplamı:</span><span className="font-bold">{fmt(selectedReport.taxTotal)} ₺</span></div>
                  <div className="flex justify-between"><span>Servis Bedeli:</span><span className="font-bold">{fmt(selectedReport.serviceFeeTotal)} ₺</span></div>
                </div>
              </div>

              {/* 3. Mutabakat Özeti */}
              <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">3. Kapanış & Mutabakat</h3>
                <div className="space-y-0.5 text-[8.5px]">
                  <div className="flex justify-between"><span>Beklenen Toplam:</span><span className="font-bold">{fmt(selectedReport.expectedTotal)} ₺</span></div>
                  <div className="flex justify-between"><span>Sayılan / Onaylanan:</span><span className="font-bold text-emerald-800">{fmt(selectedReport.confirmedTotal)} ₺</span></div>
                  <div className="flex justify-between border-t pt-0.5 font-bold">
                    <span>Fark (Mutabakat):</span>
                    <span className={selectedReport.confirmedTotal - selectedReport.expectedTotal < 0 ? 'text-rose-800' : 'text-emerald-800'}>
                      {fmt(selectedReport.confirmedTotal - selectedReport.expectedTotal)} ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* Detaylı Rapor Kasa Tahsilat Dağılımı */}
              {detailedData && detailedData.kasiyerTahsilat?.length > 0 && (
                <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                  <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">4. Kasiyer / Kasa Tahsilat Dağılımı</h3>
                  <table className="print-table-corp">
                    <thead>
                      <tr>
                        <th>Kasa / Kasiyer</th>
                        <th style={{ textAlign: 'right' }}>Toplam Ciro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.kasiyerTahsilat.map((k: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-bold">{k.kasaAdi}</td>
                          <td style={{ textAlign: 'right' }} className="font-bold">{fmt(k.toplam)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sağ Sütun */}
            <div className="space-y-3">
              {/* Kategori Bazlı Satışlar */}
              {(() => {
                const categoryTotals = typeof selectedReport.categoryTotals === 'string' ? JSON.parse(selectedReport.categoryTotals) : (selectedReport.categoryTotals || []);
                if (categoryTotals && categoryTotals.length > 0) {
                  return (
                    <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                      <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">5. Kategori Bazlı Satış Dağılımı</h3>
                      <table className="print-table-corp">
                        <thead>
                          <tr>
                            <th>Kategori</th>
                            <th style={{ textAlign: 'right' }}>Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryTotals.map((cat: any, idx: number) => (
                            <tr key={idx}>
                              <td className="font-bold">{cat.name || 'Diğer'}</td>
                              <td style={{ textAlign: 'right' }} className="font-bold">{fmt(cat.total)} ₺</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Garson Satış Dağılımı */}
              {(() => {
                const waiterSales = typeof selectedReport.waiterSales === 'string' ? JSON.parse(selectedReport.waiterSales) : (selectedReport.waiterSales || []);
                if (waiterSales && waiterSales.length > 0) {
                  return (
                    <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                      <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">6. Garson Satış Dağılımı</h3>
                      <table className="print-table-corp">
                        <thead>
                          <tr>
                            <th>Garson Adı</th>
                            <th style={{ textAlign: 'right' }}>Toplam Satış</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waiterSales.map((ws: any, idx: number) => (
                            <tr key={idx}>
                              <td className="font-bold">{ws.waiterName || 'Bilinmeyen'}</td>
                              <td style={{ textAlign: 'right' }} className="font-bold">{fmt(ws.total)} ₺</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Detaylı Rapor İşlem Kırılımları */}
              {detailedData && (
                <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                  <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">7. Detaylı İşlem Kırılımları</h3>
                  <table className="print-table-corp">
                    <thead>
                      <tr>
                        <th>İşlem Türü</th>
                        <th style={{ textAlign: 'right' }}>Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'SATIŞ', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'SALE' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.toplam, 0) || 0 },
                        { name: 'İKRAM', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'COMPLIMENTARY' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                        { name: 'SİLİNEN (İPTAL)', val: detailedData.islemDetaylari?.filter((i: any) => i.status === 'CANCELLED').reduce((sum: number, i: any) => sum + i.toplam, 0) || 0, danger: true },
                        { name: 'İADE', val: detailedData.islemDetaylari?.filter((i: any) => i.status === 'REFUNDED').reduce((sum: number, i: any) => sum + i.toplam, 0) || 0, danger: true },
                        { name: 'ÖDENMEZ', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'NON_PAYABLE' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                        { name: 'PERSONEL', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'STAFF' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                        { name: 'PROMOSYON', val: detailedData.islemDetaylari?.filter((i: any) => i.transactionType === 'PROMOTION' && i.status === 'ACTIVE').reduce((sum: number, i: any) => sum + i.retailToplam, 0) || 0 },
                      ].map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.name}</td>
                          <td style={{ textAlign: 'right' }} className={`font-bold ${row.danger ? 'text-rose-800' : ''}`}>{fmt(row.val)} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Alınan Döviz Analizi */}
              {detailedData && detailedData.dovizAnalizi?.length > 0 && (
                <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                  <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">8. Alınan Döviz Analizi</h3>
                  <table className="print-table-corp">
                    <thead>
                      <tr>
                        <th>Döviz Cinsi</th>
                        <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.dovizAnalizi.map((d: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-bold">{d.currency}</td>
                          <td style={{ textAlign: 'right' }} className="font-bold">{fmt(d.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bölüm Detaylı İşlem Dağılımı (A4) */}
              {(() => {
                let catTxTotals = [];
                if (detailedData?.categoryTransactionTotals) {
                  catTxTotals = detailedData.categoryTransactionTotals;
                } else if (selectedReport.categoryTransactionTotals) {
                  catTxTotals = typeof selectedReport.categoryTransactionTotals === 'string'
                    ? JSON.parse(selectedReport.categoryTransactionTotals)
                    : selectedReport.categoryTransactionTotals;
                }
                
                if (catTxTotals && catTxTotals.length > 0) {
                  return (
                    <div className="border border-slate-200 p-2 rounded-lg bg-white avoid-break">
                      <h3 className="font-bold text-slate-900 mb-1 border-b pb-0.5 text-[9px] uppercase tracking-wider">9. Bölüm Detaylı İşlem Dağılımı</h3>
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
                          {catTxTotals.map((ct: any, idx: number) => {
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
                  );
                }
                return null;
              })()}
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

function ZBlock({ label, value, color = 'bg-slate-50 dark:bg-slate-900/50', large = false, accent = 'text-slate-800 dark:text-white' }: any) {
  return (
    <div className={`${color} rounded-2xl p-4 print:bg-slate-100/70 print:border print:border-slate-200/50`}>
      <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 font-medium mb-1">{label}</div>
      <div className={`font-black ${large ? 'text-2xl' : 'text-lg'} ${accent} print:text-black`}>{value}</div>
    </div>
  );
}
