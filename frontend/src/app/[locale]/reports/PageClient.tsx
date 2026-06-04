'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import { useTheme } from 'next-themes';
import { useLocale } from 'next-intl';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  TrendingUp, ArrowLeft, BarChart2, FileText, ClipboardList,
  Clock, ShieldCheck, BarChart, ChevronRight, DollarSign,
  CreditCard, Wallet, Package, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler,
} from 'chart.js';
import { API_URL } from '@/lib/apiConfig';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);



const REPORTS = [
  {
    key: 'sales-analysis',
    label: 'Satış Analizi',
    desc: 'Günün cirosu, tahsilat özeti, garson toplamları',
    icon: BarChart2,
    color: 'from-indigo-500 to-indigo-600',
    glow: 'shadow-indigo-500/30',
    badge: 'Hızlı Kontrol',
  },
  {
    key: 'detailed-sales-analysis',
    label: 'Detaylı Satış Analizi',
    desc: 'Ürün kırılımları, ödeme yöntemleri, indirim detayları',
    icon: BarChart,
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/30',
    badge: 'Detaylı',
  },
  {
    key: 'z-report',
    label: 'Z Raporu',
    desc: 'Gün sonu resmi finansal kapanış raporu',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/30',
    badge: 'Gün Sonu',
  },
  {
    key: 'shift-report',
    label: 'Vardiya Raporu',
    desc: 'Kasiyer teslim, nakit hareketleri, fark analizi',
    icon: Clock,
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/30',
    badge: 'Vardiya',
  },
  {
    key: 'audit',
    label: 'Denetim Raporu',
    desc: 'Kim, neyi, ne zaman değiştirdi — satır bazlı log',
    icon: ShieldCheck,
    color: 'from-rose-500 to-red-600',
    glow: 'shadow-rose-500/30',
    badge: 'Kritik',
  },
];

