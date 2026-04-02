'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/app/[locale]/AuthContext';

export function PageClient() {
    const router = useRouter();
    const tCommon = useTranslations('Common');
    const tAdmin = useTranslations('Admin');
    const tDashboard = useTranslations('Dashboard');
    const locale = useLocale();
    const { user, loading, hasPermission, hasFeature, alertsBell } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
    }, [user, loading, router, locale]);

    const sections = [
        // { key: 'FINANCE', title: tAdmin('companyAccounts'), subtitle: tAdmin('companyAccountsDesc'), path: `/${locale}/finance/accounts`, icon: 'fa-building-columns', color: 'text-blue-500' },
        { key: 'CARI', title: tAdmin('cari'), subtitle: tAdmin('cariDesc'), path: `/${locale}/cari`, icon: 'fa-users', color: 'text-indigo-500' },
        { key: 'EMPLOYEES', title: tAdmin('employees'), subtitle: tAdmin('employeesDesc'), path: `/${locale}/admin/employees`, icon: 'fa-users-gear', color: 'text-emerald-500' },
        { key: 'USERS', title: tAdmin('users'), subtitle: tAdmin('usersDesc'), path: `/${locale}/admin/users`, icon: 'fa-user-shield', color: 'text-cyan-500' },
        { key: 'ROLES', title: tAdmin('roles'), subtitle: tAdmin('rolesDesc'), path: `/${locale}/admin/roles`, icon: 'fa-user-tag', color: 'text-pink-500' },
        { key: 'SYSTEM', title: 'Yetki Kalemleri', subtitle: 'Modül ve aksiyon tanımlarını yönet', path: `/${locale}/admin/permissions`, icon: 'fa-shield-check', color: 'text-violet-500' },
        { key: 'LOCATIONS', title: tAdmin('locations'), subtitle: tAdmin('locationsDesc'), path: `/${locale}/admin/locations`, icon: 'fa-location-dot', color: 'text-blue-500' },
        { key: 'ZONES', title: tAdmin('zones'), subtitle: tAdmin('zonesDesc'), path: `/${locale}/admin/zones`, icon: 'fa-map-location-dot', color: 'text-indigo-500' },
        { key: 'TABLES', title: tAdmin('tables'), subtitle: tAdmin('tablesDesc'), path: `/${locale}/admin/tables`, icon: 'fa-chair-office', color: 'text-purple-500' },
        { key: 'WAREHOUSES', title: tAdmin('warehouses'), subtitle: tAdmin('warehousesDesc'), path: `/${locale}/admin/warehouses`, icon: 'fa-warehouse-full', color: 'text-amber-500', featureKey: 'inventory_system' },
        { key: 'SALES', title: 'POS Kasa Yönetimi', subtitle: 'Kasa terminallerini ve yazıcılarını yönet', path: `/${locale}/admin/cash-registers`, icon: 'fa-cash-register', color: 'text-emerald-500' },
        { key: 'PRODUCTS', title: tAdmin('products'), subtitle: tAdmin('productsDesc'), path: `/${locale}/admin/products`, icon: 'fa-mug-hot', color: 'text-teal-500' },
        { key: 'PRODUCTS', title: tAdmin('setMenus'), subtitle: tAdmin('setMenusDesc'), path: `/${locale}/admin/products/set-menus`, icon: 'fa-layer-group', color: 'text-indigo-500' },
        { key: 'MODIFIERS', title: tAdmin('modifiers'), subtitle: tAdmin('modifiersDesc'), path: `/${locale}/admin/modifiers`, icon: 'fa-tags', color: 'text-amber-500' },
        { key: 'INGREDIENTS', title: tAdmin('recipes'), subtitle: tAdmin('recipesDesc'), path: `/${locale}/admin/recipes`, icon: 'fa-blender', color: 'text-emerald-500', featureKey: 'recipe_system' },
        { key: 'PRINTERS', title: 'Ürün Cinsleri', subtitle: 'Ürün cinslerini tanımla ve çıktı profilleri ata', path: `/${locale}/admin/product-types`, icon: 'fa-shapes', color: 'text-fuchsia-500' },
        { key: 'PRINTERS', title: 'Çıktı Profilleri', subtitle: 'Yazıcı yönlendirme profillerini yönet', path: `/${locale}/admin/output-profiles`, icon: 'fa-route', color: 'text-cyan-500' },
        { key: 'PRINTERS', title: 'Yönlendirme Kontrolü', subtitle: 'Ürün bazlı yönlendirme kurallarını incele', path: `/${locale}/admin/routing-control`, icon: 'fa-clipboard-list-check', color: 'text-lime-500' },
        { key: 'PRINTERS', title: tAdmin('printers'), subtitle: tAdmin('printersDesc'), path: `/${locale}/admin/printers`, icon: 'fa-print', color: 'text-sky-500' },
        { key: 'SALES', title: tAdmin('salesManagement'), subtitle: tAdmin('salesManagementDesc'), path: `/${locale}/admin/sales`, icon: 'fa-basket-shopping', color: 'text-orange-500' },
        { key: 'ORDERS', title: tAdmin('purchaseOrders'), subtitle: tAdmin('purchaseOrdersDesc'), path: `/${locale}/admin/orders`, icon: 'fa-cart-shopping', color: 'text-amber-500', featureKey: 'finance_system' },
        { key: 'COURIERS', title: tAdmin('couriers'), subtitle: tAdmin('couriersDesc'), path: `/${locale}/admin/couriers`, icon: 'fa-user-helmet-safety', color: 'text-orange-500', featureKey: 'delivery_system' },
        { key: 'DELIVERY', title: tAdmin('deliveries'), subtitle: tAdmin('deliveriesDesc'), path: `/${locale}/admin/deliveries`, icon: 'fa-truck-fast', color: 'text-indigo-500', featureKey: 'delivery_system' },
        { key: 'WAITER', title: tAdmin('tablet'), subtitle: tAdmin('tabletDesc'), path: `/${locale}/waiter`, icon: 'fa-tablet-screen-button', color: 'text-rose-500', featureKey: 'waiter_app' },
        { key: 'SYSTEM', title: 'Parametreler', subtitle: 'Modül bazlı sistem ayarları', path: `/${locale}/admin/parameters`, icon: 'fa-sliders', color: 'text-violet-500' },
        { key: 'SYSTEM', title: 'Lisans Yönetimi', subtitle: 'Modül ve premium özellik yetkilerini yönet', path: `/${locale}/admin/license`, icon: 'fa-shield-keyhole', color: 'text-indigo-600' },
        { key: 'ALERTS', title: tDashboard('alerts'), subtitle: tDashboard('alertsDesc'), path: `/${locale}/admin/alerts`, icon: 'fa-bell-on', color: 'text-rose-500' },
    ];

    const filteredSections = sections.filter(sec => {
        const matchesPermission = hasPermission(`${sec.key}:VIEW`);
        const matchesFeature = sec.featureKey ? hasFeature(sec.featureKey) : true;
        
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            (sec.title?.toLowerCase().includes(query)) ||
            (sec.subtitle?.toLowerCase().includes(query));
        return matchesPermission && matchesFeature && matchesSearch;
    });

    if (loading) return null;


    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 relative">
            {/* Ambient Background Blobs - Clipped */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px] transition-colors duration-500"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 dark:bg-purple-600/10 blur-[120px] transition-colors duration-500"></div>
            </div>

            <div className="w-[90%] mx-auto px-6 py-8 relative z-10 h-full flex flex-col">
                {/* Header Section - Properly Centered Block */}
                <div className="flex flex-col items-center mb-8 px-4 relative shrink-0">

                    <div className="md:absolute md:right-4 md:top-0 flex items-center gap-3 mb-8 md:mb-0 z-20">
                        <div className="relative w-64">
                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Modüllerde ve Ayarlarda ara..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-sm"
                            />
                        </div>
                        {alertsBell}
                        <button
                            onClick={() => router.push(`/${locale}/dashboard`)}
                            className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-300 shadow-sm"
                        >
                            <i className="fat fa-reply group-hover:-translate-x-1 transition-transform"></i>
                            {tCommon('back')}
                        </button>

                    </div>

                    <div className="flex flex-col items-center text-center gap-2 max-w-4xl mx-auto">
                        <div className="relative inline-block pb-1">
                            <h3 className="mb-0 text-3xl font-extralight text-slate-600 dark:text-slate-400 tracking-[0.4em] leading-none uppercase" id="title">YÖNETİM PANELİ</h3>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-500 to-transparent rounded-full opacity-100"></div>
                        </div>
                        <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-1 leading-tight">İşletmenizin tüm kontrolü burada.</h5>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pb-8 p-[20px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[20px]">
                        {filteredSections.map((sec, idx) => (
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
                    {filteredSections.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mb-6">
                                <i className="fat fa-search-minus text-4xl text-slate-400"></i>
                            </div>
                            <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter transition-colors">Arama Sonucu Bulunamadı</h4>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm max-w-sm">
                                "<span className="text-indigo-600 dark:text-indigo-400">{searchQuery}</span>" ile eşleşen bir modül veya yetki bulunamadı. Lütfen farklı bir anahtar kelime deneyin.
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                ARAMAYI TEMİZLE
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

