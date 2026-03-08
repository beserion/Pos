'use client';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

export default function AdminPage() {
    const router = useRouter();
    const tCommon = useTranslations('Common');
    const tAdmin = useTranslations('Admin');
    const locale = useLocale();

    const sections = [
        { title: tAdmin('locations'), subtitle: tAdmin('locationsDesc'), path: `/${locale}/admin/locations`, icon: 'fa-location-dot', color: 'text-blue-500' },
        { title: tAdmin('zones'), subtitle: tAdmin('zonesDesc'), path: `/${locale}/admin/zones`, icon: 'fa-map-location-dot', color: 'text-indigo-500' },
        { title: tAdmin('tables'), subtitle: tAdmin('tablesDesc'), path: `/${locale}/admin/tables`, icon: 'fa-chair-office', color: 'text-purple-500' },
        { title: tAdmin('employees'), subtitle: tAdmin('employeesDesc'), path: `/${locale}/admin/employees`, icon: 'fa-users-gear', color: 'text-emerald-500' },
        { title: tAdmin('warehouses'), subtitle: tAdmin('warehousesDesc'), path: `/${locale}/admin/warehouses`, icon: 'fa-warehouse-full', color: 'text-amber-500' },
        { title: tAdmin('products'), subtitle: tAdmin('productsDesc'), path: `/${locale}/admin/products`, icon: 'fa-mug-hot', color: 'text-teal-500' },
        { title: tAdmin('ingredients'), subtitle: tAdmin('ingredientsDesc'), path: `/${locale}/admin/ingredients`, icon: 'fa-leaf', color: 'text-emerald-500' },
        // { title: tAdmin('recipes'), subtitle: tAdmin('recipesDesc'), path: `/${locale}/admin/recipes`, icon: 'fa-blender', color: 'text-orange-500' },
        { title: tAdmin('deliveries'), subtitle: tAdmin('deliveriesDesc'), path: `/${locale}/admin/deliveries`, icon: 'fa-truck-fast', color: 'text-indigo-500' },
        { title: tAdmin('couriers'), subtitle: tAdmin('couriersDesc'), path: `/${locale}/admin/couriers`, icon: 'fa-user-helmet-safety', color: 'text-orange-500' },
        { title: tAdmin('orders'), subtitle: tAdmin('ordersDesc'), path: `/${locale}/admin/orders`, icon: 'fa-bowl-food', color: 'text-rose-500' },
        { title: tAdmin('printers'), subtitle: tAdmin('printersDesc'), path: `/${locale}/admin/printers`, icon: 'fa-print', color: 'text-sky-500' },
        { title: tAdmin('users'), subtitle: tAdmin('usersDesc'), path: `/${locale}/admin/users`, icon: 'fa-user-shield', color: 'text-cyan-500' },
        { title: tAdmin('roles'), subtitle: tAdmin('rolesDesc'), path: `/${locale}/admin/roles`, icon: 'fa-user-tag', color: 'text-pink-500' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 relative overflow-y-auto">
            {/* Ambient Background Blobs - Clipped */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px] transition-colors duration-500"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 dark:bg-purple-600/10 blur-[120px] transition-colors duration-500"></div>
            </div>

            <div className="w-[90%] mx-auto px-6 py-12 relative z-10">
                {/* Header Section - Properly Centered Block */}
                <div className="flex flex-col items-center mb-16 px-4 relative">
                    <button
                        onClick={() => router.push(`/${locale}/dashboard`)}
                        className="md:absolute md:right-4 md:top-0 mb-8 md:mb-0 group flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-300 shadow-sm z-20"
                    >
                        <i className="fat fa-reply group-hover:-translate-x-1 transition-transform"></i>
                        {tCommon('back')}
                    </button>

                    <div className="flex items-center text-start gap-4 max-w-4xl mx-auto">
                        <i className="fat fa-gears text-indigo-600 dark:text-indigo-400 shrink-0" style={{ fontSize: '40px' }}></i>
                        <div>
                            <div className="relative inline-block pb-3">
                                <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 tracking-[0.2em] leading-none uppercase" id="title">{tAdmin('title')}</h3>
                                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-100"></div>
                            </div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">{tAdmin('subtitle')}</h5>
                        </div>
                    </div>
                </div>

                {/* Modern Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
                    {sections.map((sec, idx) => (
                        <div
                            key={idx}
                            onClick={() => router.push(sec.path)}
                            className="bg-white/70 dark:bg-slate-800/40 backdrop-blur-xl p-5 rounded-[32px] border border-white/50 dark:border-white/5 shadow-xl shadow-slate-300/50 hover:shadow-2xl hover:shadow-slate-400/50 dark:shadow-sm dark:shadow-black/10 dark:hover:shadow-md dark:hover:shadow-black/20 cursor-pointer hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden flex flex-col items-center text-center justify-center min-h-[140px]"
                        >
                            {/* Icon - No background, exactly 42px as requested */}
                            <div className={`mb-3 ${sec.color} transition-transform duration-500 group-hover:scale-110`}>
                                <i className={`fat ${sec.icon}`} style={{ fontSize: '42px' }}></i>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {sec.title}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {sec.subtitle}
                            </p>

                            {/* Subtle background glow on hover */}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