export function PageClient() {
  const { user, loading, hasFeature } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);


  const [dataLoading, setDataLoading] = useState(true);
  const [activeView, setActiveView] = useState<'hub' | string>('hub');

  const fetchDashboardData = async () => {
    try {
      const token = Cookies.get('token');
      const res = await axios.get(`${API_URL}/reports/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      setDashboardData(res.data);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (!loading && !user) {
      router.push(`/${locale}/login`);
    } else if (user && hasFeature('finance_system')) {
      fetchDashboardData();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [user, loading, router, hasFeature]);

  if (!isMounted || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
    </div>
  );

  const chartOptions: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#94a3b8' : '#64748b', font: { size: 12 }, usePointStyle: true, padding: 20 } },
      tooltip: { backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', titleColor: theme === 'dark' ? '#f8fafc' : '#1e293b', bodyColor: theme === 'dark' ? '#94a3b8' : '#64748b', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', borderWidth: 1, padding: 12, cornerRadius: 12 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' } },
      y: { grid: { color: theme === 'dark' ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.5)' }, ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' } },
    },
  };

  const salesData = {
    labels: dashboardData?.salesData?.labels || ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    datasets: [{ label: 'Günlük Satış (₺)', data: dashboardData?.salesData?.data || [0, 0, 0, 0, 0, 0, 0], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 6 }],
  };

  const balanceData = {
    labels: ['Kasa (Nakit)', 'Banka (POS)', 'Kart'],
    datasets: [{ data: dashboardData?.balanceData?.data || [0, 0, 0], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'], borderWidth: 0, hoverOffset: 10 }],
  };

  const topProductsData = {
    labels: dashboardData?.topProductsData?.labels || [],
    datasets: [{ label: 'Satış Adedi', data: dashboardData?.topProductsData?.data || [], backgroundColor: ['rgba(99,102,241,0.7)', 'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(244,63,94,0.7)', 'rgba(14,165,233,0.7)', 'rgba(139,92,246,0.7)', 'rgba(249,115,22,0.7)', 'rgba(20,184,166,0.7)', 'rgba(236,72,153,0.7)', 'rgba(100,116,139,0.7)'], borderRadius: 12, borderWidth: 0 }],
  };

  if (user && !hasFeature('finance_system')) {
    return (
      <div className="h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col">
        <PremiumModuleLocked moduleName="Raporlar & Analiz Sistemi" featureKey="finance_system" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans transition-colors duration-300">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full px-10 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <TrendingUp size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-none">Raporlar & Analiz</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">İşletmenizin finansal ve operasyonel özeti.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${locale}/reports/detailed`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/30 transition-all active:scale-95"
            >
              <BarChart size={18} /> Detaylı Raporlar
            </button>
            <button
              onClick={() => router.push(`/${locale}/dashboard`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold shadow-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={18} /> Geri Dön
            </button>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
          {REPORTS.map(r => {
            const Icon = r.icon;
            return (
              <button
                key={r.key}
                onClick={() => router.push(`/${locale}/reports/${r.key}`)}
                className={`group relative text-left p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 shadow-xl ${r.glow} hover:scale-[1.03] transition-all duration-300 flex flex-col gap-3`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center text-white shadow-md shadow-indigo-500/10`}>
                  <Icon size={22} />
                </div>
                <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${r.color} text-white w-fit`}>{r.badge}</span>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-base leading-tight">{r.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
                </div>
                <ChevronRight size={16} className="absolute right-4 bottom-6 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <KPICard title="Toplam Gelir" value={`${(dashboardData?.totalIncome || 0).toLocaleString('tr-TR')} ₺`} trend={dashboardData?.incomeTrend || '+0%'} icon={<DollarSign className="text-emerald-500" />} negative={dashboardData?.incomeTrend?.startsWith('-')} loading={dataLoading} />
          <KPICard title="Net Kar" value={`${(dashboardData?.netProfit || 0).toLocaleString('tr-TR')} ₺`} trend={dashboardData?.profitTrend || '+0%'} icon={<TrendingUp className="text-indigo-500" />} negative={dashboardData?.profitTrend?.startsWith('-')} loading={dataLoading} />
          <KPICard title="Mal Maliyeti (COGS)" value={`${(dashboardData?.cogs || 0).toLocaleString('tr-TR')} ₺`} trend={dashboardData?.cogsTrend || '+0%'} icon={<Package className="text-amber-500" />} negative loading={dataLoading} />
          <KPICard title="Giderler" value={`${(dashboardData?.totalExpense || 0).toLocaleString('tr-TR')} ₺`} trend={dashboardData?.expenseTrend || '-0%'} icon={<Wallet className="text-rose-500" />} negative={dashboardData?.expenseTrend?.startsWith('-')} loading={dataLoading} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Haftalık Satış Grafiği</h3>
            <div className="min-h-[350px]"><Line data={salesData} options={chartOptions} /></div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Varlık Dağılımı</h3>
            <div className="min-h-[250px] mb-6"><Doughnut data={balanceData} options={{ ...chartOptions, cutout: '70%', plugins: { ...chartOptions.plugins, legend: { position: 'bottom' } } }} /></div>
            <div className="space-y-4">
              <BalanceItem label="Kasa (Nakit)" value={`${(dashboardData?.kasa || 0).toLocaleString('tr-TR')} ₺`} color="bg-emerald-500" />
              <BalanceItem label="Banka (POS)" value={`${(dashboardData?.banka || 0).toLocaleString('tr-TR')} ₺`} color="bg-blue-500" />
              <BalanceItem label="Kart/Diğer" value={`${(dashboardData?.kart || 0).toLocaleString('tr-TR')} ₺`} color="bg-amber-500" />
            </div>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">En Çok Satan 10 Ürün</h3>
            <div className="min-h-[350px]"><Bar data={topProductsData} options={chartOptions} /></div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">ERP Kar/Zarar Özeti</h3>
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Toplam Hasılat</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{(dashboardData?.totalIncome || 0).toLocaleString('tr-TR')} ₺</div>
              </div>
              <ProgressBar label="Mal Maliyeti (COGS)" value={dashboardData?.cogs || 0} total={dashboardData?.totalIncome || 1} color="bg-amber-400" />
              <ProgressBar label="Operasyonel Giderler" value={dashboardData?.totalExpense || 0} total={dashboardData?.totalIncome || 1} color="bg-rose-400" />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end mt-auto">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Net ERP Karı</span>
                  <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{(dashboardData?.netProfit || 0).toLocaleString('tr-TR')} ₺</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400"><TrendingUp size={24} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, icon, negative = false, loading = false }: any) {
  return (
    <div className="bg-white dark:bg-slate-800/80 border border-white dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">{icon}</div>
        <div className={`flex items-center gap-1 text-sm font-bold ${negative ? 'text-rose-500' : 'text-emerald-500'}`}>
          {loading ? <div className="w-10 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : <>{trend} {negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}</>}
        </div>
      </div>
      <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h4>
      {loading ? <div className="w-32 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mt-1" /> : <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value}</div>}
    </div>
  );
}

function BalanceItem({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-800 dark:text-white">{value}</span>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: any) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 italic font-medium">
        <span>{label}</span><span>{Number(value).toLocaleString('tr-TR')} ₺</span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
