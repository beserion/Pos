'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import Cookies from 'js-cookie';
import axios from 'axios';
import { ArrowLeft, FileText, Printer, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:3050'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050');

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

  useEffect(() => {
    if (!loading && !user) router.push(`/${locale}/login`);
    else if (user) {
      const token = Cookies.get('token') || '';
      fetchRegisters(token);
      fetchList();
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans">
      <div className="relative z-10 p-8 max-w-7xl mx-auto">
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
                  <select value={cashRegisterId} onChange={e => setCashRegisterId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500">
                    {cashRegisters.length === 0 && <option value="">Kasa bulunamadı</option>}
                    {cashRegisters.map((cr: any) => (
                      <option key={cr.id} value={cr.id}>{cr.name}</option>
                    ))}
                  </select>
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
                  <p className="text-slate-500 text-sm mt-1">{selectedReport.businessDate} ─ Kasa #{selectedReport.cashRegisterId}</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                  <Printer size={16} /> Yazdır
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <ZBlock color="bg-emerald-50 dark:bg-emerald-500/10" label="Net Satış / Ciro" value={`${fmt(selectedReport.netSales)} ₺`} large accent="text-emerald-700 dark:text-emerald-300" />
                <ZBlock color="bg-indigo-50 dark:bg-indigo-500/10" label="Toplam Tahsilat" value={`${fmt(selectedReport.totalCollection)} ₺`} large accent="text-indigo-700 dark:text-indigo-300" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <ZBlock label="Nakit Tahsilat" value={`${fmt(selectedReport.cashCollection)} ₺`} />
                <ZBlock label="Kredi Kartı" value={`${fmt(selectedReport.creditCardCollection)} ₺`} />
                <ZBlock label="Cari" value={`${fmt(selectedReport.cariCollection)} ₺`} />
                <ZBlock label="İade" value={`${fmt(selectedReport.refundTotal)} ₺`} accent="text-rose-600" />
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
    </div>
  );
}

function ZBlock({ label, value, color = 'bg-slate-50 dark:bg-slate-900/50', large = false, accent = 'text-slate-800 dark:text-white' }: any) {
  return (
    <div className={`${color} rounded-2xl p-4`}>
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</div>
      <div className={`font-black ${large ? 'text-2xl' : 'text-lg'} ${accent}`}>{value}</div>
    </div>
  );
}
