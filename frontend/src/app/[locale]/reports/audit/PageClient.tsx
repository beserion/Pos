'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, ShieldCheck, Search, RefreshCw, Filter, ChevronLeft, ChevronRight, FileSpreadsheet, Printer } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import { exportToExcel, print80mmThermal } from '../../utils/reportExport';
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

const formatLogDateTime = (businessDate?: string, timestamp?: string) => {
  if (!businessDate && !timestamp) return '—';
  if (!businessDate) {
    return new Date(timestamp!).toLocaleString('tr-TR');
  }
  const parts = businessDate.split('-');
  const formattedDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : businessDate;

  if (timestamp) {
    const timeStr = new Date(timestamp).toLocaleTimeString('tr-TR');
    return `${formattedDate} ${timeStr}`;
  }
  return formattedDate;
};

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

  const fetchData = async (p = page, currentFilters = filters) => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const params = new URLSearchParams({
        page: String(p), limit: '30',
        startDate: currentFilters.startDate, endDate: currentFilters.endDate,
        ...(currentFilters.actionType ? { actionType: currentFilters.actionType } : {}),
        ...(currentFilters.tableNo ? { tableNo: currentFilters.tableNo } : {}),
        ...(currentFilters.saleId ? { saleId: currentFilters.saleId } : {}),
      });
      const res = await axios.get(`${API_URL}/reports/audit?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch { setData(null); }
    finally { setIsLoading(false); }
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

      const updatedFilters = {
        startDate: activeDate,
        endDate: activeDate,
        actionType: '',
        tableNo: '',
        saleId: '',
      };
      setFilters(updatedFilters);
      await fetchData(1, updatedFilters);
    };

    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) initialize();
  }, [user, loading]);

  const handleFilter = () => { setPage(1); fetchData(1); };
  const handlePage = (p: number) => { setPage(p); fetchData(p); };

  const handleExportExcel = () => {
    if (!data || !data.data) return;

    const headers = ['Tarih/Saat', 'İşlem', 'Belge No', 'Masa', 'Ürün', 'Tutar', 'Kullanıcı', 'Açıklama'];
    const rows = data.data.map(log => [
      formatLogDateTime(log.businessDate, log.timestamp),
      getAction(log.actionType).label,
      log.saleId || '—',
      log.tableNo || '—',
      log.productName || '—',
      log.amount ? `${Number(log.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '—',
      log.userId || '—',
      log.description || '—'
    ]);

    exportToExcel(`Denetim_Raporu_${filters.startDate}_${filters.endDate}`, [
      { name: 'Denetim Kayıtları', headers, rows }
    ]);
  };

  const handlePrint80mm = () => {
    if (!data || !data.data) return;

    const rows = data.data.map(log => [
      `${formatLogDateTime(log.businessDate, log.timestamp).substring(11, 16)} ${getAction(log.actionType).label.substring(0, 10)}`,
      log.amount ? `${Number(log.amount).toFixed(1)} TL` : '—'
    ]);

    const summaryItems = [
      { label: 'TOPLAM KAYIT', value: String(data.total), bold: true }
    ];

    print80mmThermal({
      title: 'DENETIM RAPORU',
      subtitle: `Tarih: ${filters.startDate} - ${filters.endDate}`,
      dateStr: new Date().toLocaleString('tr-TR'),
      cashierName: user?.firstName || '—',
      headers: ['SAAT/ISLEM', 'TUTAR'],
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
      <div className="relative z-10 p-8 max-w-7xl mx-auto screen-only-layout print:hidden">
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
            {data && data.data && data.data.length > 0 && (
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
            <button onClick={() => fetchData()} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
              <RefreshCw size={15} /> Yenile
            </button>
            <button onClick={() => router.push(`/${locale}/reports`)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
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
              <button onClick={handleFilter} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-xl shadow-md shadow-rose-500/20 hover:opacity-90 active:scale-95 transition-all text-sm cursor-pointer">
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
                        {formatLogDateTime(log.businessDate, log.timestamp)}
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
                <button onClick={() => handlePage(data.page - 1)} disabled={data.page <= 1} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-30 cursor-pointer">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => handlePage(data.page + 1)} disabled={data.page >= data.lastPage} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-30 cursor-pointer">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PRINT ONLY LAYOUT (A4 Kurumsal PDF Şablonu) ── */}
      {data && data.data && data.data.length > 0 && (
        <div className="hidden print:block print-only-layout w-full bg-white text-black p-2 font-sans text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-950 pb-1 mb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/PosNetX4_icon.png" alt="PosNetX Logo" className="object-contain" style={{ width: '70px', height: '70px' }} />
              <div>
                <h1 className="text-base font-bold tracking-wider text-slate-900 uppercase">PosNetX RESTORAN YÖNETİM SİSTEMLERİ</h1>
                <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-0.5 uppercase">RESMİ SİSTEM DENETİM RAPORU</h2>
                <p className="text-[8.5px] text-slate-500 mt-0.5 italic font-medium">Bu belge resmi işletme raporu olup mali denetim ve operasyonel analizler için üretilmiştir.</p>
              </div>
            </div>
            <div className="text-right text-[8.5px] text-slate-800 font-medium space-y-0.5">
              <div><strong>Rapor Dönemi:</strong> {filters.startDate} – {filters.endDate}</div>
              <div><strong>Kriter / Filtre:</strong> {filters.actionType ? getAction(filters.actionType).label : 'Tüm Kritik İşlemler'}</div>
              <div><strong>Raporlama Tarihi:</strong> {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Raporlayan Yetkili:</strong> {user?.firstName || user?.name || user?.email || 'Sistem Yöneticisi'}</div>
            </div>
          </div>

          {/* Minimalist Özet Tablosu (Executive KPI Summary) */}
          <div className="grid grid-cols-3 gap-2 mb-2 border border-slate-300 bg-slate-50/50 p-2 rounded-lg avoid-break">
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Toplam İşlem Adedi</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{data.total} Adet</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">İşlem Günü Aralığı</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{filters.startDate} / {filters.endDate}</div>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Aktif Filtreleme</span>
              <div className="text-sm font-black text-slate-900 mt-0.5">{filters.actionType ? getAction(filters.actionType).label : 'Filtre Yok'}</div>
            </div>
          </div>

          {/* Rapor Tablosu */}
          <div className="avoid-break">
            <table className="print-table-corp">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Tarih/Saat</th>
                  <th style={{ width: '15%' }}>İşlem Tipi</th>
                  <th style={{ width: '10%' }}>Belge No</th>
                  <th style={{ width: '10%' }}>Masa</th>
                  <th style={{ width: '15%' }}>Ürün</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Tutar</th>
                  <th style={{ width: '10%' }}>Kullanıcı</th>
                  <th style={{ width: '15%' }}>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id}>
                    <td>{formatLogDateTime(log.businessDate, log.timestamp)}</td>
                    <td className="font-bold">{getAction(log.actionType).label}</td>
                    <td>{log.saleId || '—'}</td>
                    <td>{log.tableNo || '—'}</td>
                    <td className="truncate">{log.productName || '—'}</td>
                    <td style={{ textAlign: 'right' }} className="font-bold">
                      {log.amount ? `${Number(log.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '—'}
                    </td>
                    <td>{log.userId || '—'}</td>
                    <td>{log.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
