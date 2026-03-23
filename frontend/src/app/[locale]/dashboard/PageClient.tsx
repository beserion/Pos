'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useParameters } from '../utils/useParameters';

export function PageClient() {
    const tCommon = useTranslations('Common');
    const tDashboard = useTranslations('Dashboard');
    const tAdmin = useTranslations('Admin');
    const locale = useLocale();
    const { user, loading, logout, hasPermission, alertsBell } = useAuth();
    const { params } = useParameters();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${locale}/login`);
        }
        if (user) {
            fetchAccounts();
        }
    }, [user, loading, router, locale]);

    const fetchAccounts = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/finance/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAccounts(res.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setAccountsLoading(false);
        }
    };

    const hasAnyAdminPerm = ['LOCATIONS', 'ZONES', 'TABLES', 'EMPLOYEES', 'WAREHOUSES', 'PRODUCTS', 'MODIFIERS', 'INGREDIENTS', 'COURIERS', 'USERS', 'ROLES', 'SYSTEM', 'PRINTERS', 'PARAMETERS', 'ADMIN'].some(key => hasPermission(`${key}:VIEW`)) || hasPermission('ADMIN:VIEW');

    const getGridCols = (count: number) => {
        switch (count) {
            case 1: return 'lg:grid-cols-1';
            case 2: return 'lg:grid-cols-2';
            case 3: return 'lg:grid-cols-3';
            case 5: return 'lg:grid-cols-5';
            case 6: return 'lg:grid-cols-6';
            default: return 'lg:grid-cols-4';
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800 transition-colors">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                    <span className="text-slate-500 font-medium animate-pulse">{tCommon('loading')}</span>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 relative bg-slate-50 dark:bg-slate-900 overflow-y-auto">
            {/* Background Accents (Glassmorphism blobs) - Wrap in a hidden container to prevent horizontal scroll */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/20 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 dark:bg-violet-600/20 blur-[120px] animate-pulse"></div>
            </div>

            {/* Top Navigation Bar - Ultra Glass */}
            <nav className="relative z-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl shadow-sm border-b border-white/20 dark:border-slate-700/50 transition-colors">
                <div className="w-full px-[50px] h-24 flex items-center justify-between">
                    <div onClick={() => router.push(`/${locale}/dashboard`)} className="cursor-pointer">
                        <img src="/PosNetX3.png" alt="PosNetX Logo" className="h-20 w-auto" />
                    </div>

                    <div className="flex items-center gap-6">


                        <LanguageSwitcher />

                        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/30 dark:bg-slate-800/30 border border-white/20 dark:border-slate-700/50 backdrop-blur-sm shadow-sm ring-1 ring-white/10">
                            <i className="fat fa-user-circle text-indigo-500 dark:text-indigo-400 text-xl"></i>
                            <div className="flex flex-col">
                                {/* <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tCommon('welcome')}</span> */}
                                <span className="text-sm font-bold text-slate-900 dark:text-white -mt-0.5">{user?.firstName} {user?.lastName}</span>
                            </div>
                        </div>

                        {alertsBell}

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md transition-all border border-white/20 dark:border-slate-700/50 shadow-sm"
                        >
                            <i className={`fat ${theme === 'dark' ? 'fa-brightness' : 'fa-moon'} text-lg`}></i>
                        </button>

                        {hasAnyAdminPerm && (
                            <button
                                onClick={() => router.push(`/${locale}/admin`)}
                                className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md transition-all border border-white/20 dark:border-slate-700/50 shadow-sm"
                                title={tCommon('settings')}
                            >
                                <i className="fat fa-gear text-lg"></i>
                            </button>
                        )}

                        <button
                            onClick={logout}
                            className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                            title={tCommon('logout')}
                        >
                            <i className="fat fa-reply"></i>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="relative z-10 w-full px-[50px] py-8">

                {/* Dashboard Grid - Modern High-End Cards */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${getGridCols(params.dashboard_column_count)} gap-6 transition-all duration-500`}>

                    {/* Reservations Card */}
                    {hasPermission('RESERVATIONS:VIEW') && (
                        <DashboardCard
                            title={tDashboard('reservations')}
                            description={tDashboard('reservationsDesc')}
                            icon="fa-calendar-check"
                            color="from-fuchsia-600 to-pink-600"
                            bg="bg-fuchsia-600"
                            onClick={() => router.push(`/${locale}/reservations`)}
                        />
                    )}

                    {/* POS Card */}
                    {hasPermission('SALES:VIEW') && (
                        <DashboardCard
                            title={tDashboard('pos')}
                            description={tDashboard('posDesc')}
                            icon="fa-cash-register"
                            color="from-indigo-500 to-blue-600"
                            bg="bg-blue-500"
                            onClick={() => router.push(`/${locale}/pos`)}
                        />
                    )}

                    {/* Quick Sale Card */}
                    {hasPermission('SALES:VIEW') && (
                        <DashboardCard
                            title={tDashboard('quickSale')}
                            description={tDashboard('quickSaleDesc')}
                            icon="fa-bolt"
                            color="from-orange-500 to-red-600"
                            bg="bg-orange-500"
                            onClick={() => router.push(`/${locale}/quick-sale`)}
                        />
                    )}

                    {/* POS PC (Stand) Card */}
                    {hasPermission('SALES:VIEW') && (
                        <DashboardCard
                            title={tDashboard('posScreen')}
                            description={tDashboard('ordersStandPc')}
                            icon="fa-desktop"
                            color="from-rose-500 to-pink-600"
                            bg="bg-rose-500"
                            onClick={() => router.push(`/${locale}/pos?view=takeorder`)}
                        />
                    )}

                    {/* Delivery Card */}
                    {hasPermission('DELIVERY:VIEW') && (
                        <DashboardCard
                            title={tDashboard('delivery')}
                            description={tDashboard('deliveryDesc')}
                            icon="fa-truck-fast"
                            color="from-amber-500 to-orange-600"
                            bg="bg-amber-500"
                            onClick={() => router.push(`/${locale}/delivery`)}
                        />
                    )}

                    {/* Kitchen Card */}
                    {hasPermission('KITCHEN:VIEW') && (
                        <DashboardCard
                            title={tDashboard('kitchen')}
                            description={tDashboard('kitchenDesc')}
                            icon="fa-utensils"
                            color="from-orange-500 to-red-600"
                            bg="bg-orange-500"
                            onClick={() => router.push(`/${locale}/kitchen`)}
                        />
                    )}


                    {/* Satışlar Card */}
                    {hasPermission('SALES:VIEW') && (
                        <DashboardCard
                            title={tDashboard('sales')}
                            description={tDashboard('salesDesc')}
                            icon="fa-receipt"
                            color="from-rose-500 to-pink-600"
                            bg="bg-rose-500"
                            onClick={() => router.push(`/${locale}/sales`)}
                        />
                    )}

                    {/* Siparişler Card */}
                    {hasPermission('ORDERS:VIEW') && (
                        <DashboardCard
                            title={tDashboard('orders')}
                            description={tDashboard('ordersDesc')}
                            icon="fa-basket-shopping"
                            color="from-orange-500 to-red-600"
                            bg="bg-orange-500"
                            onClick={() => router.push(`/${locale}/admin/orders`)}
                        />
                    )}

                    {/* Cariler Card */}
                    {hasPermission('CARI:VIEW') && (
                        <DashboardCard
                            title={tDashboard('customers')}
                            description={tDashboard('customersDesc')}
                            icon="fa-users"
                            color="from-purple-500 to-violet-600"
                            bg="bg-purple-500"
                            onClick={() => router.push(`/${locale}/customers`)}
                        />
                    )}


                    {/* Firma Hesapları Card */}
                    {hasPermission('FINANCE:VIEW') && (
                        <DashboardCard
                            title="Hesaplar"
                            description={tAdmin('companyAccountsDesc')}
                            icon="fa-building-columns"
                            color="from-blue-500 to-indigo-600"
                            bg="bg-blue-500"
                            onClick={() => router.push(`/${locale}/finance/accounts`)}
                        />
                    )}


                    {/* Finans Card */}
                    {hasPermission('FINANCE:VIEW') && (
                        <DashboardCard
                            title={tDashboard('finance')}
                            description={tDashboard('financeDesc')}
                            icon="fa-coins"
                            color="from-yellow-500 to-amber-600"
                            bg="bg-yellow-500"
                            onClick={() => router.push(`/${locale}/finance`)}
                        />
                    )}

                    {/* Faturalar Card */}
                    {hasPermission('INVOICES:VIEW') && (
                        <DashboardCard
                            title={tDashboard('invoices')}
                            description={tDashboard('invoicesDesc')}
                            icon="fa-file-invoice"
                            color="from-sky-500 to-indigo-600"
                            bg="bg-sky-500"
                            onClick={() => router.push(`/${locale}/invoices`)}
                        />
                    )}


                    {/* Inventory Card */}
                    {hasPermission('PRODUCTS:VIEW') && (
                        <DashboardCard
                            title={tDashboard('inventory')}
                            description={tDashboard('inventoryDesc')}
                            icon="fa-boxes-stacked"
                            color="from-emerald-500 to-teal-600"
                            bg="bg-emerald-500"
                            onClick={() => router.push(`/${locale}/inventory`)}
                        />
                    )}

                    {/* Reports Card */}
                    {hasPermission('REPORTS:VIEW') && (
                        <DashboardCard
                            title={tDashboard('reports')}
                            description={tDashboard('reportsDesc')}
                            icon="fa-chart-mixed"
                            color="from-cyan-500 to-sky-600"
                            bg="bg-cyan-500"
                            onClick={() => router.push(`/${locale}/reports`)}
                        />
                    )}
                    {/* Alerts/Notifications Card */}
                    {hasPermission('ALERTS:VIEW') && (
                        <DashboardCard
                            title={tDashboard('alerts')}
                            description={tDashboard('alertsDesc')}
                            icon="fa-bell-on"
                            color="from-violet-500 to-purple-600"
                            bg="bg-violet-500"
                            onClick={() => router.push(`/${locale}/admin/alerts`)}
                        />
                    )}

                </div>


            </main>
        </div>
    );
}

