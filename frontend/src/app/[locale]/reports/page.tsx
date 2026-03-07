'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { useTheme } from 'next-themes';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useLocale } from 'next-intl';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    TrendingUp,
    ArrowLeft,
    DollarSign,
    CreditCard,
    Wallet,
    Package,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function ReportsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const { theme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get('http://localhost:3050/reports/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
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
        } else if (user) {
            fetchDashboardData();
        }
    }, [user, loading, router]);

    if (!isMounted || loading || dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Modern Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: theme === 'dark' ? '#94a3b8' : '#64748b',
                    font: { family: 'inherit', size: 12, weight: 'bold' as const },
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                titleColor: theme === 'dark' ? '#f8fafc' : '#1e293b',
                bodyColor: theme === 'dark' ? '#94a3b8' : '#64748b',
                borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: true
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' }
            },
            y: {
                grid: {
                    color: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                    drawBorder: false
                },
                ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' }
            }
        }
    };

    // 1. Günlük Satışlar Data
    const salesData = {
        labels: dashboardData?.salesData?.labels || ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
        datasets: [{
            label: 'Günlük Satış (₺)',
            data: dashboardData?.salesData?.data || [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
        }]
    };

    // 2. Nakit/Banka Durumu Data
    const balanceData = {
        labels: dashboardData?.balanceData?.labels || ['Kasa (Nakit)', 'Banka (POS)', 'Diğer'],
        datasets: [{
            data: dashboardData?.balanceData?.data || [0, 0, 0],
            backgroundColor: [
                '#10b981', // emerald
                '#3b82f6', // blue
                '#f59e0b', // amber
            ],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    // 3. En Çok Satılan 10 Ürün Data
    const topProductsData = {
        labels: dashboardData?.topProductsData?.labels || ['Ürün Bulunamadı'],
        datasets: [{
            label: 'Satış Adedi',
            data: dashboardData?.topProductsData?.data || [0],
            backgroundColor: 'rgba(139, 92, 246, 0.8)',
            borderRadius: 8,
            hoverBackgroundColor: '#8b5cf6',
        }]
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] font-sans transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full px-[50px] py-10">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 me-5">
                            <TrendingUp size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-none">Raporlar & Analiz</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">İşletmenizin finansal ve operasyonel özeti.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/${locale}/dashboard`)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <ArrowLeft size={18} /> Geri Dön
                    </button>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[20px] mb-10">
                    <KPICard title="Toplam Gelir" value={`${(dashboardData?.totalIncome || 0).toLocaleString('tr-TR')} ₺`} trend="+0%" icon={<DollarSign className="text-emerald-500" />} />
                    <KPICard title="Kasa Nakit" value={`${(dashboardData?.kasa || 0).toLocaleString('tr-TR')} ₺`} trend="+0%" icon={<Wallet className="text-blue-500" />} />
                    <KPICard title="Banka (POS)" value={`${(dashboardData?.banka || 0).toLocaleString('tr-TR')} ₺`} trend="+0%" icon={<CreditCard className="text-indigo-500" />} />
                    <KPICard title="Giderler" value={`${(dashboardData?.totalExpense || 0).toLocaleString('tr-TR')} ₺`} trend="-0%" icon={<Package className="text-rose-500" />} negative />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">
                    {/* Left & Middle Column - Charts */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Daily Sales Chart */}
                        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Haftalık Satış Grafiği</h3>
                            <div className="h-[350px]">
                                <Line data={salesData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Top Products Bar Chart */}
                        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">En Çok Satan 10 Ürün</h3>
                            <div className="h-[350px]">
                                <Bar data={topProductsData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Breakdown */}
                    <div className="space-y-8">
                        {/* Cash/Bank Breakdown */}
                        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl border border-white dark:border-slate-700/50 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Varlık Dağılımı</h3>
                            <div className="h-[250px]">
                                <Doughnut
                                    data={balanceData}
                                    options={{
                                        ...chartOptions,
                                        cutout: '70%',
                                        plugins: {
                                            ...chartOptions.plugins,
                                            legend: { position: 'bottom' }
                                        }
                                    }}
                                />
                            </div>
                            <div className="mt-8 space-y-4">
                                <BalanceItem label="Kasa (Nakit)" value={`${(dashboardData?.kasa || 0).toLocaleString('tr-TR')} ₺`} color="bg-emerald-500" />
                                <BalanceItem label="Banka (POS)" value={`${(dashboardData?.banka || 0).toLocaleString('tr-TR')} ₺`} color="bg-blue-500" />
                                <BalanceItem label="Kart/Diğer" value={`${(dashboardData?.kart || 0).toLocaleString('tr-TR')} ₺`} color="bg-amber-500" />
                            </div>
                        </div>

                        {/* Income / Expense Summary */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-500/20">
                            <h3 className="text-xl font-bold mb-6">Aylık Kar/Zarar Özeti</h3>
                            <div className="space-y-6">
                                <div>
                                    <span className="text-indigo-100 text-sm">Hasılat</span>
                                    <div className="text-3xl font-black mt-1">{(dashboardData?.totalIncome || 0).toLocaleString('tr-TR')} ₺</div>
                                </div>
                                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400" style={{ width: `${dashboardData?.totalIncome > 0 ? Math.min(100, (dashboardData?.totalIncome / (dashboardData?.totalIncome + dashboardData?.totalExpense)) * 100) : 50}%` }}></div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <span className="text-indigo-100 text-sm">Giderler ({(dashboardData?.totalExpense || 0).toLocaleString('tr-TR')} ₺)</span>
                                        <div className="text-xl font-bold mt-1 text-emerald-300">{(dashboardData?.totalIncome - dashboardData?.totalExpense || 0).toLocaleString('tr-TR')} ₺ Net Bakiye</div>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                                        <TrendingUp size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, trend, icon, negative = false }: any) {
    return (
        <div className="bg-white dark:bg-slate-800/80 border border-white dark:border-slate-700/50 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/40 dark:shadow-black/20">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-xl">
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${negative ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {trend} {negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                </div>
            </div>
            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h4>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value}</div>
        </div>
    );
}

function BalanceItem({ label, value, color }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-white">{value}</span>
        </div>
    );
}
