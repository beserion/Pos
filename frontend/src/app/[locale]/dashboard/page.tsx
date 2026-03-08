'use client';
import { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function DashboardPage() {
    const tCommon = useTranslations('Common');
    const tDashboard = useTranslations('Dashboard');
    const tAdmin = useTranslations('Admin');
    const locale = useLocale();
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/${locale}/login`);
        }
    }, [user, loading, router, locale]);

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
                <div className="w-full px-[50px] h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:rotate-12 transition-transform duration-500">
                            <i className="fat fa-bolt text-white text-xl"></i>
                        </div>
                        <span className="font-extrabold text-2xl tracking-tighter text-slate-900 dark:text-white">
                            Antigravity<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">POS</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md transition-all border border-white/20 dark:border-slate-700/50 shadow-sm"
                        >
                            <i className={`fat ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
                        </button>

                        <LanguageSwitcher />

                        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/30 dark:bg-slate-800/30 border border-white/20 dark:border-slate-700/50 backdrop-blur-sm shadow-sm ring-1 ring-white/10">
                            <i className="fat fa-user-circle text-indigo-500 dark:text-indigo-400 text-xl"></i>
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tCommon('back') === 'Geri Dön' ? 'Hoş geldin,' : 'Welcome,'}</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white -mt-0.5">{user?.firstName} {user?.lastName}</span>
                            </div>
                        </div>

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
            <main className="relative z-10 w-full px-[50px] py-12">

                {/* Form Title Section - Centered Block */}
                <div className="mb-14 flex justify-center">
                    <div className="flex items-center text-start gap-4">
                        {/* <i className="fat fa-grid-2 text-indigo-600 dark:text-indigo-400 animate-pulse" style={{ fontSize: '50px' }}></i> */}
                        <div>
                            <div className="relative inline-flex flex-col items-center pb-3 text-center">
                                <h3 className="text-3xl mb-0 font-extralight text-indigo-600 dark:text-indigo-400 tracking-[0.2em] leading-none uppercase" id="title">{tDashboard('title')}</h3>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[80%] h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-100"></div>
                                <h5 className="text-slate-400 dark:text-slate-500 text-lg font-medium mt-1">{tDashboard('subtitle')}</h5>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid - Modern High-End Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px]">

                    {/* Reservations Card */}
                    <DashboardCard
                        title={tDashboard('reservations')}
                        description={tDashboard('reservationsDesc')}
                        icon="fa-calendar-check"
                        color="from-fuchsia-600 to-pink-600"
                        bg="bg-fuchsia-600"
                        onClick={() => router.push(`/${locale}/reservations`)}
                    />

                    {/* POS Card */}
                    <DashboardCard
                        title={tDashboard('pos')}
                        description={tDashboard('posDesc')}
                        icon="fa-cash-register"
                        color="from-indigo-500 to-blue-600"
                        bg="bg-blue-500"
                        onClick={() => router.push(`/${locale}/pos`)}
                    />

                    {/* Quick Sale Card */}
                    <DashboardCard
                        title={tDashboard('quickSale')}
                        description={tDashboard('quickSaleDesc')}
                        icon="fa-bolt"
                        color="from-orange-500 to-red-600"
                        bg="bg-orange-500"
                        onClick={() => router.push(`/${locale}/quick-sale`)}
                    />

                    {/* Delivery Card */}
                    <DashboardCard
                        title={tDashboard('delivery')}
                        description={tDashboard('deliveryDesc')}
                        icon="fa-truck-fast"
                        color="from-amber-500 to-orange-600"
                        bg="bg-amber-500"
                        onClick={() => router.push(`/${locale}/delivery`)}
                    />

                    {/* Cariler Card */}
                    <DashboardCard
                        title={tDashboard('customers')}
                        description={tDashboard('customersDesc')}
                        icon="fa-users"
                        color="from-purple-500 to-violet-600"
                        bg="bg-purple-500"
                        onClick={() => router.push(`/${locale}/customers`)}
                    />


                    {/* Finans Card */}
                    <DashboardCard
                        title={tDashboard('finance')}
                        description={tDashboard('financeDesc')}
                        icon="fa-coins"
                        color="from-yellow-500 to-amber-600"
                        bg="bg-yellow-500"
                        onClick={() => router.push(`/${locale}/finance`)}
                    />

                    {/* Siparişler Card */}
                    <DashboardCard
                        title={tDashboard('orders')}
                        description={tDashboard('ordersDesc')}
                        icon="fa-basket-shopping"
                        color="from-teal-500 to-cyan-600"
                        bg="bg-teal-500"
                        onClick={() => router.push(`/${locale}/admin/orders`)}
                    />

                    {/* Inventory Card */}
                    <DashboardCard
                        title={tDashboard('inventory')}
                        description={tDashboard('inventoryDesc')}
                        icon="fa-boxes-stacked"
                        color="from-emerald-500 to-teal-600"
                        bg="bg-emerald-500"
                        onClick={() => router.push(`/${locale}/inventory`)}
                    />

                    {/* Waiter Card */}
                    <DashboardCard
                        title={tDashboard('waiter')}
                        description={tDashboard('waiterDesc')}
                        icon="fa-user-nurse" // Alternative for waiter
                        color="from-rose-500 to-pink-600"
                        bg="bg-rose-500"
                        onClick={() => router.push(`/${locale}/waiter`)}
                    />

                    {/* Kitchen Card */}
                    <DashboardCard
                        title={tDashboard('kitchen')}
                        description={tDashboard('kitchenDesc')}
                        icon="fa-utensils"
                        color="from-orange-500 to-red-600"
                        bg="bg-orange-500"
                        onClick={() => router.push(`/${locale}/kitchen`)}
                    />

                    {/* Reports Card */}
                    <DashboardCard
                        title={tDashboard('reports')}
                        description={tDashboard('reportsDesc')}
                        icon="fa-chart-mixed"
                        color="from-cyan-500 to-sky-600"
                        bg="bg-cyan-500"
                        onClick={() => router.push(`/${locale}/reports`)}
                    />


                    {/* Settings Card */}
                    <DashboardCard
                        title={tCommon('settings')}
                        description={tAdmin('subtitle')}
                        icon="fa-gears"
                        color="from-slate-500 to-slate-700"
                        bg="bg-slate-500"
                        onClick={() => router.push(`/${locale}/admin`)}
                    />

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
            className="group relative h-48 bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-[40px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-black/40 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden p-8"
        >
            {/* Background Glow */}
            <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-gradient-to-tr ${color} opacity-10 group-hover:opacity-20 blur-3xl transition-all duration-700`}></div>

            {/* Decorative Right Icon - Silhouette */}
            <div className="absolute -right-2 bottom-4 text-slate-800 dark:text-white opacity-[0.05] dark:opacity-[0.07] transform rotate-[35deg] group-hover:rotate-[45deg] group-hover:scale-110 group-hover:opacity-[0.08] dark:group-hover:opacity-[0.1] transition-all duration-700 pointer-events-none z-0">
                <i className={`fat ${icon} text-[80px] leading-none`}></i>
            </div>

            <div className="flex relative z-10 w-full h-full">
                <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${color} flex items-center justify-center text-white shadow-lg overflow-hidden transform group-hover:scale-110 transition-transform duration-500 ring-4 ring-white/10 dark:ring-slate-700/50`}>
                        <i className={`fat ${icon} text-2xl`}></i>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight relative z-10 drop-shadow-sm">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-1 relative z-10 drop-shadow-sm">{description}</p>
                    </div>
                </div>
            </div>

            {/* Hover Decoration Line */}
            <div className={`absolute bottom-0 left-8 right-8 h-1.5 rounded-t-full bg-gradient-to-r ${color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center`}></div>
        </div>
    );
}

