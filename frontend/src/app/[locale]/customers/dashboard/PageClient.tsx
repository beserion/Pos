'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../AuthContext';
import { useRouter } from 'next/navigation';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useParameters } from '../../utils/useParameters';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function PageClient() {
    const tCommon = useTranslations('Common');
    const tDashboard = useTranslations('Dashboard');
    const tAdmin = useTranslations('Admin');
    const locale = useLocale();
    const { user, loading, logout, hasPermission, hasFeature, alertsBell } = useAuth();
    const { params } = useParameters();
    const router = useRouter();
    const { theme, toggleTheme } = useThemeTransition();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

    const [isDesignMode, setIsDesignMode] = useState(false);
    const [cardOrder, setCardOrder] = useState<string[]>([]);
    const [activeCards, setActiveCards] = useState<any[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

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

    const ALL_CARDS = useMemo(() => [
        {
            id: 'reservations',
            permission: 'RESERVATIONS:VIEW',
            title: tDashboard('reservations'),
            description: tDashboard('reservationsDesc'),
            icon: 'fa-calendar-check',
            color: 'from-fuchsia-600 to-pink-600',
            bg: 'bg-fuchsia-600',
            route: `/${locale}/reservations`
        },
        {
            id: 'pos',
            permission: 'SALES:VIEW',
            title: tDashboard('pos'),
            description: tDashboard('posDesc'),
            icon: 'fa-cash-register',
            color: 'from-indigo-500 to-blue-600',
            bg: 'bg-blue-500',
            route: `/${locale}/pos`
        },
        {
            id: 'quick-sale',
            permission: 'SALES:VIEW',
            title: tDashboard('quickSale'),
            description: tDashboard('quickSaleDesc'),
            icon: 'fa-bolt',
            color: 'from-orange-500 to-red-600',
            bg: 'bg-orange-500',
            route: `/${locale}/quick-sale`
        },
        {
            id: 'pos-pc',
            permission: 'SALES:VIEW',
            title: tDashboard('posScreen'),
            description: tDashboard('ordersStandPc'),
            icon: 'fa-desktop',
            color: 'from-rose-500 to-pink-600',
            bg: 'bg-rose-500',
            route: `/${locale}/pos?view=takeorder`
        },
        {
            id: 'delivery',
            permission: 'DELIVERY:VIEW',
            title: tDashboard('delivery'),
            description: tDashboard('deliveryDesc'),
            icon: 'fa-truck-fast',
            color: 'from-amber-500 to-orange-600',
            bg: 'bg-amber-500',
            route: `/${locale}/delivery`,
            featureKey: 'delivery_system'
        },
        {
            id: 'kitchen',
            permission: 'KITCHEN:VIEW',
            title: tDashboard('kitchen'),
            description: tDashboard('kitchenDesc'),
            icon: 'fa-utensils',
            color: 'from-orange-500 to-red-600',
            bg: 'bg-orange-500',
            route: `/${locale}/kitchen`,
            featureKey: 'kds_system'
        },
        {
            id: 'sales',
            permission: 'SALES:VIEW',
            title: tDashboard('sales'),
            description: tDashboard('salesDesc'),
            icon: 'fa-receipt',
            color: 'from-rose-500 to-pink-600',
            bg: 'bg-rose-500',
            route: `/${locale}/sales`
        },
        {
            id: 'orders',
            permission: 'ORDERS:VIEW',
            title: tDashboard('orders'),
            description: tDashboard('ordersDesc'),
            icon: 'fa-basket-shopping',
            color: 'from-orange-500 to-red-600',
            bg: 'bg-orange-500',
            route: `/${locale}/admin/orders`
        },
        {
            id: 'customers',
            permission: 'CARI:VIEW',
            title: tDashboard('customers'),
            description: tDashboard('customersDesc'),
            icon: 'fa-users',
            color: 'from-purple-500 to-violet-600',
            bg: 'bg-purple-500',
            route: `/${locale}/customers`
        },
        {
            id: 'finance-accounts',
            permission: 'FINANCE:VIEW',
            title: 'Hesaplar',
            description: tAdmin('companyAccountsDesc'),
            icon: 'fa-building-columns',
            color: 'from-blue-500 to-indigo-600',
            bg: 'bg-blue-500',
            route: `/${locale}/finance/accounts`,
            featureKey: 'finance_system'
        },
        {
            id: 'finance',
            permission: 'FINANCE:VIEW',
            title: tDashboard('finance'),
            description: tDashboard('financeDesc'),
            icon: 'fa-coins',
            color: 'from-yellow-500 to-amber-600',
            bg: 'bg-yellow-500',
            route: `/${locale}/finance`,
            featureKey: 'finance_system'
        },
        {
            id: 'invoices',
            permission: 'INVOICES:VIEW',
            title: tDashboard('invoices'),
            description: tDashboard('invoicesDesc'),
            icon: 'fa-file-invoice',
            color: 'from-sky-500 to-indigo-600',
            bg: 'bg-sky-500',
            route: `/${locale}/invoices`,
            featureKey: 'finance_system'
        },
        {
            id: 'inventory',
            permission: 'PRODUCTS:VIEW',
            title: tDashboard('inventory'),
            description: tDashboard('inventoryDesc'),
            icon: 'fa-boxes-stacked',
            color: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-500',
            route: `/${locale}/inventory`,
            featureKey: 'inventory_system'
        },
        {
            id: 'reports',
            permission: 'REPORTS:VIEW',
            title: tDashboard('reports'),
            description: tDashboard('reportsDesc'),
            icon: 'fa-chart-mixed',
            color: 'from-cyan-500 to-sky-600',
            bg: 'bg-cyan-500',
            route: `/${locale}/reports`
        },
        {
            id: 'e-services',
            permission: 'SALES:VIEW',
            title: 'E-Hizmetler',
            description: 'e-Fatura, e-Arşiv ve e-İrsaliye gibi işlemler.',
            icon: 'fa-cloud',
            color: 'from-teal-500 to-emerald-600',
            bg: 'bg-teal-500',
            route: `/${locale}/e-services`
        },
        {
            id: 'integrations',
            permission: 'SALES:VIEW',
            title: 'Entegrasyonlar',
            description: 'Ek uygulamalar ve özellikler',
            icon: 'fa-cubes',
            color: 'from-slate-500 to-slate-800',
            bg: 'bg-slate-500',
            route: `/${locale}/integrations`
        }
    ], [tDashboard, tAdmin, locale]);

    const allowedCards = useMemo(() => {
        return ALL_CARDS.filter(c => {
            const matchesPermission = hasPermission(c.permission);
            const matchesFeature = (c as any).featureKey ? hasFeature((c as any).featureKey) : true;
            return matchesPermission && matchesFeature;
        });
    }, [ALL_CARDS, hasPermission, hasFeature]);

    useEffect(() => {
        if (!user || loading) return;
        const savedOrder = localStorage.getItem('dashboard_card_order');
        if (savedOrder) {
            try {
                const parsedOrder = JSON.parse(savedOrder);
                setCardOrder(parsedOrder);
            } catch (e) {
                setCardOrder(allowedCards.map(c => c.id));
            }
        } else {
            setCardOrder(allowedCards.map(c => c.id));
        }
    }, [user, loading, allowedCards]);

    useEffect(() => {
        if (cardOrder.length > 0 && allowedCards.length > 0) {
            const sorted = [...allowedCards].sort((a, b) => {
                const indexA = cardOrder.indexOf(a.id);
                const indexB = cardOrder.indexOf(b.id);
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
            setActiveCards(sorted);
        } else {
            setActiveCards(allowedCards);
        }
    }, [cardOrder, allowedCards]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8, // Tıklama ve sürükleme karışımını pürüzsüz ayırmak için 8px pay eklendi.
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150, // Mobilde üzerine basılı tutma süresi 150ms.
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setActiveCards((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    function handleDragCancel() {
        setActiveId(null);
    }

    const saveDesign = () => {
        const newOrder = activeCards.map(c => c.id);
        setCardOrder(newOrder);
        localStorage.setItem('dashboard_card_order', JSON.stringify(newOrder));
        setIsDesignMode(false);
    };

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
        <div className="min-h-screen font-sans transition-colors duration-300 relative bg-slate-50 dark:bg-slate-900 overflow-y-auto w-full">
            {/* Background Accents */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/20 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 dark:bg-violet-600/20 blur-[120px] animate-pulse"></div>
            </div>

            {/* Top Navigation Bar */}
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
                                <span className="text-sm font-bold text-slate-900 dark:text-white -mt-0.5">{user?.firstName} {user?.lastName}</span>
                            </div>
                        </div>

                        {alertsBell}

                        {/* Design Mode Toggle/Save */}
                        {isDesignMode ? (
                            <button
                                onClick={saveDesign}
                                className="h-10 px-4 rounded-2xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-md transition-all gap-2 font-semibold"
                                title="Değişiklikleri Kaydet"
                            >
                                <i className="fat fa-save"></i>
                                Kaydet
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsDesignMode(true)}
                                className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md transition-all border border-white/20 dark:border-slate-700/50 shadow-sm"
                                title="Tasarım Modu"
                            >
                                <i className="fat fa-grid-2"></i>
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
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
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <SortableContext
                        items={activeCards.map(c => c.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${getGridCols(params.dashboard_column_count)} gap-6 transition-all duration-500`}>
                            {activeCards.map((card) => (
                                <DashboardCard
                                    key={card.id}
                                    id={card.id}
                                    title={card.title}
                                    description={card.description}
                                    icon={card.icon}
                                    color={card.color}
                                    bg={card.bg}
                                    onClick={() => router.push(card.route)}
                                    isDesignMode={isDesignMode}
                                />
                            ))}
                        </div>
                    </SortableContext>

                    <DragOverlay dropAnimation={{
                        duration: 300,
                        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // Yerine otururken hafif yaylanma efekti (spring)
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: { active: { opacity: '0.4' } }
                        })
                    }}>
                        {activeId ? (() => {
                            const card = activeCards.find(c => c.id === activeId);
                            if (!card) return null;
                            return (
                                <DashboardCardOverlay
                                    title={card.title}
                                    description={card.description}
                                    icon={card.icon}
                                    color={card.color}
                                    bg={card.bg}
                                />
                            );
                        })() : null}
                    </DragOverlay>
                </DndContext>
            </main>
        </div>
    );
}

interface CardProps {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    bg: string;
    onClick: () => void;
    isDesignMode: boolean;
}

function DashboardCard({ id, title, description, icon, color, bg, onClick, isDesignMode }: CardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: id,
        disabled: !isDesignMode,
        transition: {
            duration: 250, // Diğer nesnelerin yanal kaymasında hızlı ve pürüzsüz animasyon
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 0 : 1,
        position: 'relative' as const,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isDesignMode ? attributes : {})}
            {...(isDesignMode ? listeners : {})}
            onClick={() => {
                if (!isDesignMode) onClick();
            }}
            className={`group h-42 bg-white dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-[32px] shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] dark:shadow-black/40 ${!isDesignMode ? 'hover:-translate-y-1.5 transition-all duration-500' : 'transition-colors duration-200'} ${isDesignMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/50 border-indigo-500/30' : 'cursor-pointer'} overflow-hidden p-5`}
        >
            {/* Background Glow */}
            <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-gradient-to-tr ${color} opacity-10 group-hover:opacity-20 blur-3xl ${!isDesignMode ? 'transition-all duration-700' : ''}`}></div>

            {/* Decorative Right Icon - Silhouette */}
            <div className={`absolute -right-2 bottom-4 text-slate-800 dark:text-white opacity-[0.05] dark:opacity-[0.07] transform rotate-[35deg] group-hover:rotate-[45deg] group-hover:scale-110 group-hover:opacity-[0.08] dark:group-hover:opacity-[0.1] ${!isDesignMode ? 'transition-all duration-700' : ''} pointer-events-none z-0`}>
                <i className={`fat ${icon} text-[100px] leading-none`}></i>
            </div>

            <div className="flex relative z-10 w-full h-full pointer-events-none">
                <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${color} flex items-center justify-center text-white shadow-lg overflow-hidden transform group-hover:scale-110 ${!isDesignMode ? 'transition-transform duration-500' : ''} ring-4 ring-white/10 dark:ring-slate-700/50`}>
                        <i className={`fat ${icon} text-xl`}></i>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight relative z-10 drop-shadow-sm">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-1 relative z-10 drop-shadow-sm leading-relaxed">{description}</p>
                    </div>
                </div>
            </div>

            {/* Design mode indicators */}
            {isDesignMode && (
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500 backdrop-blur-md shadow-sm pointer-events-none">
                    <i className="fat fa-grip-dots-vertical text-lg"></i>
                </div>
            )}

            {/* Hover Decoration Line */}
            {!isDesignMode && (
                <div className={`absolute bottom-0 left-10 right-10 h-2 rounded-t-full bg-gradient-to-r ${color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center pointer-events-none`}></div>
            )}
        </div>
    );
}

function DashboardCardOverlay({ title, description, icon, color, bg }: Omit<CardProps, 'id' | 'onClick' | 'isDesignMode'>) {
    return (
        <div className={`group h-42 bg-white dark:bg-slate-800/80 backdrop-blur-2xl border-2 border-indigo-500 rounded-[32px] shadow-2xl scale-105 overflow-hidden p-5 rotate-2 cursor-grabbing`}>
            {/* Background Glow */}
            <div className={`absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-gradient-to-tr ${color} opacity-20 blur-3xl`}></div>

            {/* Decorative Right Icon - Silhouette */}
            <div className="absolute -right-2 bottom-4 text-slate-800 dark:text-white opacity-[0.1] transform rotate-[45deg] scale-110 pointer-events-none z-0">
                <i className={`fat ${icon} text-[100px] leading-none`}></i>
            </div>

            <div className="flex relative z-10 w-full h-full pointer-events-none">
                <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${color} flex items-center justify-center text-white shadow-lg overflow-hidden transform scale-110 ring-4 ring-white/10 dark:ring-slate-700/50`}>
                        <i className={`fat ${icon} text-xl`}></i>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight relative z-10 drop-shadow-sm">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-1 relative z-10 drop-shadow-sm leading-relaxed">{description}</p>
                    </div>
                </div>
            </div>

            {/* Design mode indicators */}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md pointer-events-none">
                <i className="fat fa-grip-dots-vertical text-lg"></i>
            </div>
        </div>
    );
}


