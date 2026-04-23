'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { showSwal, toastSwal } from '../utils/swal';
import { useLocale, useTranslations } from 'next-intl';
import Cookies from 'js-cookie';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import { useParameters } from '../utils/useParameters';
import TransferModal from './TransferModal';
import SetMenuSelectionModal from './SetMenuSelectionModal';
import { Socket } from 'socket.io-client';
import { usePos } from './PosContext';
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

function SortableProductCard({ product, onClick, isDesignMode }: { product: Product, onClick: () => void, isDesignMode: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: product.id,
        disabled: !isDesignMode,
        transition: {
            duration: 250,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...(isDesignMode ? { ...attributes, ...listeners } : {})}
            onClick={() => { if (!isDesignMode) onClick(); }}
            className={`relative h-32 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border overflow-hidden group ${!isDesignMode ? 'transition-all duration-300 border-slate-100 dark:border-slate-700 active:scale-95' : 'transition-colors duration-200 cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/50 border-indigo-500/30'} flex justify-center w-full`}
        >
            <div className={`absolute inset-0 bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 pointer-events-none`}>
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl.startsWith('http') || product.imageUrl.startsWith('data:') || product.imageUrl.startsWith('/') ? product.imageUrl : `/uploads/products/${product.imageUrl}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-3xl mb-1 opacity-50 transition-opacity">
                        {(product.linkedStockCard?.category || product.category) === 'Kahveler' ? '☕' : (product.linkedStockCard?.category || product.category) === 'Tatlılar' ? '🍰' : '🍹'}
                    </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-col items-center text-center justify-end z-10 pointer-events-none">
                <span className="font-bold text-white text-[10px] leading-tight mb-0 drop-shadow-md line-clamp-2">{product.name}</span>
                <span className="font-extrabold text-white bg-emerald-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] shadow-sm mt-0.5 border border-emerald-400/30">₺{product.price}</span>
            </div>

            {product.isSet && (
                <div className="absolute top-2 right-2 bg-indigo-500/80 backdrop-blur-md px-2 py-1 rounded-full border border-indigo-400/50 shadow-sm flex items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-black text-white px-0.5">MENÜ</span>
                </div>
            )}
        </button>
    );
}

function SortableGroupCard({ id, name, imageUrl, iconClass, onClick, isDesignMode, colorClass }: { id: string | number, name: string, imageUrl?: string, iconClass: string, onClick: () => void, isDesignMode: boolean, colorClass: { bg: string, text: string, hover: string } }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: id,
        disabled: !isDesignMode,
        transition: {
            duration: 250,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...(isDesignMode ? { ...attributes, ...listeners } : {})}
            onClick={() => { if (!isDesignMode) onClick(); }}
            className={`group relative flex flex-col items-center justify-start p-2 pb-1 bg-white/70 dark:bg-slate-800/70 rounded-xl border-2 border-transparent shadow-sm hover:shadow-xl ${colorClass.hover} hover:-translate-y-1 transition-all duration-300 w-full ${isDesignMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/50' : ''}`}
        >
            <div className={`w-full h-20 shrink-0 rounded-lg ${colorClass.bg} flex items-center justify-center mb-1 group-hover:scale-105 transition-transform overflow-hidden shadow-sm pointer-events-none`}>
                {imageUrl ? (
                    <img src={imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('/') ? imageUrl : `/uploads/${imageUrl}`} alt={name} className="w-full h-full object-cover" />
                ) : (
                    <i className={`fat ${iconClass} text-2xl ${colorClass.text}`}></i>
                )}
            </div>
            <span className="text-[10px] leading-tight mt-auto font-black text-slate-700 dark:text-slate-200 text-center uppercase tracking-wider truncate w-full px-1 pointer-events-none">{name}</span>
        </button>
    );
}
interface Modifier {
    id: number;
    name: string;
    groupName?: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
    printerId?: number;
    modifiers?: Modifier[];
    isSet?: boolean;
    productTypeId?: number;
    stockGroup?: string;
    stockGroupId?: number;
    sku?: string;
    posVisible?: boolean;
    linkedStockCard?: {
        stockGroup?: string;
        category?: string;
    };
    staffPrice?: number;
    setMenu?: {
        setType: string;
        groups: {
            id?: number;
            groupName: string;
            minSelect: number;
            maxSelect: number;
            items: {
                productId: number;
                priceDiff: number;
                isDefault: boolean;
            }[];
        }[];
    };
    variations?: any[];
}
interface ProductType { id: number; name: string; }
interface OrderItem { product: Product; quantity: number; note?: string; isWaiting?: boolean; subItems?: any[]; extraPrice?: number; uniqueId?: string; saleType?: 'STANDARD' | 'HALF' | 'DOUBLE'; saleTypeMultiplier?: number; variationId?: number; variationName?: string; transactionType?: 'SALE' | 'FREE' | 'COMPLIMENTARY' | 'PROMOTION' | 'STAFF' | 'TICKET'; transactionReason?: string; }
interface ExistingOrder {
    id: number;
    totalAmount: number;
    items: { id: number; product: { id: number; name: string; price: number; isSet?: boolean }; quantity: number; unitPrice: number; isPaid: boolean; isWaiting: boolean; isMarshed: boolean; parentItemId?: number; addedByName?: string; addedAt?: string; transactionType?: string; transactionReason?: string; }[];
}
interface Zone { id: number; name: string; }
interface Table { id: number; name: string; status: string; waiterName?: string; waiterId?: number; orderStartTime?: string; currentTotal?: number; isBillRequested?: boolean; zone: { id: number } }

export default function TakeOrderView({ onSwitchToPos }: { onSwitchToPos: () => void }) {
    const { user, loginPinOnly, logout, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const { theme, toggleTheme, setTheme } = useThemeTransition();
    const [mounted, setMounted] = useState(false);

    const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';

    const [isDesignMode, setIsDesignMode] = useState(false);
    const [activeDragItem, setActiveDragItem] = useState<Product | null>(null);
    const [activeDragGroup, setActiveDragGroup] = useState<any | null>(null);

    const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
    const { 
        products: contextProducts, 
        tables: contextTables, 
        zones, 
        departments: contextDepartments, 
        parentGroups: contextParentGroups, 
        productTypes, 
        dataLoading: posDataLoading, 
        refreshDynamicData 
    } = usePos();

    const [products, setProducts] = useState<Product[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [parentGroups, setParentGroups] = useState<any[]>([]);
    const [tables, setTables] = useState<Table[]>([]);

    useEffect(() => {
        if (contextProducts.length > 0) setProducts(contextProducts);
        if (contextDepartments.length > 0) setDepartments(contextDepartments);
        if (contextParentGroups.length > 0) setParentGroups(contextParentGroups);
        if (contextTables.length > 0) setTables(contextTables);
    }, [contextProducts, contextDepartments, contextParentGroups, contextTables]);

    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedZone, setSelectedZone] = useState<number | null>(null);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [activeSaleType, setActiveSaleType] = useState<'STANDARD' | 'HALF' | 'DOUBLE'>('STANDARD');
    const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dataLoading, setDataLoading] = useState(false); 

    const [selectedProductTypeId, setSelectedProductTypeId] = useState<number | 'all'>('all');
    const [selectedParentGroupId, setSelectedParentGroupId] = useState<number | 'all' | 'unassigned' | null>(null);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | 'all' | null>(null);

    // Initial zone select
    useEffect(() => {
        if (zones.length > 0 && selectedZone === null) {
            setSelectedZone(zones[0].id);
        }
    }, [zones, selectedZone]);

    // --- Ekstra Popup State ---
    const [extraPopupOpen, setExtraPopupOpen] = useState(false);
    const [extraPopupProducts, setExtraPopupProducts] = useState<Product[]>([]);
    const [extraPopupParentProduct, setExtraPopupParentProduct] = useState<Product | null>(null);
    const [pendingExtraCartItem, setPendingExtraCartItem] = useState<OrderItem | null>(null);

    // --- Variation Modal State ---
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
    const [selectedProductForVariation, setSelectedProductForVariation] = useState<Product | null>(null);
    const [pendingAddToCartArgs, setPendingAddToCartArgs] = useState<{ note?: string; skipExtraCheck?: boolean }>({});




    const [noteModalItem, setNoteModalItem] = useState<OrderItem | null>(null);
    const [tempNote, setTempNote] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ cash: 0, creditCard: 0 });
    const [selectedPosItems, setSelectedPosItems] = useState<number[]>([]);

    const [allFlatChecks, setAllFlatChecks] = useState<any[]>([]);
    const [activeSubCheckId, setActiveSubCheckId] = useState<number | 'ALL' | null>(null);
    const [isAddSubCheckOpen, setIsAddSubCheckOpen] = useState(false);
    const [newSubCheckLabel, setNewSubCheckLabel] = useState('');

    // --- Transfer Modal State ---
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferMode, setTransferMode] = useState<'ITEM_TO_TABLE' | 'ITEM_WITHIN_TABLE' | 'SUBCHECK_TO_TABLE' | 'TABLE_TRANSFER'>('TABLE_TRANSFER');
    const [transferSourceTableId, setTransferSourceTableId] = useState<number | undefined>(undefined);
    const [transferSourceTableName, setTransferSourceTableName] = useState<string | undefined>(undefined);
    const [transferSelectedItemIds, setTransferSelectedItemIds] = useState<number[]>([]);
    const [transferSourceSubCheckId, setTransferSourceSubCheckId] = useState<number | undefined>(undefined);

    const [selectedSetMenuProduct, setSelectedSetMenuProduct] = useState<Product | null>(null);
    const [isSetMenuModalOpen, setIsSetMenuModalOpen] = useState(false);

    const [isBillRequestedAlertOpen, setIsBillRequestedAlertOpen] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
    const { params } = useParameters();

    // --- İşlem Tipi States ---
    const [transactionItem, setTransactionItem] = useState<OrderItem | { id: number; type: 'EXISTING' } | null>(null);
    const [isTransactionMenuOpen, setIsTransactionMenuOpen] = useState(false);
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [tempTransactionType, setTempTransactionType] = useState<string>('SALE');
    const [transactionMenuPos, setTransactionMenuPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
    }, [user, loading]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const activeIdStr = String(active.id);
        if (activeIdStr.startsWith('pg-')) {
            const card = parentGroups.find(c => `pg-${c.id}` === activeIdStr);
            if (card) setActiveDragGroup({ ...card, dragType: 'pg' });
        } else if (activeIdStr.startsWith('dept-')) {
            const card = departments.find(c => `dept-${c.id}` === activeIdStr);
            if (card) setActiveDragGroup({ ...card, dragType: 'dept' });
        } else {
            const card = products.find(c => c.id === active.id);
            if (card) setActiveDragItem(card);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setActiveDragGroup(null);
        if (over && active.id !== over.id) {
            const activeIdStr = String(active.id);
            const overIdStr = String(over.id);
            
            if (activeIdStr.startsWith('pg-') && overIdStr.startsWith('pg-')) {
                setParentGroups((items: any[]) => {
                    const oldIndex = items.findIndex(i => `pg-${i.id}` === activeIdStr);
                    const newIndex = items.findIndex(i => `pg-${i.id}` === overIdStr);
                    return arrayMove(items, oldIndex, newIndex);
                });
            } else if (activeIdStr.startsWith('dept-') && overIdStr.startsWith('dept-')) {
                setDepartments((items: any[]) => {
                    const oldIndex = items.findIndex(i => `dept-${i.id}` === activeIdStr);
                    const newIndex = items.findIndex(i => `dept-${i.id}` === overIdStr);
                    return arrayMove(items, oldIndex, newIndex);
                });
            } else if (!activeIdStr.startsWith('pg-') && !activeIdStr.startsWith('dept-') && !overIdStr.startsWith('pg-') && !overIdStr.startsWith('dept-')) {
                setProducts((items: Product[]) => {
                    const oldIndex = items.findIndex(i => i.id === active.id);
                    const newIndex = items.findIndex(i => i.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
        }
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const productTypeOptions = [{ id: 'all', name: 'Tümü' }, ...productTypes];

    const filteredParentGroups = useMemo(() => parentGroups.filter(pg => {
        if (selectedProductTypeId === 'all') return true;
        const pgDepts = departments.filter(d => d.parentGroupId === pg.id);
        return products.some(p => p.productTypeId === selectedProductTypeId && pgDepts.some(d => d.name === p.category));
    }), [parentGroups, selectedProductTypeId, departments, products]);

    const filteredRootDepartments = useMemo(() => departments.filter(d => !d.parentGroupId).filter(d => {
        if (selectedProductTypeId === 'all') return true;
        return products.some(p => p.productTypeId === selectedProductTypeId && p.category === d.name);
    }), [departments, selectedProductTypeId, products]);

    const filteredSubDepartments = useMemo(() => selectedParentGroupId ? departments.filter(d => d.parentGroupId === selectedParentGroupId).filter(d => {
        if (selectedProductTypeId === 'all') return true;
        return products.some(p => p.productTypeId === selectedProductTypeId && p.category === d.name);
    }) : [], [selectedParentGroupId, departments, selectedProductTypeId, products]);

    const sortableGroupIds = selectedParentGroupId 
        ? filteredSubDepartments.map(d => `dept-${d.id}`)
        : [
            ...filteredParentGroups.map(pg => `pg-${pg.id}`),
            ...filteredRootDepartments.map(d => `dept-${d.id}`)
        ];

    const filteredProducts = useMemo(() => products.filter(p => {
        if (p.posVisible === false) return false;

        const matchesType = selectedProductTypeId === 'all' || p.productTypeId === selectedProductTypeId;

        // Arama yapılıyorsa hiyerarşiyi baypas et
        if (searchQuery.trim() !== '') {
            return matchesType && p.name.toLowerCase().includes(searchQuery.toLowerCase());
        }

        // Kategori seçilmediyse: Sadece kategorisi olmayan ürünleri göster
        if (!selectedDepartmentId) {
            const hasNoCategory = !p.category || p.category.trim() === '' || p.category === 'Diğer';
            return matchesType && hasNoCategory;
        }

        if (selectedDepartmentId === 'all') return matchesType;

        const dept = departments.find(d => d.id === selectedDepartmentId);
        if (!dept) return false;

        const matchesCategory = p.category === dept.name || (!p.category && dept.name === 'Diğer');
        return matchesType && matchesCategory;
    }), [products, selectedProductTypeId, searchQuery, selectedDepartmentId, departments]);

    const handleTableClick = async (table: Table) => {
        const ownTablesOnly = (user?.extraPermissions || []).includes('OWN_TABLES_ONLY');

        if (!isSuperAdmin && ownTablesOnly && (table.status === 'DOLU' || table.status === 'REZERVE')) {
            if (table.waiterId && table.waiterId !== user.id) {
                showSwal({
                    icon: 'warning',
                    title: 'Erişim Engellendi',
                    text: `Bu masa ${table.waiterName || 'başka bir personel'} üzerine açılmıştır. Sadece kendi masalarınıza sipariş ekleyebilirsiniz.`
                });
                return;
            }
        }

        setSelectedTable(table);
        setActiveTab('menu');
        setCart([]);
        fetchTableData(table.id);
    };

    const fetchTableData = async (tableId: number) => {
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const res = await fetch(`${API_URL}/sales/table/${tableId}/sub-checks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const flat: any[] = [];
                data.forEach((main: any) => {
                    flat.push({ ...main, isSub: false });
                    if (main.subChecks && main.subChecks.length > 0) {
                        main.subChecks.forEach((sub: any) => {
                            flat.push({ ...sub, isSub: true });
                        });
                    }
                });
                setAllFlatChecks(flat);

                if (flat.length > 0) {
                    // Preserve active sub check if it still exists
                    setActiveSubCheckId(prev => {
                        if (prev && flat.some(f => f.id === prev)) return prev;
                        return flat[0].id;
                    });
                    setExistingOrders(flat);
                } else {
                    setAllFlatChecks([]);
                    setActiveSubCheckId(null);
                    setExistingOrders([]);
                }
            } else {
                setAllFlatChecks([]);
                setActiveSubCheckId(null);
                setExistingOrders([]);
            }
        } catch (err) {
            console.error("Failed to fetch sub-checks", err);
            setAllFlatChecks([]);
            setActiveSubCheckId(null);
            setExistingOrders([]);
        }
    };

    const reopenTable = async () => {
        if (!selectedTable) return;

        // --- Yetki Kontrolü ---
        const perms = user?.extraPermissions || [];
        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
        if (!isSuperAdmin && !perms.includes('OP:ORDER_AFTER_BILL')) {
            showSwal({
                icon: 'warning',
                title: 'Yetki Yetersiz',
                text: 'Hesap istendikten sonra masayı geri açma yetkiniz bulunmamaktadır.'
            });
            return;
        }

        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const res = await fetch(`${API_URL}/tables/${selectedTable.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isBillRequested: false })
            });

            if (res.ok) {
                // Proced with normal flow
                const updatedTable = { ...selectedTable, isBillRequested: false };
                setSelectedTable(updatedTable);
                setTables((prev: Table[]) => prev.map(t => t.id === updatedTable.id ? updatedTable : t));
                refreshDynamicData();
            }
        } catch (err) {
            console.error("Failed to reopen table", err);
        }
    };

    const addToCart = (product: Product, note?: string, skipExtraCheck?: boolean, forceVariationId?: number) => {
        // --- Yetki Kontrolü ---
        const perms = user?.extraPermissions || [];
        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
        if (!isSuperAdmin && !perms.includes('OP:CAN_ORDER')) {
            toastSwal({ icon: 'warning', title: 'Sipariş alma yetkiniz bulunmamaktadır.' });
            return;
        }

        if (!forceVariationId && product.variations && product.variations.filter(v => v.isActive !== false).length > 0) {
            setSelectedProductForVariation(product);
            setPendingAddToCartArgs({ note, skipExtraCheck });
            setIsVariationModalOpen(true);
            return;
        }

        if (product.isSet && product.setMenu?.setType !== 'FIX') {
            setSelectedSetMenuProduct(product);
            setIsSetMenuModalOpen(true);
            return;
        }

        const m = activeSaleType === 'HALF' ? (params.half_price_multiplier || 0.5) : activeSaleType === 'DOUBLE' ? (params.double_price_multiplier || 1.7) : 1.0;

        let extraPriceFromVariation = 0;
        let vName: string | undefined;
        let vId: number | undefined;
        if (forceVariationId && product.variations) {
            const varItem = product.variations.find(v => v.id === forceVariationId);
            if (varItem) {
                vId = varItem.id;
                vName = varItem.variationName;
                if (varItem.fixedPrice !== null && varItem.fixedPrice !== undefined) {
                    extraPriceFromVariation = varItem.fixedPrice - product.price;
                }
            }
        }

        const newItem: OrderItem = { product, quantity: 1, note, isWaiting: false, saleType: activeSaleType, saleTypeMultiplier: m, variationId: vId, variationName: vName, extraPrice: extraPriceFromVariation };

        // Ekstra popup kontrolü
        if (!skipExtraCheck) {
            const dept = departments.find(d => d.name === product.category);
            if (dept?.extraDepartmentId) {
                const extraProducts = products.filter(p => p.category === departments.find(d => d.id === dept.extraDepartmentId)?.name);
                if (extraProducts.length > 0) {
                    if (dept.autoOpenExtraPopup) {
                        // Önce ürünü sepete ekle, sonra popup aç
                        setCart(prev => {
                            const existing = prev.find(item => item.product.id === product.id && item.note === note && item.saleType === activeSaleType && !item.uniqueId);
                            if (existing) return prev.map(item => (item.product.id === product.id && item.note === note && item.saleType === activeSaleType && !item.uniqueId) ? { ...item, quantity: item.quantity + 1 } : item);
                            return [...prev, newItem];
                        });
                        setPendingExtraCartItem(newItem);
                        setExtraPopupProducts(extraProducts);
                        setExtraPopupParentProduct(product);
                        setExtraPopupOpen(true);
                        return;
                    } else {
                        // Manuel mod: kaydet pending için aşağıda işaret bırak
                        setPendingExtraCartItem(newItem);
                        setExtraPopupProducts(extraProducts);
                        setExtraPopupParentProduct(product);
                    }
                }
            } else {
                setPendingExtraCartItem(null);
                setExtraPopupParentProduct(null);
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id && item.note === note && item.saleType === activeSaleType && item.variationId === vId && !item.uniqueId);
            if (existing) {
                return prev.map(item => (item.product.id === product.id && item.note === note && item.saleType === activeSaleType && item.variationId === vId && !item.uniqueId) ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, newItem];
        });
    };

    const handleExtraSelect = (extraProduct: Product) => {
        if (!pendingExtraCartItem) return;
        const extraItem = { product: extraProduct, quantity: 1, unitPrice: extraProduct.price, isExtra: true };
        setCart(prev => prev.map(item =>
            item.product.id === pendingExtraCartItem.product.id && item.saleType === pendingExtraCartItem.saleType && !item.subItems?.some((s: any) => s.productId === extraProduct.id)
                ? { ...item, subItems: [...(item.subItems || []), { productId: extraProduct.id, product: extraProduct, quantity: 1, unitPrice: extraProduct.price, isExtra: true }] }
                : item
        ));
        toastSwal({ icon: 'success', title: `${extraProduct.name} eklendi` });
    };

    const handleExtraClose = () => {
        setExtraPopupOpen(false);
        setExtraPopupProducts([]);
        setExtraPopupParentProduct(null);
    };

    const handleSetMenuConfirm = (subItems: any[], extraPrice: number) => {
        if (!selectedSetMenuProduct) return;
        setCart(prev => [
            ...prev,
            {
                product: selectedSetMenuProduct,
                quantity: 1,
                subItems,
                extraPrice,
                uniqueId: Date.now().toString() + Math.random().toString(36).substring(7),
                isWaiting: false
            }
        ]);
        setIsSetMenuModalOpen(false);
        setSelectedSetMenuProduct(null);
    };

    const removeFromCart = (itemToRemove: OrderItem) => {
        setCart(prev => {
            if (itemToRemove.uniqueId) {
                const existing = prev.find(item => item.uniqueId === itemToRemove.uniqueId);
                if (existing && existing.quantity === 1) return prev.filter(i => i.uniqueId !== itemToRemove.uniqueId);
                return prev.map(item => item.uniqueId === itemToRemove.uniqueId ? { ...item, quantity: item.quantity - 1 } : item);
            }
            const existing = prev.find(item => item.product.id === itemToRemove.product.id && item.note === itemToRemove.note && item.saleType === itemToRemove.saleType && item.variationId === itemToRemove.variationId && !item.uniqueId);
            if (existing && existing.quantity === 1) return prev.filter(i => !(i.product.id === itemToRemove.product.id && i.note === itemToRemove.note && i.saleType === itemToRemove.saleType && i.variationId === itemToRemove.variationId && !i.uniqueId));
            return prev.map(item => (item.product.id === itemToRemove.product.id && item.note === itemToRemove.note && item.saleType === itemToRemove.saleType && item.variationId === itemToRemove.variationId && !item.uniqueId) ? { ...item, quantity: item.quantity - 1 } : item);
        });
    };

    const removeEntireItem = (itemToRemove: OrderItem) => {
        setCart(prev => {
            if (itemToRemove.uniqueId) return prev.filter(i => i.uniqueId !== itemToRemove.uniqueId);
            return prev.filter(i => !(i.product.id === itemToRemove.product.id && i.note === itemToRemove.note && i.saleType === itemToRemove.saleType && i.variationId === itemToRemove.variationId && !i.uniqueId));
        });
    };

    const handleCancelNote = () => {
        setNoteModalItem(null);
    };

    const handleSaveNote = () => {
        if (!noteModalItem) return;

        let updatedCart;
        if (noteModalItem.uniqueId) {
            updatedCart = cart.filter((i: OrderItem) => i.uniqueId !== noteModalItem.uniqueId);
        } else {
            updatedCart = cart.filter((i: OrderItem) => !(i.product.id === noteModalItem.product.id && i.note === noteModalItem.note && i.saleType === noteModalItem.saleType && i.variationId === noteModalItem.variationId && !i.uniqueId));
        }

        if (noteModalItem.uniqueId) {
            setCart([...updatedCart, { ...noteModalItem, note: tempNote.trim() || undefined }]);
        } else {
            const existingWithNewNote = updatedCart.find((i: OrderItem) => i.product.id === noteModalItem.product.id && i.note === tempNote.trim() && i.saleType === noteModalItem.saleType && i.variationId === noteModalItem.variationId && !i.uniqueId);
            if (existingWithNewNote) {
                existingWithNewNote.quantity += noteModalItem.quantity;
                setCart([...updatedCart]);
            } else {
                setCart([...updatedCart, { ...noteModalItem, note: tempNote.trim() || undefined }]);
            }
        }
        setNoteModalItem(null);
    };

    const handleTransactionTypeChange = (type: string) => {
        setTempTransactionType(type);
        if (type === 'COMPLIMENTARY' || type === 'FREE') {
            setIsReasonModalOpen(true);
        } else {
            confirmTransactionType(type);
        }
        setIsTransactionMenuOpen(false);
    };

    const confirmTransactionType = async (type: string, reason?: string) => {
        if (!transactionItem) return;

        if ('type' in transactionItem && transactionItem.type === 'EXISTING') {
            // Backend güncellemesi
            try {
                const token = localStorage.getItem('token') || (user as any)?.token;
                const res = await fetch(`${API_URL}/sales/items/${transactionItem.id}/transaction-type`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ type, reason })
                });
                if (res.ok) {
                    toastSwal({ icon: 'success', title: 'İşlem tipi güncellendi' });
                    if (selectedTable) fetchTableData(selectedTable.id); // Sadece veriyi yenile (sepeti bozma)
                } else {
                    const err = await res.json();
                    showSwal({ icon: 'error', title: 'Hata', text: err.message || 'İşlem tipi güncellenemedi' });
                }
            } catch (error) {
                console.error(error);
            }
        } else {
            // Sepetteki ürünü güncelle
            const item = transactionItem as OrderItem;
            setCart((prev: OrderItem[]) => prev.map((i: OrderItem) => {
                const isMatch = i.uniqueId ? i.uniqueId === item.uniqueId : (i.product.id === item.product.id && i.note === item.note && i.saleType === item.saleType && i.variationId === item.variationId);
                if (isMatch) {
                    return { ...i, transactionType: type as any, transactionReason: reason };
                }
                return i;
            }));
        }
        setTransactionItem(null);
        setIsReasonModalOpen(false);
    };

    const applyTransactionToAll = async (type: string, reason?: string) => {
        if (cart.length > 0) {
            setCart((prev: OrderItem[]) => prev.map((i: OrderItem) => ({ ...i, transactionType: type as any, transactionReason: reason })));
        }
        
        // Eğer seçili masa ve mevcut siparişler varsa, onları da güncelle (opsiyonel ama istenmiş olabilir)
        if (existingOrders.length > 0) {
            const allItemIds = existingOrders.flatMap((o: any) => o.items.filter((i: any) => !i.isPaid).map((i: any) => i.id));
            if (allItemIds.length > 0) {
                try {
                    const token = localStorage.getItem('token') || (user as any)?.token;
                    await Promise.all(allItemIds.map(id => 
                        fetch(`${API_URL}/sales/items/${id}/transaction-type`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ type, reason })
                        })
                    ));
                    if (selectedTable) fetchTableData(selectedTable.id);
                } catch (error) {
                    console.error("Toplu güncelleme hatası:", error);
                }
            }
        }
        
        setIsTransactionMenuOpen(false);
        setIsReasonModalOpen(false);
        toastSwal({ icon: 'success', title: 'Tüm ürünlere uygulandı' });
    };

    const getTransactionShortCode = (type?: string) => {
        switch (type) {
            case 'COMPLIMENTARY': return 'İ';
            case 'FREE': return 'Ö';
            case 'PROMOTION': return 'PR';
            case 'STAFF': return 'P';
            case 'TICKET': return 'B';
            default: return null;
        }
    };

    const calculateItemPrice = (item: OrderItem) => {
        if (['COMPLIMENTARY', 'FREE', 'TICKET'].includes(item.transactionType || '')) return 0;
        if (item.transactionType === 'STAFF') return item.product.staffPrice || item.product.price;
        return (item.product.price + (item.extraPrice || 0)) * (item.saleTypeMultiplier || 1);
    };

    const sendOrder = async () => {
        if (!selectedTable || cart.length === 0 || isSending) return;
        setIsSending(true);
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            let orderRes;

            if (activeSubCheckId === 'ALL') {
                toastSwal({ icon: 'warning', title: 'Lütfen ürünleri ekleyeceğiniz alt adisyonu/sekmeyi seçin!' });
                setIsSending(false);
                return;
            }

            if (activeSubCheckId) {
                const orderPayload = {
                    items: cart.map((item: OrderItem) => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                        unitPrice: calculateItemPrice(item),
                        note: item.note,
                        isWaiting: params.mars_enabled ? (item.isWaiting || false) : false,
                        subItems: item.subItems,
                        saleType: item.saleType,
                        saleTypeMultiplier: item.saleTypeMultiplier,
                        variationId: item.variationId,
                        variationName: item.variationName,
                        transactionType: item.transactionType || 'SALE',
                        transactionReason: item.transactionReason
                    }))
                };
                orderRes = await fetch(`${API_URL}/sales/${activeSubCheckId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(orderPayload)
                });
            } else {
                const orderPayload = {
                    tableId: selectedTable.id,
                    userId: user?.id || user?.sub,
                    totalAmount: cart.reduce((sum: number, item: OrderItem) => {
                        const base = calculateItemPrice(item) * item.quantity;
                        const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
                        return sum + base + extras;
                    }, 0),
                    status: 'NEW',
                    items: cart.map((item: OrderItem) => ({
                        productId: item.product.id,
                        quantity: item.quantity,
                        unitPrice: calculateItemPrice(item),
                        note: item.note,
                        isWaiting: params.mars_enabled ? (item.isWaiting || false) : false,
                        subItems: item.subItems,
                        saleType: item.saleType,
                        saleTypeMultiplier: item.saleTypeMultiplier,
                        variationId: item.variationId,
                        variationName: item.variationName,
                        transactionType: item.transactionType || 'SALE',
                        transactionReason: item.transactionReason
                    }))
                };
                orderRes = await fetch(`${API_URL}/sales`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(orderPayload)
                });
            }

            if (!orderRes.ok) {
                throw new Error("Failed to send order");
            }

            const orderData = await orderRes.json();

            // Tüm kalemleri mutfak yazıcısı yönlendirme sistemine gönder
            // Backend OutputProfile sistemi ile hangi ürünün nereye gideceğini belirler
            if (cart.length > 0) {
                const kitchenPrintData = {
                    orderType: 'MASA SİPARİŞİ',
                    receiptNumber: `SİP-${orderData?.id || '00'}`,
                    date: new Date(),
                    tableName: selectedTable?.name,
                    waiterName: (user as any)?.firstName || (user as any)?.name || (user as any)?.username || (user as any)?.email?.split('@')[0] || 'Garson',
                    items: cart.map(item => ({
                        name: item.product.name + (item.variationName ? ` (${item.variationName})` : ''),
                        quantity: item.quantity,
                        productId: item.product.id,
                        subItems: item.subItems,
                        isWaiting: params.mars_enabled ? (item.isWaiting || false) : false,
                        note: item.note
                    }))
                };
                console.log('[sendOrder] kitchenPrintData:', { tableName: kitchenPrintData.tableName, waiterName: kitchenPrintData.waiterName });

                // Non-blocking print request — backend route algoritması çalışır
                fetch(`${API_URL}/printers/print-kitchen`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(kitchenPrintData)
                }).then(r => r.json()).then(res => {
                    if (res.message && res.message.includes('0 adet')) {
                        console.warn('Mutfak yazıcısına hiçbir ürün yönlendirilemedi. Lütfen ürünlerin "Üretim Yönlendirme (Output Profile)" ayarlarını kontrol edin.');
                        // Optionally show a toast if you want it visible to the waiter
                        // toastSwal({ icon: 'info', title: 'Mutfak Yazıcısı Uyarısı', text: 'Bu ürünler için yönlendirme profili seçilmediği için fiş yazdırılmadı.' });
                    } else if (!res.success) {
                        console.error('Yazıcı hatası:', res.message);
                    }
                }).catch(printErr => console.warn('Mutfak yazıcısına istek gönderilemedi (arka plan):', printErr.message || printErr));
            }

            toastSwal({
                icon: 'success',
                title: `${selectedTable.name} Siparişi İşleme Alındı!`
            });
            setCart([]);
            setSelectedTable(null);
            setActiveTab('tables');
            refreshDynamicData(); // Only refresh table status - much faster
        } catch (error) {
            showSwal({
                icon: 'error',
                title: 'Hata',
                text: 'Sipariş iletilemedi.'
            });
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const cartTotal = cart.reduce((sum: number, item: OrderItem) => {
        const base = calculateItemPrice(item) * item.quantity;
        const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
        return sum + base + extras;
    }, 0);
    const allExistingItems = existingOrders.flatMap(o => o.items);
    const paidItems = allExistingItems.filter(i => i.isPaid);
    const unpaidItems = allExistingItems.filter(i => !i.isPaid);
    const paidTotal = paidItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const remainingTotal = unpaidItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0) + cartTotal;

    const payItem = async (itemId: number) => {
        const perms = user?.extraPermissions || [];
        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
        if (!isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_ACCOUNT')) {
            showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Ödeme alma yetkiniz bulunmamaktadır.' });
            return;
        }

        const token = localStorage.getItem('token') || (user as any)?.token;

        // Fetch partners first
        let partners: any[] = [];
        try {
            const pRes = await fetch(`${API_URL}/partners`, { headers: { Authorization: `Bearer ${token}` } });
            if (pRes.ok) partners = await pRes.json();
        } catch (e) { console.error("Partners fetch failed", e); }

        const customerOptions = partners
            .filter(p => p.type === 'CUSTOMER')
            .reduce((acc, p) => ({ ...acc, [p.id]: p.name }), { '0': '-- Cari Seçilmedi --' });

        // Ask payment method and partner
        const Swal = (await import('sweetalert2')).default;
        const { value: formValues } = await Swal.fire({
            title: '<span class="text-slate-800 dark:text-white font-black uppercase tracking-tight text-xl">ÖDEME DETAYLARI</span>',
            html: `
                <div class="text-left space-y-5 p-2">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Ödeme Yöntemi</label>
                        <div class="relative group">
                            <i class="fat fa-wallet absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:scale-110 transition-transform"></i>
                            <select id="swal-payment-method" class="w-full h-14 pl-12 pr-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-white font-bold appearance-none focus:border-emerald-500/50 focus:ring-4 ring-emerald-500/10 outline-none transition-all">
                                <option value="KASA">Nakit (Kasa)</option>
                                <option value="KREDI_KARTI">Kredi Kartı</option>
                                <option value="BANKA">Banka</option>
                                <option value="OPEN">Açık Hesap</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">İlgili Cari (Müşteri)</label>
                        <div class="relative group">
                            <i class="fat fa-user absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 group-focus-within:scale-110 transition-transform"></i>
                            <select id="swal-partner-id" class="w-full h-14 pl-12 pr-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-white font-bold appearance-none focus:border-indigo-500/50 focus:ring-4 ring-indigo-500/10 outline-none transition-all">
                                ${Object.entries(customerOptions).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            `,
            background: theme === 'dark' ? '#1e293b' : '#fff',
            color: theme === 'dark' ? '#fff' : '#1e293b',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fat fa-check-circle me-2"></i> Ödendi İşaretle',
            cancelButtonText: 'İptal',
            buttonsStyling: false,
            customClass: {
                confirmButton: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all outline-none mx-2',
                cancelButton: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-4 px-8 rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all outline-none mx-2'
            },
            preConfirm: () => {
                return {
                    paymentMethod: (document.getElementById('swal-payment-method') as HTMLSelectElement).value,
                    partnerId: (document.getElementById('swal-partner-id') as HTMLSelectElement).value
                };
            }
        });

        if (!formValues) return;
        const { paymentMethod, partnerId } = formValues;

        if (partnerId !== '0' && !isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_TO_CURRENT_ACCOUNT')) {
            showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Cariye hesap kapatma yetkiniz bulunmamaktadır.' });
            return;
        }

        if (paymentMethod === 'OPEN' && !isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_OPEN_ACCOUNT')) {
            showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Açık hesap kapatma yetkiniz bulunmamaktadır.' });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/sales/items/${itemId}/pay`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod,
                    partnerId: partnerId === '0' ? undefined : parseInt(partnerId)
                }),
            });
            if (!res.ok) throw new Error('Pay failed');
            await handleTableClick(selectedTable!);
        } catch (err) {
            showSwal({ icon: 'error', title: 'Hata', text: 'Ödeme işaretlenemedi.' });
        }
    };
    const marsItem = async (itemId: number) => {
        const token = localStorage.getItem('token') || (user as any)?.token;
        try {
            const res = await fetch(`${API_URL}/sales/items/${itemId}/mars`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Mars failed');
            toastSwal({ icon: 'success', title: 'MARŞ VERİLDİ', text: 'Üretim mutfağa bildirildi.' });
            await handleTableClick(selectedTable!);
        } catch (err) {
            showSwal({ icon: 'error', title: 'Hata', text: 'Marş verilemedi.' });
        }
    };
    const handleCheckout = async (paymentMethod: 'Nakit' | 'Kart' | 'Parçalı', cashAmount: number = 0, creditAmount: number = 0) => {
        const perms = user?.extraPermissions || [];
        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
        if (!isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_ACCOUNT')) {
            showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Ödeme alma yetkiniz bulunmamaktadır.' });
            return;
        }

        if (!selectedTable) return;
        const unpaidItems = existingOrders.flatMap(o => o.items).filter(i => !i.isPaid);
        const itemsToPay = unpaidItems.filter(item => selectedPosItems.includes(item.id));

        if (itemsToPay.length === 0) {
            toastSwal({ icon: 'warning', title: 'Ödenecek ürün seçmediniz!' });
            return;
        }

        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const finalPMethod = paymentMethod === 'Nakit' ? 'KASA' : paymentMethod === 'Kart' ? 'KREDI_KARTI' : 'SPLIT';

            const res = await fetch(`${API_URL}/sales/items/pay-batch`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemIds: itemsToPay.map(i => i.id),
                    paymentMethod: finalPMethod,
                    paidAmountCash: paymentMethod === 'Nakit' ? null : cashAmount,
                    paidAmountCreditCard: paymentMethod === 'Kart' ? null : creditAmount
                }),
            });

            if (res.ok) {
                toastSwal({ title: 'Başarılı', text: `Ödeme alındı (${paymentMethod})!`, icon: 'success' });
                setIsCheckoutOpen(false);
                setIsSplitPaymentOpen(false);
                setSelectedPosItems([]);
                setSplitAmounts({ cash: 0, creditCard: 0 });
                await handleTableClick(selectedTable!);
            } else {
                const errorData = await res.json();
                showSwal({ title: 'Hata Detayı', text: errorData.message || 'Ödeme alınamadı.', icon: 'error' });
            }
        } catch (e) {
            showSwal({ title: 'Hata', text: 'Sistem hatası oluştu.', icon: 'error' });
        }
    };



    if (loading || !user) return null;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-800 font-sans overflow-hidden transition-colors duration-300 relative">
            {/* Dekoratif Glassmorphism Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[120px] z-0 pointer-events-none transition-colors duration-500"></div>
            <div className="absolute bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-teal-500/10 dark:bg-teal-600/10 blur-[100px] z-0 pointer-events-none transition-colors duration-500"></div>

            <div className="flex-1 flex flex-col p-6 overflow-hidden w-full md:w-auto relative z-10 transition-all">
                {selectedTable?.isBillRequested ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-32 h-32 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-xl shadow-amber-500/20">
                            <i className="fat fa-receipt text-5xl text-amber-600 dark:text-amber-400"></i>
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-4 tracking-tight uppercase">Hesap İstendi</h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 font-bold max-w-md mb-12 leading-relaxed">
                            Bu masanın adisyonu istenmiş durumda. Yeni sipariş girişi yapmak için masayı tekrar açmanız gerekir.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                            <button
                                onClick={reopenTable}
                                className="flex-1 py-5 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg uppercase tracking-widest shadow-2xl shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <i className="fat fa-unlock text-2xl"></i> Masayı Geri Aç
                            </button>
                            <button
                                onClick={() => { setActiveTab('tables'); setSelectedTable(null); }}
                                className="flex-1 py-5 rounded-3xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-lg uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:shadow-lg"
                            >
                                Masalara Dön
                            </button>
                        </div>
                    </div>
                ) : (
                    <>

                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                    <i className="fat fa-utensils text-2xl"></i>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 leading-tight">
                                        Sipariş Ekranı{selectedTable ? ` — ${selectedTable.name}` : ''}
                                    </h1>

                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {activeTab === 'menu' && (
                                    <div className="relative min-w-[250px]">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <i className="fat fa-search text-slate-400"></i>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ürün Ara..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold shadow-sm text-sm"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
                                            >
                                                <i className="fat fa-circle-xmark"></i>
                                            </button>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'menu' && (
                                    <button
                                        onClick={() => { setActiveTab('tables'); setSelectedTable(null); }}
                                        className="text-slate-500 hover:text-emerald-600 flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm">
                                        <i className="fat fa-reply"></i> MASALAR
                                    </button>
                                )}




                                <button
                                    onClick={onSwitchToPos}
                                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 backdrop-blur-md px-5 py-2.5 rounded-full border border-indigo-500/20 shadow-sm active:scale-95">
                                    <i className="fat fa-cash-register text-indigo-500"></i> Kasa
                                </button>

                                <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition flex items-center gap-2">
                                    <i className="fat fa-home"></i> Ana Menü
                                </button>

                                {mounted && (
                                    <button
                                        onClick={toggleTheme}
                                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-xl"
                                        title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                                    >
                                        <i className={`fat ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-emerald-500`}></i>
                                    </button>
                                )}
                                {/* {mounted && (
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-white/10 dark:border-white/5 transition-all text-xl"
                                title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        )} */}
                            </div>
                        </div>

                        {activeTab === 'tables' ? (
                            <>
                                {/* Zone Seçimi */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                                    {Array.isArray(zones) && zones.map(z => (
                                        <button
                                            key={z.id}
                                            onClick={() => setSelectedZone(z.id)}
                                            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${selectedZone === z.id ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                                        >
                                            {z.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 max-h-[calc(100vh-150px)]">
                                    {(() => {
                                        const zoneTables = Array.isArray(tables) ? tables.filter(t => t.zone?.id === selectedZone) : [];
                                        let effectiveCols = 4;
                                        if (zoneTables.length > 15) effectiveCols = 10;
                                        else if (zoneTables.length >= 5) effectiveCols = 7;
                                        else effectiveCols = 4;

                                        return (
                                            <div
                                                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-none gap-4"
                                                style={{
                                                    gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth >= 1024
                                                        ? `repeat(${effectiveCols}, minmax(0, 1fr))`
                                                        : undefined
                                                }}
                                            >
                                                {zoneTables.map(table => (
                                                    <div
                                                        key={table.id}
                                                        onClick={() => handleTableClick(table)}
                                                        className={`relative p-3 rounded-2xl cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border flex flex-col items-center justify-center text-center gap-1 group ${selectedTable?.id === table.id ? 'ring-4 ring-emerald-500 scale-105 ' : ''}${table.isBillRequested
                                                            ? 'bg-yellow-100 dark:bg-yellow-500/20 border-yellow-400 dark:border-yellow-500/50 shadow-yellow-500/30 animate-[pulse_3s_ease-in-out_infinite]'
                                                            : table.status === 'BOŞ' ? 'bg-white/60 dark:bg-slate-800/60 border-white dark:border-slate-700' :
                                                                table.status === 'REZERVE' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' :
                                                                    'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'}`}
                                                    >
                                                        <div className="absolute top-4 right-4 animate-pulse">
                                                            <div className={`w-2 h-2 rounded-full ${table.status === 'BOŞ' ? 'bg-emerald-500' : table.status === 'REZERVE' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (table.status !== 'DOLU') {
                                                                    toastSwal({ icon: 'warning', title: 'Boş masa transfer edilemez!' });
                                                                    return;
                                                                }
                                                                setTransferSourceTableId(table.id);
                                                                setTransferSourceTableName(table.name);
                                                                setTransferMode('TABLE_TRANSFER');
                                                                setTransferSelectedItemIds([]);
                                                                setIsTransferModalOpen(true);
                                                            }}
                                                            className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30 transition-all opacity-70 hover:opacity-100"
                                                            title="Masa Transfer"
                                                        >
                                                            <i className="fat fa-arrow-right-arrow-left text-xs"></i>
                                                        </button>

                                                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                                            {table.status === 'BOŞ' ? '🪑' : table.status === 'REZERVE' ? '📅' : '🍽️'}
                                                        </span>
                                                        <span className="font-extrabold text-slate-800 dark:text-white uppercase tracking-tighter text-sm">{table.name}</span>

                                                        {table.status === 'DOLU' ? (
                                                            <div className="flex flex-col items-center gap-1 mt-1 border-t border-rose-200 dark:border-rose-500/20 pt-3 w-full">
                                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                                                    <span className="opacity-70">👤</span>
                                                                    <span>{table.waiterName || 'POS / Garson'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                    <span className="opacity-70">🕒</span>
                                                                    <span>{formatTime(table.orderStartTime)}</span>
                                                                </div>
                                                                <div className="mt-2 text-rose-700 dark:text-rose-300 font-extrabold text-sm drop-shadow-sm">
                                                                    ₺{Number(table.currentTotal || 0).toFixed(2)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1 mt-1 opacity-40">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('emptyTable') || 'BOŞ MASA'}</span>
                                                            </div>
                                                        )}

                                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full mt-2 uppercase tracking-tighter ${table.status === 'BOŞ' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                            table.status === 'REZERVE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                                'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                                            {table.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col">

                                <div className="flex flex-col gap-1.5 mb-3">
                                    {/* Satır 1: Ürün Cinsleri ve Aksiyon Butonları (Sola ve Sağa Hizalı) */}
                                    <div className="flex items-center justify-between gap-2 w-full">
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
                                            {productTypeOptions.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        setSelectedProductTypeId(t.id as any);
                                                        setSelectedParentGroupId(null);
                                                        setSelectedDepartmentId(null);
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${selectedProductTypeId === t.id
                                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                                                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400/50 hover:text-indigo-500 dark:hover:text-indigo-400 hover:shadow-sm'
                                                        }`}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Aksiyon Butonları (sağ) */}
                                        <div className="shrink-0 flex items-center gap-1 px-1.5 py-1 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 mb-1">
                                            {isDesignMode ? (
                                                <button
                                                    onClick={async () => {
                                                        const token = localStorage.getItem('token') || Cookies.get('token');
                                                        try {
                                                            const requests = [];
                                                            if (!selectedDepartmentId && !selectedParentGroupId) {
                                                                const pgOrder = parentGroups.map((pg, i) => ({ id: pg.id, orderIndex: i }));
                                                                const deptOrder = departments.map((d, i) => ({ id: d.id, orderIndex: i }));
                                                                requests.push(fetch(`${API_URL}/parent-groups/reorder`, {
                                                                    method: 'PUT',
                                                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                    body: JSON.stringify({ items: pgOrder })
                                                                }));
                                                                requests.push(fetch(`${API_URL}/departments/reorder`, {
                                                                    method: 'PUT',
                                                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                    body: JSON.stringify({ items: deptOrder })
                                                                }));
                                                            } else if (selectedParentGroupId && !selectedDepartmentId) {
                                                                const deptOrder = departments.filter(d => d.parentGroupId === selectedParentGroupId).map((d, i) => ({ id: d.id, orderIndex: i }));
                                                                requests.push(fetch(`${API_URL}/departments/reorder`, {
                                                                    method: 'PUT',
                                                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                    body: JSON.stringify({ items: deptOrder })
                                                                }));
                                                            }
                                                            const newOrder = filteredProducts.map((p, i) => ({ id: p.id, orderIndex: i }));
                                                            requests.push(fetch(`${API_URL}/products/reorder`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                body: JSON.stringify({ items: newOrder })
                                                            }));
                                                            
                                                            const results = await Promise.all(requests);
                                                            if (results.every(r => r.ok)) {
                                                                toastSwal({ icon: 'success', title: 'Tasarım Kaydedildi' });
                                                            } else {
                                                                throw new Error('Hata');
                                                            }
                                                        } catch (e) {
                                                            toastSwal({ icon: 'error', title: 'Hata', text: 'Sıra kaydedilemedi.' });
                                                        }
                                                        setIsDesignMode(false);
                                                        refreshDynamicData();
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 bg-indigo-500 text-white shadow-md shadow-indigo-500/30 animate-pulse"
                                                >
                                                    <i className="fat fa-save"></i> Kaydet
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setIsDesignMode(true)}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10"
                                                    title="Tasarım Modu"
                                                >
                                                    <i className="fat fa-pen-ruler"></i>
                                                </button>
                                            )}
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />
                                            <button
                                                onClick={() => setActiveSaleType('HALF')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${activeSaleType === 'HALF' ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-500/10'}`}
                                            >
                                                <i className="fat fa-glass-half"></i> Yarım
                                            </button>
                                            <button
                                                onClick={() => setActiveSaleType('STANDARD')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${activeSaleType === 'STANDARD' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                                            >
                                                <i className="fat fa-check"></i> Std
                                            </button>
                                            <button
                                                onClick={() => setActiveSaleType('DOUBLE')}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${activeSaleType === 'DOUBLE' ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/25' : 'text-slate-400 hover:text-violet-500 hover:bg-violet-500/10'}`}
                                            >
                                                <i className="fat fa-glass-water"></i> Duble
                                            </button>
                                        </div>
                                    </div>

                                    {/* Satır 2: Aksiyon Butonları + Dinamik Alt Filtreler — aynı satırda */}
                                    <div className="flex items-center gap-2">
                                        {/* Dinamik Alt Filtreler (sol) -> Breadcrumb'a Dönüştü */}
                                        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none min-h-[32px]">
                                            {(selectedParentGroupId || selectedDepartmentId) && !searchQuery ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            if (selectedDepartmentId) {
                                                                setSelectedDepartmentId(null);
                                                            } else {
                                                                setSelectedParentGroupId(null);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 shrink-0"
                                                    >
                                                        <i className="fat fa-arrow-left"></i> Geri
                                                    </button>
                                                    <div className="flex items-center gap-1.5 p-1 bg-white/40 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                                                        {selectedParentGroupId && (
                                                            <span
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-sm flex items-center gap-1.5 ${!selectedDepartmentId ? 'bg-indigo-500 text-white shadow-indigo-500/25' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                                                                onClick={() => setSelectedDepartmentId(null)}
                                                            >
                                                                <i className="fat fa-folder-tree"></i>
                                                                {parentGroups.find(pg => pg.id === selectedParentGroupId)?.name || 'Üst Grup'}
                                                            </span>
                                                        )}
                                                        {selectedDepartmentId && (
                                                            <>
                                                                <i className="fat fa-angle-right text-slate-400 text-[10px]"></i>
                                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 flex items-center gap-1.5">
                                                                    <i className="fat fa-tags"></i>
                                                                    {departments.find(d => d.id === selectedDepartmentId)?.name || 'Kategori'}
                                                                    <button onClick={() => setSelectedDepartmentId(null)} className="ml-1 opacity-70 hover:opacity-100"><i className="fat fa-xmark"></i></button>
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                                                    {searchQuery ? `"${searchQuery}" için sonuçlar` : ''}
                                                </span>
                                            )}
                                        </div>


                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 max-h-[calc(100vh-280px)]">
                                    {!selectedDepartmentId && !searchQuery ? (
                                        <>
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                                onDragCancel={() => { setActiveDragItem(null); setActiveDragGroup(null); }}
                                            >
                                                <SortableContext items={sortableGroupIds} strategy={rectSortingStrategy}>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 mb-6 mt-2 p-2 relative">
                                                        {/* SEVİYE 1: Üst Gruplar ve Bağımsız Kategoriler */}
                                                        {!selectedParentGroupId && (
                                                            <>
                                                                {filteredParentGroups.map(pg => (
                                                                    <SortableGroupCard
                                                                        key={`pg-${pg.id}`}
                                                                        id={`pg-${pg.id}`}
                                                                        name={pg.name}
                                                                        iconClass="fa-folder-tree"
                                                                        imageUrl={(pg as any).imageUrl}
                                                                        colorClass={{ bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-500", hover: "hover:border-indigo-400" }}
                                                                        onClick={() => setSelectedParentGroupId(pg.id)}
                                                                        isDesignMode={isDesignMode}
                                                                    />
                                                                ))}
                                                                {filteredRootDepartments.map(d => (
                                                                    <SortableGroupCard
                                                                        key={`dept-${d.id}`}
                                                                        id={`dept-${d.id}`}
                                                                        name={d.name}
                                                                        iconClass="fa-tags"
                                                                        imageUrl={(d as any).imageUrl}
                                                                        colorClass={{ bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-500", hover: "hover:border-emerald-400" }}
                                                                        onClick={() => setSelectedDepartmentId(d.id)}
                                                                        isDesignMode={isDesignMode}
                                                                    />
                                                                ))}
                                                            </>
                                                        )}

                                                        {/* SEVİYE 2: Seçili Üst Gruba Bağlı Kategoriler */}
                                                        {selectedParentGroupId && filteredSubDepartments.map(d => (
                                                            <SortableGroupCard
                                                                key={`dept-${d.id}`}
                                                                id={`dept-${d.id}`}
                                                                name={d.name}
                                                                iconClass="fa-tags"
                                                                imageUrl={(d as any).imageUrl}
                                                                colorClass={{ bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-500", hover: "hover:border-emerald-400" }}
                                                                onClick={() => setSelectedDepartmentId(d.id)}
                                                                isDesignMode={isDesignMode}
                                                            />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                                <DragOverlay dropAnimation={{
                                                    duration: 300,
                                                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                                                    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
                                                }}>
                                                    {activeDragGroup ? (
                                                        <SortableGroupCard
                                                            id={activeDragGroup.dragType === 'pg' ? `pg-${activeDragGroup.id}` : `dept-${activeDragGroup.id}`}
                                                            name={activeDragGroup.name}
                                                            imageUrl={activeDragGroup.imageUrl}
                                                            iconClass={activeDragGroup.dragType === 'pg' ? "fa-folder-tree" : "fa-tags"}
                                                            colorClass={activeDragGroup.dragType === 'pg' 
                                                                ? { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-500", hover: "hover:border-indigo-400" } 
                                                                : { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-500", hover: "hover:border-emerald-400" }}
                                                            onClick={() => {}}
                                                            isDesignMode={true}
                                                        />
                                                    ) : null}
                                                </DragOverlay>
                                            </DndContext>

                                            {/* Kategorisi olmayan ürünleri doğrudan göster */}
                                            {filteredProducts.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/50"></div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kategorisiz Ürünler</span>
                                                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700/50"></div>
                                                    </div>
                                                    <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragStart={handleDragStart}
                                                        onDragEnd={handleDragEnd}
                                                        onDragCancel={() => setActiveDragItem(null)}
                                                    >
                                                        <SortableContext items={filteredProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                                                            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 mb-6 relative p-2">
                                                                {filteredProducts.map(p => (
                                                                    <SortableProductCard
                                                                        key={p.id}
                                                                        product={p}
                                                                        onClick={() => addToCart(p)}
                                                                        isDesignMode={isDesignMode}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </SortableContext>
                                                        <DragOverlay dropAnimation={{
                                                            duration: 300,
                                                            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                                                            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
                                                        }}>
                                                            {activeDragItem ? (
                                                                <SortableProductCard
                                                                    product={activeDragItem}
                                                                    onClick={() => { }}
                                                                    isDesignMode={true}
                                                                />
                                                            ) : null}
                                                        </DragOverlay>
                                                    </DndContext>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            onDragCancel={() => setActiveDragItem(null)}
                                        >
                                            <SortableContext items={filteredProducts.map(p => p.id)} strategy={rectSortingStrategy}>
                                                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 mb-6 relative p-2">
                                                    {filteredProducts.map(p => (
                                                        <SortableProductCard
                                                            key={p.id}
                                                            product={p}
                                                            onClick={() => addToCart(p)}
                                                            isDesignMode={isDesignMode}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                            <DragOverlay dropAnimation={{
                                                duration: 300,
                                                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                                                sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
                                            }}>
                                                {activeDragItem ? (
                                                    <SortableProductCard
                                                        product={activeDragItem}
                                                        onClick={() => { }}
                                                        isDesignMode={true}
                                                    />
                                                ) : null}
                                            </DragOverlay>
                                        </DndContext>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Sağ Pane - Adisyon (Cart) */}
            {activeTab === 'menu' && (
                <div className="w-[450px] min-w-[450px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-l border-white/50 dark:border-slate-700/50 flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20 transition-colors">
                    <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                            Sipariş Özeti
                            {selectedTable && (
                                <span className="bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 py-1.5 px-4 rounded-full text-sm font-bold shadow-inner">{selectedTable.name}</span>
                            )}
                        </h2>

                        {selectedTable && allFlatChecks.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                                <button
                                    onClick={() => {
                                        setActiveSubCheckId('ALL');
                                        setExistingOrders(allFlatChecks);
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeSubCheckId === 'ALL'
                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                        : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                        }`}
                                >
                                    <i className="fat fa-layer-group mr-1.5"></i> Tümü
                                    <span className="ml-1 opacity-70">₺{allFlatChecks.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0).toFixed(0)}</span>
                                </button>
                                {allFlatChecks.map((check: any) => (
                                    <div key={check.id} className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setActiveSubCheckId(check.id);
                                                setExistingOrders([check]);
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeSubCheckId === check.id
                                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                                }`}
                                        >
                                            {check.subCheckLabel || `Adisyon ${check.subCheckIndex + 1}`}
                                            {check.totalAmount > 0 && (
                                                <span className="ml-1 opacity-70">₺{Number(check.totalAmount).toFixed(0)}</span>
                                            )}
                                        </button>
                                        {activeSubCheckId === check.id && (
                                            <button
                                                onClick={() => {
                                                    setTransferSourceSubCheckId(check.id);
                                                    setTransferSelectedItemIds([]);
                                                    setTransferMode('SUBCHECK_TO_TABLE');
                                                    setIsTransferModalOpen(true);
                                                }}
                                                className="w-7 h-7 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/40 transition-colors shrink-0 shadow-sm"
                                                title="Adisyonu Başka Masaya Taşı"
                                            >
                                                <i className="fat fa-arrow-right-arrow-left text-[10px]"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => { setIsAddSubCheckOpen(true); setNewSubCheckLabel(''); }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all text-sm font-bold flex-shrink-0"
                                    title="Alt Adisyon Ekle"
                                >
                                    +
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[calc(100vh-180px)]">
                        {(() => {
                            // Merge duplicate products when Tümü (ALL) is selected
                            const allItems = existingOrders.flatMap(order => order.items);
                            const displayItems = activeSubCheckId === 'ALL'
                                ? allItems.reduce((merged: any[], item) => {
                                    // If it's a child item, don't include it in the top-level merged list
                                    if (item.parentItemId) return merged;

                                    const existing = merged.find(m => m.product.id === item.product.id && m.isPaid === item.isPaid && !item.product.isSet && !item.parentItemId);
                                    if (existing) {
                                        existing.quantity += item.quantity;
                                    } else {
                                        const children = allItems.filter(sub => sub.parentItemId === item.id);
                                        merged.push({ ...item, subItems: children });
                                    }
                                    return merged;
                                }, [])
                                : allItems.filter(item => !item.parentItemId).map(item => ({
                                    ...item,
                                    subItems: allItems.filter(sub => sub.parentItemId === item.id)
                                }));

                            return displayItems.map((item: any, idx: number) => (
                                <div key={`ex-${item.id}-${idx}`} className="flex flex-col gap-1">
                                    <div className={`flex flex-col gap-2 p-3 rounded-2xl border shadow-sm transition-all ${item.isPaid ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-500/20 opacity-70' : 'bg-slate-100/50 dark:bg-slate-700/30 border-slate-200/50 dark:border-slate-700/50'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className="block font-medium text-slate-600 dark:text-slate-400">
                                                {item.product.name}
                                                {item.isPaid ? (
                                                    <span className="text-[10px] ml-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 inline-flex items-center gap-1">
                                                        <i className="fat fa-check text-[8px]"></i> Ödendi
                                                    </span>
                                                ) : (
                                                    <span className={`text-[10px] ml-1 px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${params.mars_enabled && item.isWaiting && !item.isMarshed
                                                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                                                        }`}>
                                                        {params.mars_enabled
                                                            ? (item.isWaiting
                                                                ? (item.isMarshed ? 'Hazırlanıyor' : 'Marş Bekliyor')
                                                                : 'Gönderildi')
                                                            : 'Ödenmedi'}
                                                    </span>
                                                )}
                                            </span>
                                            <span className={`font-bold ${item.isPaid ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                                                ₺{(item.quantity * item.unitPrice).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end mt-1">
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className="text-xs font-bold text-slate-400">
                                                    Birim: ₺{item.unitPrice} &nbsp;·&nbsp; {item.quantity} Adet 
                                                    {getTransactionShortCode(item.transactionType) && (
                                                        <span className="ml-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 px-1.5 rounded-md">-{getTransactionShortCode(item.transactionType)}</span>
                                                    )}
                                                </span>
                                                {item.addedByName && (
                                                    <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                                                        <i className="fat fa-user-clock text-[8px]"></i>
                                                        {item.addedByName}
                                                        {item.addedAt && (
                                                            <span className="opacity-75">· {formatTime(item.addedAt)}</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!item.isPaid && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setTransactionMenuPos({ x: rect.left, y: rect.bottom });
                                                                setTransactionItem({ id: item.id, type: 'EXISTING' });
                                                                setIsTransactionMenuOpen(true);
                                                            }}
                                                            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 px-3 py-1 rounded-full transition-all flex items-center gap-1"
                                                        >
                                                            <i className="fat fa-tag text-[10px]"></i> Tip
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setTransferSourceSubCheckId(item.saleId);
                                                                setTransferSelectedItemIds([item.id]);
                                                                setTransferMode('ITEM_TO_TABLE');
                                                                setIsTransferModalOpen(true);
                                                            }}
                                                            className="text-[10px] font-black uppercase text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 border border-yellow-200 dark:border-yellow-500/30 px-3 py-1 rounded-full transition-all flex items-center gap-1"
                                                        >
                                                            <i className="fat fa-arrow-right-arrow-left text-[10px]"></i> Transfer
                                                        </button>
                                                    </>
                                                )}
                                                {params.mars_enabled && item.isWaiting && !item.isMarshed && (
                                                    <button
                                                        onClick={() => marsItem(item.id)}
                                                        className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 px-3 py-1 rounded-full transition-all flex items-center gap-1 animate-pulse"
                                                    >
                                                        <i className="fat fa-fire-flame-curved text-[10px]"></i> MARŞ VER
                                                    </button>
                                                )}
                                                {params.mars_enabled && item.isWaiting && item.isMarshed && (
                                                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full flex items-center gap-1">
                                                        <i className="fat fa-check text-[10px]"></i> Marshed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Sub-items for existing orders */}
                                    {item.subItems && item.subItems.length > 0 && (
                                        <div className="ml-8 flex flex-col gap-1 mb-2">
                                            {item.subItems.map((sub: any, sIdx: number) => (
                                                <div key={sIdx} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                                    <i className="fat fa-caret-right text-slate-400"></i>
                                                    <span>{sub.product?.name || `Ürün #${sub.productId}`}</span>
                                                    {sub.unitPrice > 0 && <span className="text-indigo-400">(+₺{sub.unitPrice})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ));
                        })()}

                        {cart.length === 0 && existingOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                <p>Henüz ürün eklenmedi</p>
                            </div>
                        ) : (
                            cart.map((item, index) => (
                                <div key={`new-${index}`} className="flex flex-col gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <span className="block font-medium text-slate-800 dark:text-slate-200 flex flex-col">
                                            <span className="flex items-center">
                                                {item.product.name}
                                                {getTransactionShortCode(item.transactionType) && (
                                                    <span className="ml-1 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded-md font-black text-[9px] border border-indigo-200 dark:border-indigo-500/30">-{getTransactionShortCode(item.transactionType)}</span>
                                                )}
                                                {item.saleType && item.saleType !== 'STANDARD' && (
                                                    <span className={`text-[10px] ml-1 px-2 py-0.5 rounded-full inline-block font-bold border opacity-90 ${item.saleType === 'HALF' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                                                        {item.saleType === 'HALF' ? 'YARIM' : 'DUBLE'}
                                                    </span>
                                                )}
                                                {existingOrders.length > 0 && <span className="text-[10px] ml-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full animate-pulse border border-teal-200 inline-block">Yeni Eklendi</span>}
                                            </span>
                                            {item.variationName && <span className="text-[11px] text-indigo-500 font-bold tracking-widest mt-0.5">{item.variationName}</span>}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-100">₺{(calculateItemPrice(item) * item.quantity).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                            <span className="text-xs font-bold text-slate-400">Birim: ₺{calculateItemPrice(item).toFixed(2)}</span>
                                            {item.subItems && item.subItems.length > 0 && (
                                                <div className="mt-1 flex flex-col gap-0.5 max-h-[60px] overflow-y-auto custom-scrollbar">
                                                    {item.subItems.map((sub: any, sIdx: number) => {
                                                        const p = products.find(p => p.id === sub.productId);
                                                        return (
                                                            <span key={sIdx} className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                                <i className="fat fa-caret-right text-slate-400"></i>
                                                                {sub.quantity > 1 ? `${sub.quantity}x ` : ''}
                                                                {p ? p.name : 'Seçim'}
                                                                {sub.unitPrice > 0 ? ` (+₺${sub.unitPrice})` : ''}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {item.note && (
                                                <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-md truncate font-bold" title={item.note}>
                                                    * {item.note}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setNoteModalItem(item);
                                                    setTempNote(item.note || '');
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-md transition-colors" title="Not / Özellik Ekle"
                                            >
                                                <i className="fat fa-pen-to-square"></i>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setTransactionMenuPos({ x: rect.left, y: rect.bottom });
                                                    setTransactionItem(item);
                                                    setIsTransactionMenuOpen(true);
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-md transition-colors" title="İşlem Tipi"
                                            >
                                                <i className="fat fa-tag"></i>
                                            </button>
                                            <button onClick={() => removeEntireItem(item)} className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-md transition-colors" title="Ürünü İptal Et">
                                                <i className="fat fa-trash"></i>
                                            </button>
                                            {params.mars_enabled && (
                                                <button
                                                    onClick={() => {
                                                        setCart(prev => prev.map((it, idx) =>
                                                            idx === index ? { ...it, isWaiting: !it.isWaiting } : it
                                                        ));
                                                    }}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${item.isWaiting ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}
                                                    title={item.isWaiting ? 'Beklesin Olarak İşaretli' : 'Beklesin Olarak İşaretle'}
                                                >
                                                    <i className="fat fa-clock"></i>
                                                </button>
                                            )}
                                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1">
                                                <button onClick={() => removeFromCart(item)} className="w-7 h-7 flex items-center justify-center text-red-500 font-bold hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">-</button>
                                                <span className="font-bold text-sm min-w-[1rem] text-center dark:text-white">{item.quantity}</span>
                                                <button onClick={() => addToCart(item.product, item.note, true, item.variationId)} className="w-7 h-7 flex items-center justify-center text-emerald-500 font-bold hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors">+</button>
                                            </div>
                                            {/* Manuel Ekstra Butonu: autoOpenExtraPopup false olduğunda görünür */}
                                            {(() => {
                                                const dept = departments.find((d: any) => d.name === item.product.category);
                                                if (!dept?.extraDepartmentId || dept?.autoOpenExtraPopup) return null;
                                                const extraProds = products.filter((p: any) => p.category === departments.find((d: any) => d.id === dept.extraDepartmentId)?.name);
                                                if (extraProds.length === 0) return null;
                                                return (
                                                    <button
                                                        onClick={() => {
                                                            setPendingExtraCartItem(item);
                                                            setExtraPopupProducts(extraProds);
                                                            setExtraPopupParentProduct(item.product);
                                                            setExtraPopupOpen(true);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-md transition-colors border border-amber-200 dark:border-amber-500/30"
                                                        title="Ekstra Ürün Ekle"
                                                    >
                                                        <i className="fat fa-plus-circle text-sm"></i>
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-xl border-t border-white/50 dark:border-slate-700/50 m-4 rounded-3xl transition-colors shadow-inner">

                        <div className="flex justify-between mb-4">
                            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{existingOrders.length > 0 ? 'Yeni Eklenecek' : 'Toplam Tutar'}</span>
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">₺{cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => setCart([])}
                                disabled={cart.length === 0}
                                className="w-1/3 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={sendOrder}
                                disabled={cart.length === 0 || isSending}
                                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {isSending ? (
                                    <>
                                        <i className="fat fa-spinner fa-spin"></i> Gönderiliyor...
                                    </>
                                ) : (
                                    <>
                                        <i className="fat fa-paper-plane"></i> Siparişi Gönder
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Note & Modifier Modal */}
            {noteModalItem && (
                <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">Özellik Ekle</h3>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg inline-block mt-2">
                                    {noteModalItem.product.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setNoteModalItem(null)}
                                className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/20 transition-colors flex items-center justify-center border border-emerald-500/20"
                            >
                                <i className="fat fa-xmark text-xl"></i>
                            </button>
                        </div>

                        <div className="mb-6 space-y-4">
                            <div>
                                {(!noteModalItem.product.modifiers || noteModalItem.product.modifiers.length === 0) ? (
                                    <div className="text-xs text-slate-400 font-bold italic py-2">Bu ürün için tanımlı hızlı özellik bulunmamaktadır.</div>
                                ) : (
                                    <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(
                                            noteModalItem.product.modifiers.reduce((acc, mod) => {
                                                const group = mod.groupName || 'Diğer Özellikler';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(mod);
                                                return acc;
                                            }, {} as Record<string, Modifier[]>)
                                        ).map(([groupName, mods]) => (
                                            <div key={groupName} className="bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                                    <i className="fat fa-layer-group text-slate-300 dark:text-slate-600"></i> {groupName}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {mods.map(mod => (
                                                        <button
                                                            key={mod.id}
                                                            onClick={() => {
                                                                const currentNotes = tempNote.split(',').map(n => n.trim()).filter(n => n);
                                                                if (currentNotes.includes(mod.name)) {
                                                                    setTempNote(currentNotes.filter(n => n !== mod.name).join(', '));
                                                                } else {
                                                                    setTempNote([...currentNotes, mod.name].join(', '));
                                                                }
                                                            }}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${tempNote.split(',').map(n => n.trim()).includes(mod.name) ? 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-500/50' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-200 dark:hover:border-amber-500/30'}`}
                                                        >
                                                            {mod.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Özel Not</label>
                                <textarea
                                    value={tempNote}
                                    onChange={(e) => setTempNote(e.target.value)}
                                    placeholder="Ekstra isteklerinizi yazın..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-amber-500/50 outline-none transition-all resize-none h-24 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setTempNote('')}
                                className="w-1/3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                                Temizle
                            </button>
                            <button
                                onClick={handleSaveNote}
                                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-teal-500/40 transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i className="fat fa-check"></i> Kaydet ve Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Ekstra Ürün Popup Modal */}
            {extraPopupOpen && extraPopupParentProduct && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                        <i className="fat fa-plus-circle text-white text-lg"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{extraPopupParentProduct.name}</h3>
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Ekstra Ürün Seç</p>
                                    </div>
                                </div>
                                <button onClick={handleExtraClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 dark:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-600 transition-all text-sm font-bold">&times;</button>
                            </div>
                        </div>
                        {/* Mevcut Ekstralar */}
                        {pendingExtraCartItem?.subItems && pendingExtraCartItem.subItems.length > 0 && (
                            <div className="px-6 pt-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seçili Ekstralar</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(cart.find(c => c.product.id === pendingExtraCartItem?.product.id)?.subItems || []).filter((s: any) => s.isExtra).map((sub: any, i: number) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-full text-xs font-bold text-amber-700 dark:text-amber-400">
                                            <i className="fat fa-plus text-[10px]"></i>
                                            {sub.product?.name || `Ürün #${sub.productId}`}
                                            <span className="opacity-60 ml-0.5">₺{sub.unitPrice}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Ürün Grid */}
                        <div className="p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Eklenebilecek Ekstralar</p>
                            <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                {extraPopupProducts.map(ep => {
                                    const currentCartItem = cart.find(c => c.product.id === extraPopupParentProduct?.id);
                                    const alreadyAdded = currentCartItem?.subItems?.some((s: any) => s.productId === ep.id && s.isExtra);
                                    return (
                                        <button
                                            key={ep.id}
                                            onClick={() => handleExtraSelect(ep)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${alreadyAdded
                                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/50'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-500/5'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{ep.name}</span>
                                                {alreadyAdded && <i className="fat fa-check-circle text-amber-500 shrink-0"></i>}
                                            </div>
                                            <span className="inline-flex items-center mt-2 gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">
                                                <i className="fat fa-plus text-[9px]"></i>₺{ep.price}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={handleExtraClose}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:scale-[1.01] active:scale-95 transition-all"
                            >
                                Tamamla
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Alt Adisyon Ekle Modal */}
            {isAddSubCheckOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 p-6">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">➕</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Alt Adisyon Ekle</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Yeni müşteri grubu için ayrı adisyon açın.</p>
                        </div>
                        <input
                            type="text"
                            value={newSubCheckLabel}
                            onChange={(e) => setNewSubCheckLabel(e.target.value)}
                            placeholder="Örn: Aile 2, Misafir 3..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold dark:text-white mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsAddSubCheckOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={async () => {
                                    if (allFlatChecks.length === 0) return;
                                    try {
                                        const token = localStorage.getItem('token') || (user as any)?.token;
                                        const parentId = allFlatChecks.find(c => !c.isSub)?.id || allFlatChecks[0].id;
                                        const res = await fetch(`${API_URL}/sales/${parentId}/sub-check`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ label: newSubCheckLabel || undefined })
                                        });
                                        if (res.ok) {
                                            const newSub = await res.json();
                                            toastSwal({ icon: 'success', title: `${newSub.subCheckLabel} oluşturuldu!` });
                                            setIsAddSubCheckOpen(false);
                                            await handleTableClick(selectedTable!);
                                            setActiveSubCheckId(newSub.id);
                                        } else {
                                            toastSwal({ icon: 'error', title: 'Oluşturulamadı!' });
                                        }
                                    } catch (e) { toastSwal({ icon: 'error', title: 'Hata!' }); }
                                }}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all"
                            >
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isVariationModalOpen && selectedProductForVariation && (
                <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-lg">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <i className="fat fa-ruler text-white text-lg"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedProductForVariation.name}</h3>
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Boyut / Porsiyon Seç</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsVariationModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/60 dark:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-600 transition-all text-sm font-bold">&times;</button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {selectedProductForVariation.variations?.filter(v => v.isActive !== false).map((v: any) => (
                                    <button
                                        key={v.id}
                                        onClick={() => {
                                            setIsVariationModalOpen(false);
                                            addToCart(selectedProductForVariation, pendingAddToCartArgs.note, pendingAddToCartArgs.skipExtraCheck, v.id);
                                        }}
                                        className="p-4 flex flex-col justify-between rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 active:scale-95 transition-all"
                                    >
                                        <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight mb-2">{v.variationName}</span>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full mt-auto self-start">
                                            {v.fixedPrice !== null && v.fixedPrice !== undefined ? `₺${v.fixedPrice}` : `₺${selectedProductForVariation.price} (Baz)`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                    setTransferSourceSubCheckId(undefined);
                    setTransferSelectedItemIds([]);
                }}
                mode={transferMode}
                sourceSubCheckId={transferSourceSubCheckId || (typeof activeSubCheckId === 'number' ? activeSubCheckId : undefined)}
                sourceTableId={transferSourceTableId || selectedTable?.id}
                sourceTableName={transferSourceTableName || selectedTable?.name}
                selectedItemIds={transferSelectedItemIds}
                allFlatChecks={allFlatChecks}
                tables={tables}
                zones={zones}
                onTransferComplete={() => {
                    refreshDynamicData();
                    setSelectedTable(null);
                    setActiveTab('tables');
                }}
            />

            {/* --- İşlem Tipi Seçim Menüsü (Floating) --- */}
            {isTransactionMenuOpen && (
                <div 
                    className="fixed inset-0 z-[200]" 
                    onClick={() => setIsTransactionMenuOpen(false)}
                >
                    <div 
                        className="absolute bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 min-w-[200px] animate-in zoom-in-95 duration-200"
                        style={{ 
                            left: Math.min(transactionMenuPos.x, typeof window !== 'undefined' ? window.innerWidth - 220 : transactionMenuPos.x), 
                            top: Math.min(transactionMenuPos.y, typeof window !== 'undefined' ? window.innerHeight - 300 : transactionMenuPos.y) 
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-2 border-b border-slate-100 dark:border-slate-700 mb-1 flex justify-between items-center">
                            <span>İşlem Tipi</span>
                            <button onClick={() => setIsTransactionMenuOpen(false)} className="text-slate-400 hover:text-rose-500"><i className="fat fa-xmark"></i></button>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                            <button onClick={() => handleTransactionTypeChange('SALE')} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-bold text-slate-700 dark:text-slate-200">
                                <i className="fat fa-receipt text-slate-400 w-5"></i> Satış (Normal)
                            </button>
                            {(isSuperAdmin || (user?.extraPermissions || []).includes('OP:CAN_COMPLIMENTARY')) && (
                                <button onClick={() => handleTransactionTypeChange('COMPLIMENTARY')} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    <i className="fat fa-gift w-5"></i> İkram
                                </button>
                            )}
                            {(isSuperAdmin || (user?.extraPermissions || []).includes('OP:NON_PAYMENT')) && (
                                <button onClick={() => handleTransactionTypeChange('FREE')} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-sm font-bold text-rose-600 dark:text-rose-400">
                                    <i className="fat fa-hand-holding-heart w-5"></i> Ödenmez (Bedelsiz)
                                </button>
                            )}
                            {(isSuperAdmin || (user?.extraPermissions || []).includes('OP:CAN_PROMOTION')) && (
                                <button onClick={() => handleTransactionTypeChange('PROMOTION')} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    <i className="fat fa-percentage w-5"></i> Promosyon
                                </button>
                            )}
                            {(isSuperAdmin || (user?.extraPermissions || []).includes('OP:STAFF_SALE')) && (
                                <button onClick={() => handleTransactionTypeChange('STAFF')} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-sm font-bold text-amber-600 dark:text-amber-400">
                                    <i className="fat fa-user-tie w-5"></i> Personel
                                </button>
                            )}
                            {(isSuperAdmin || (user?.extraPermissions || []).includes('OP:CAN_TICKET')) && (
                                <button onClick={() => handleTransactionTypeChange('TICKET')} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors text-sm font-bold text-blue-600 dark:text-blue-400">
                                    <i className="fat fa-ticket w-5"></i> Bilet
                                </button>
                            )}
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                onClick={() => {
                                    if (tempTransactionType === 'COMPLIMENTARY' || tempTransactionType === 'FREE') {
                                        setIsReasonModalOpen(true);
                                    } else {
                                        applyTransactionToAll(tempTransactionType);
                                    }
                                }}
                                className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-all text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 shadow-lg"
                            >
                                <i className="fat fa-list-check"></i> Tümüne Uygula
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Zorunlu Sebep Seçim Modalı --- */}
            {isReasonModalOpen && (
                <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 p-8 animate-in fade-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ${tempTransactionType === 'COMPLIMENTARY' ? 'bg-indigo-100 text-indigo-600 shadow-indigo-500/20' : 'bg-rose-100 text-rose-600 shadow-rose-500/20'}`}>
                                <i className={`fat ${tempTransactionType === 'COMPLIMENTARY' ? 'fa-gift' : 'fa-hand-holding-heart'} text-3xl`}></i>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">İşlem Nedeni</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Lütfen bu işlem için geçerli bir sebep seçin veya yazın.</p>
                        </div>

                        <div className="space-y-3 mb-8">
                            {['Müşteri Memnuniyeti', 'Gecikme Telafisi', 'Yönetici İkramı', 'Mutfak Hatası', 'Tanıtım / PR', 'Yanlış Sipariş', 'Personel Hatası'].map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => confirmTransactionType(tempTransactionType, reason)}
                                    className="w-full p-4 text-left rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{reason}</span>
                                        <i className="fat fa-chevron-right text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all"></i>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsReasonModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedSetMenuProduct && (
                <SetMenuSelectionModal
                    isOpen={isSetMenuModalOpen}
                    product={selectedSetMenuProduct}
                    allProducts={products}
                    onClose={() => setIsSetMenuModalOpen(false)}
                    onConfirm={handleSetMenuConfirm}
                />
            )}
        </div>
    );
}