interface CardProps {
    title: string;
    description: string;
    icon: string;
    color: string;
    bg: string;
    onClick: () => void;
}

function DashboardCard({ title, description, icon, color, bg, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative h-42 bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-[32px] shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] dark:shadow-black/40 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden p-5">

            {/* Background Glow */}
            <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-gradient-to-tr ${color} opacity-10 group-hover:opacity-20 blur-3xl transition-all duration-700`}></div>

            {/* Decorative Right Icon - Silhouette */}
            <div className="absolute -right-2 bottom-4 text-slate-800 dark:text-white opacity-[0.05] dark:opacity-[0.07] transform rotate-[35deg] group-hover:rotate-[45deg] group-hover:scale-110 group-hover:opacity-[0.08] dark:group-hover:opacity-[0.1] transition-all duration-700 pointer-events-none z-0">
                <i className={`fat ${icon} text-[100px] leading-none`}></i>
            </div>

            <div className="flex relative z-10 w-full h-full">
                <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${color} flex items-center justify-center text-white shadow-lg overflow-hidden transform group-hover:scale-110 transition-transform duration-500 ring-4 ring-white/10 dark:ring-slate-700/50`}>
                        <i className={`fat ${icon} text-xl`}></i>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight relative z-10 drop-shadow-sm">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-1 relative z-10 drop-shadow-sm leading-relaxed">{description}</p>
                    </div>
                </div>
            </div>

            {/* Hover Decoration Line */}
            <div className={`absolute bottom-0 left-10 right-10 h-2 rounded-t-full bg-gradient-to-r ${color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center`}></div>
        </div>
    );
}

