'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { showSwal, toastSwal } from '../utils/swal';
import { useLocale, useTranslations } from 'next-intl';
import { useThemeTransition } from '@/hooks/useThemeTransition';
import ShiftManager from '@/components/shifts/ShiftManager';
import TransferModal from './TransferModal';
import { usePos } from './PosContext';
import { API_URL } from '@/lib/apiConfig';

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
    isQuickSale?: boolean;
    isSet?: boolean;
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
}

interface Zone { id: number; name: string; }
interface Table { id: number; name: string; status: string; waiterName?: string; waiterId?: number; orderStartTime?: string; currentTotal?: number; isBillRequested?: boolean; zone: { id: number }; tempName?: string; }

export default function PosView({ onSwitchToQuickSale, onSwitchToTakeOrder }: { onSwitchToQuickSale: () => void, onSwitchToTakeOrder: () => void }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const { theme, toggleTheme, setTheme } = useThemeTransition();
    const searchParams = useSearchParams();
    const restoreSaleId = searchParams.get('restoreSaleId');
    const targetTableId = searchParams.get('tableId');
    const [mounted, setMounted] = useState(false);

    const { products, tables, zones: allZones, dataLoading: posDataLoading, refreshDynamicData } = usePos();
    const [zones, setZones] = useState<Zone[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [selectedZone, setSelectedZone] = useState<number | 'ALL'>('ALL');
    const [cart, setCart] = useState<{ product: Product; quantity: number; itemId?: number; subCheckId?: number; subItems?: any[]; saleType?: string; saleTypeMultiplier?: number; note?: string; }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
    const [splitAmounts, setSplitAmounts] = useState({ cash: 0, creditCard: 0 });
    const [dataLoading, setDataLoading] = useState(false);
    const [activeOrderIds, setActiveOrderIds] = useState<number[]>([]);
    const [selectedPosItems, setSelectedPosItems] = useState<number[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [serviceFee, setServiceFee] = useState<number>(0);

    // --- Alt Adisyon (Sub-Check) State ---
    const [tableSubChecks, setTableSubChecks] = useState<any[]>([]); // Tüm kök adisyonlar (subChecks dahil)
    const [allFlatChecks, setAllFlatChecks] = useState<any[]>([]); // Düzleştirilmiş tüm alt adisyonlar
    const [activeSubCheckId, setActiveSubCheckId] = useState<number | 'ALL' | null>(null);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [splitSelectedItems, setSplitSelectedItems] = useState<number[]>([]);
    const [splitQuantities, setSplitQuantities] = useState<Record<number, number>>({});
    const [isAddSubCheckOpen, setIsAddSubCheckOpen] = useState(false);
    const [newSubCheckLabel, setNewSubCheckLabel] = useState('');
    const [isPrintBillModalOpen, setIsPrintBillModalOpen] = useState(false);
    const [selectedPrintCheckIds, setSelectedPrintCheckIds] = useState<number[]>([]);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferMode, setTransferMode] = useState<'ITEM_TO_TABLE' | 'ITEM_WITHIN_TABLE' | 'SUBCHECK_TO_TABLE' | 'TABLE_TRANSFER'>('ITEM_TO_TABLE');
    const [transferSelectedItemIds, setTransferSelectedItemIds] = useState<number[]>([]);

    // --- Cancellation Modal State ---
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
    const [cancelView, setCancelView] = useState<'MAIN' | 'SUBCHECK' | 'ITEM'>('MAIN');
    const [cancelReason, setCancelReason] = useState('');

    // Shift & Cash Register state
    const [activeShift, setActiveShift] = useState<any>(null);
    const [activeCashRegister, setActiveCashRegister] = useState<any>(null);
    const [shiftReady, setShiftReady] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
    }, [user, loading, router]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Apply zone filtering whenever allZones, activeCashRegister or user permissions change
    const perms = (user as any)?.extraPermissions || [];
    const isSuperAdmin = (user as any)?.role?.name?.toUpperCase() === 'ADMIN' || (user as any)?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
    const canCancelSale = isSuperAdmin || perms.includes('OP:CAN_CANCEL_SALE');
    const canPrintBill = isSuperAdmin || perms.includes('OP:CAN_PRINT_BILL');
    const canReprintBill = isSuperAdmin || perms.includes('OP:REPRINT_BILL');
    const canDiscount = isSuperAdmin || perms.includes('OP:CAN_DISCOUNT');
    const canDiscountAfterBill = isSuperAdmin || perms.includes('OP:DISCOUNT_AFTER_BILL');

    useEffect(() => {
        if (!allZones || allZones.length === 0) return;

        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';

        if (isSuperAdmin) {
            setZones(allZones);
            if (selectedZone === null) setSelectedZone('ALL');
            return;
        }

        // Kasa (Terminal) bazlı salon kısıtlaması varsa uygula
        if (activeCashRegister && activeCashRegister.zoneIds && activeCashRegister.zoneIds.length > 0) {
            const terminalZoneIds = activeCashRegister.zoneIds.map((id: any) => Number(id));
            const filteredZones = allZones.filter((z: any) => terminalZoneIds.includes(z.id));
            setZones(filteredZones);

            if (filteredZones.length === 1) {
                setSelectedZone(filteredZones[0].id);
            } else if (selectedZone === null) {
                setSelectedZone('ALL');
            }
        } else {
            // Kasa kısıtlaması yoksa Context'ten gelen (zaten yetkilere göre filtrelenmiş) listeyi kullan
            setZones(allZones);
            if (selectedZone === null) setSelectedZone('ALL');
        }
    }, [activeCashRegister, allZones, user]);

    // Auto-load activeCashRegister if user has an assigned cashRegisterId but it's not set
    useEffect(() => {
        const loadAssignedCashRegister = async () => {
            if (user?.cashRegisterId && !activeCashRegister && mounted) {
                try {
                    const token = localStorage.getItem('token') || (user as any)?.token;
                    const res = await fetch(`${API_URL}/cash-registers/${user.cashRegisterId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const register = await res.json();
                        setActiveCashRegister(register);
                    }
                } catch (error) {
                    console.error('Error loading assigned cash register:', error);
                }
            }
        };
        loadAssignedCashRegister();
    }, [user, activeCashRegister, mounted, API_URL]);


    useEffect(() => {
        const fetchTableOrders = async () => {
            if (!selectedTable || (selectedTable.status === 'BOŞ' && !selectedTable.currentTotal)) {
                setCart([]);
                setActiveOrderIds([]);
                setTableSubChecks([]);
                setAllFlatChecks([]);
                setActiveSubCheckId(null);
                return;
            }
            try {
                const token = (user as any)?.token || localStorage.getItem('token');
                // Alt adisyon destekli endpoint
                const res = await fetch(`${API_URL}/sales/table/${selectedTable.id}/sub-checks`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const rootSales = await res.json();
                    setTableSubChecks(rootSales);

                    // Tüm adisyonları düzleştir (kökler + alt adisyonlar)
                    const flat: any[] = [];
                    const orderIds: number[] = [];
                    (rootSales || []).forEach((root: any) => {
                        flat.push(root);
                        orderIds.push(root.id);
                        if (root.subChecks && root.subChecks.length > 0) {
                            root.subChecks.forEach((sub: any) => {
                                flat.push(sub);
                                orderIds.push(sub.id);
                            });
                        }
                    });
                    setAllFlatChecks(flat);
                    setActiveOrderIds(orderIds);

                    // Aktif sekmeyi belirle
                    if (flat.length > 0 && !activeSubCheckId) {
                        setActiveSubCheckId(flat[0].id);
                    }

                    if (activeSubCheckId === 'ALL' || !activeSubCheckId) {
                        let newCart: any[] = [];
                        flat.forEach(check => {
                            if (check.items) {
                                check.items
                                    .filter((item: any) => item.status === 'ACTIVE')
                                    .forEach((item: any) => {
                                        const product = item.product || { id: item.productId, name: `Ürün #${item.productId}`, price: item.unitPrice };

                                        // If it's a child item, don't add it as a top-level product in the merged view
                                        // unless we are specifically looking for it (but usually we want to group by parent)
                                        if (item.parentItemId) return;

                                        // For Sets, we might not want to merge if they are unique instances
                                        // But for now, let's keep the merging logic but add subItems to the cart item
                                        const existing = newCart.find(c => c.product.id === product.id && !item.parentItemId);

                                        // Get children for this specific item
                                        const children = check.items.filter((sub: any) => sub.parentItemId === item.id);

                                        if (existing && !product.isSet) {
                                            existing.quantity += item.quantity;
                                        } else {
                                            newCart.push({
                                                product,
                                                quantity: item.quantity,
                                                itemId: item.id,
                                                subCheckId: check.id,
                                                subItems: children,
                                                saleType: item.saleType,
                                                saleTypeMultiplier: item.saleTypeMultiplier,
                                                unitPrice: item.unitPrice,
                                                variationId: item.variationId,
                                                variationName: item.variationName
                                            });
                                        }
                                    });
                            }
                        });
                        setCart(newCart);
                        setActiveOrderIds(orderIds);
                    } else {
                        // Aktif adisyonun ürünlerini cart'a yükle
                        const activeCheck = flat.find((s: any) => s.id === activeSubCheckId);
                        if (activeCheck && activeCheck.items) {
                            const newCart = activeCheck.items
                                .filter((item: any) => item.status === 'ACTIVE' && !item.parentItemId)
                                .map((item: any) => {
                                    const children = activeCheck.items.filter((sub: any) => sub.parentItemId === item.id);
                                    return {
                                        product: item.product || { id: item.productId, name: `Ürün #${item.productId}`, price: item.unitPrice },
                                        quantity: item.quantity,
                                        itemId: item.id,
                                        subCheckId: activeCheck.id,
                                        subItems: children,
                                        saleType: item.saleType,
                                        saleTypeMultiplier: item.saleTypeMultiplier,
                                        unitPrice: item.unitPrice,
                                        variationId: item.variationId,
                                        variationName: item.variationName
                                    };
                                });
                            setCart(newCart);
                            setActiveOrderIds([activeCheck.id]);
                        } else {
                            setCart([]);
                            setActiveOrderIds([]);
                        }
                    }
                } else {
                    // Fallback: eski yöntem
                    const fallbackRes = await fetch(`${API_URL}/sales?tableId=${selectedTable.id}&status=ACTIVE`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (fallbackRes.ok) {
                        const result = await fallbackRes.json();
                        const orders = result.data || [];
                        let newCart: { product: Product; quantity: number }[] = [];
                        const orderIds: number[] = [];

                        orders.forEach((order: any) => {
                            orderIds.push(order.id);
                            order.items.forEach((item: any) => {
                                const existing = newCart.find(c => c.product.id === item.product.id);
                                if (existing) {
                                    existing.quantity += item.quantity;
                                } else {
                                    newCart.push({ product: item.product, quantity: item.quantity });
                                }
                            });
                        });

                        setCart(newCart);
                        setActiveOrderIds(orderIds);
                        setAllFlatChecks(orders);
                        if (orders.length > 0) setActiveSubCheckId(orders[0].id);
                    } else {
                        setCart([]);
                        setActiveOrderIds([]);
                    }
                }
            } catch (error) {
                console.error('Error fetching table orders:', error);
                setCart([]);
                setActiveOrderIds([]);
            }
        };
        fetchTableOrders();
    }, [selectedTable, activeSubCheckId]);
    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };


    const handlePrintBill = async (directCheckIds?: number[]) => {
        const idsToPrint = directCheckIds || selectedPrintCheckIds;
        if (!idsToPrint || idsToPrint.length === 0) {
            toastSwal({ icon: 'warning', title: 'Lütfen yazdırılacak adisyon seçin' });
            return;
        }

        let checksToPrint = [];
        const isAllSelected = idsToPrint.length === allFlatChecks.length;
        if (isAllSelected && allFlatChecks.length > 0) {
            // Tüm adisyonlar seçiliyse birleştirip tek fiş yazdır
            const mergedItems = allFlatChecks.flatMap((check: any) => check.items || []);
            const mergedTotal = allFlatChecks.reduce((sum: number, check: any) => sum + Number(check.totalAmount || 0), 0);
            checksToPrint.push({
                receiptNumber: allFlatChecks[0]?.receiptNumber || 'TOPLU',
                subCheckLabel: 'Tüm Adisyonlar',
                items: mergedItems,
                totalAmount: mergedTotal,
                date: new Date().toISOString()
            });
        } else {
            // Ayrı ayrı fiş yazdır
            checksToPrint = allFlatChecks.filter((check: any) => idsToPrint.includes(check.id)).map((check: any) => ({
                receiptNumber: check.receiptNumber,
                subCheckLabel: check.subCheckLabel || `Adisyon`,
                items: check.items || [],
                totalAmount: check.totalAmount,
                date: new Date().toISOString()
            }));
        }

        try {
            const perms = user?.extraPermissions || [];
            const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';

            // 1. Yazdırma Yetkisi Kontrolü
            if (!isSuperAdmin && !perms.includes('OP:CAN_PRINT_BILL')) {
                toastSwal({ icon: 'warning', title: 'Adisyon yazdırma yetkiniz bulunmamaktadır.' });
                return;
            }

            // 2. Tekrar Yazdırma Kontrolü
            if (selectedTable?.isBillRequested && !isSuperAdmin && !perms.includes('OP:REPRINT_BILL')) {
                showSwal({
                    icon: 'warning',
                    title: 'Yetki Yetersiz',
                    text: 'Bu adisyon zaten daha önce yazdırılmıştır. Tekrar yazdırma yetkiniz bulunmamaktadır.'
                });
                return;
            }

            const token = (user as any)?.token || localStorage.getItem('token');
            for (const check of checksToPrint) {
                const checkItems = check.items.map((i: any) => ({
                    name: i.product?.name || 'Ürün',
                    quantity: i.quantity,
                    total: Number(i.quantity) * Number(i.unitPrice),
                    unitPrice: Number(i.unitPrice),
                    subItems: i.subItems || []
                }));

                const reqBody = {
                    items: checkItems,
                    totalAmount: check.totalAmount,
                    date: check.date,
                    receiptNumber: check.receiptNumber,
                    companyName: 'ANTIGRAVITY POS',
                    paymentMethod: 'HESAP',
                    subType: 'BILL',
                    cashRegisterId: activeCashRegister?.id || null,
                    tableName: selectedTable?.name || null,
                    isAlreadyPrinted: selectedTable?.isBillRequested || false // Backend'e bildir
                };

                const res = await fetch(`${API_URL}/printers/print-receipt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(reqBody)
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    toastSwal({ icon: 'error', title: errorData.message || 'Yazdırma Başarısız' });
                    return;
                }
            }

            // Masanın hesap istendi durumunu backend üzerinde güncelle
            if (selectedTable && selectedTable.id && !selectedTable.isBillRequested) {
                await fetch(`${API_URL}/tables/${selectedTable.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ isBillRequested: true })
                });
                // Local state'i de hemen güncelle ki anında sarı olsun (fetchData beklemeden).
                setSelectedTable(prev => prev ? { ...prev, isBillRequested: true } : prev);
                refreshDynamicData();
            }

            toastSwal({ icon: 'success', title: 'Yazdırma isteği gönderildi' });
            setIsPrintBillModalOpen(false);
        } catch (error) {
            console.error('Yazdırma Hatası:', error);
            toastSwal({ icon: 'error', title: 'Yazdırma bağlantı hatası!' });
        }
    };

    const handleCheckout = async (paymentMethod: 'Nakit' | 'Kart' | 'Parçalı' | 'Cari', cashAmount: number = 0, creditAmount: number = 0, partnerId?: number) => {
        if (!selectedTable) return;

        const itemsToPay = cart.filter(item => selectedPosItems.includes(item.itemId || item.product.id));
        if (itemsToPay.length === 0) {
            toastSwal({ icon: 'warning', title: 'Ödenecek ürün seçmediniz!' });
            return;
        }

        const selectedTotalAmount = itemsToPay.reduce((sum, item) => {
            const effectivePrice = (item as any).unitPrice ?? item.product.price;
            const base = (effectivePrice * (item.saleTypeMultiplier || 1)) * item.quantity;
            const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
            return sum + base + extras;
        }, 0);
        const vatAmount = 0;

        // Apply general adjustments to the current selected payment.
        const appliedDiscount = discount || 0;
        const appliedServiceFee = serviceFee || 0;

        const selectedGrandTotal = Number((selectedTotalAmount + vatAmount + appliedServiceFee - appliedDiscount).toFixed(2));

        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const finalPMethod =
                paymentMethod === 'Nakit' ? 'CASH' :
                    paymentMethod === 'Kart' ? 'CREDIT_CARD' :
                        paymentMethod === 'Cari' ? 'PARTNER' :
                            'SPLIT';

            const saleData = {
                userId: user?.id || user?.sub,
                tableId: selectedTable.id,
                tableName: selectedTable.name,
                partnerId: partnerId || (paymentMethod === 'Cari' ? partnerId : undefined),
                paymentMethod: finalPMethod,
                paidAmountCash: paymentMethod === 'Nakit' ? selectedGrandTotal : cashAmount,
                paidAmountCreditCard: paymentMethod === 'Kart' ? selectedGrandTotal : creditAmount,
                discountAmount: appliedDiscount,
                serviceFee: appliedServiceFee,
                status: 'COMPLETED',
                totalAmount: selectedGrandTotal,
                mergeSaleIds: Array.from(new Set(activeOrderIds)),
                cashRegisterId: activeCashRegister?.id || null,
                shiftId: activeShift?.id || null,
                items: itemsToPay.map(item => {
                    const effectivePrice = (item as any).unitPrice ?? item.product.price;
                    const base = (effectivePrice * (item.saleTypeMultiplier || 1)) * item.quantity;
                    const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
                    return {
                        productId: item.product.id,
                        quantity: item.quantity,
                        unitPrice: effectivePrice * (item.saleTypeMultiplier || 1),
                        total: Number(((base + extras) * 1.1).toFixed(2)),
                        subItems: (item.subItems || []).map((sub: any) => ({
                            productId: sub.productId,
                            quantity: sub.quantity,
                            unitPrice: sub.unitPrice,
                            total: sub.total,
                            menuGroupId: sub.menuGroupId
                        }))
                    };
                })
            };

            const saleRes = await fetch(`${API_URL}/sales`, { // PosView now creates a Sale directly
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(saleData)
            });

            if (saleRes.ok) {
                // Fişi Yazdır (Kasa Yazıcısından)
                const saleDataRes = await saleRes.clone().json();
                const printData = {
                    companyName: 'ANTIGRAVITY POS',
                    cashierName: user?.firstName || (user as any)?.name || 'Kasiyer',
                    date: new Date(),
                    tableName: selectedTable?.name || null,
                    items: itemsToPay.map(item => {
                        const effectivePrice = (item as any).unitPrice ?? item.product.price;
                        return {
                            name: item.product.name,
                            quantity: item.quantity,
                            price: effectivePrice * (item.saleTypeMultiplier || 1),
                            total: Number(((effectivePrice * (item.saleTypeMultiplier || 1) * item.quantity) * 1.1).toFixed(2)),
                            subItems: item.subItems,
                            note: item.note
                        };
                    }),
                    totalAmount: selectedGrandTotal,
                    paymentMethod: finalPMethod,
                    receiptNumber: saleDataRes?.id?.toString() || Math.floor(100000 + Math.random() * 900000).toString(),
                    cashRegisterId: activeCashRegister?.id || null
                };

                // Arka planda yazdırma isteğini gönder
                fetch(`${API_URL}/printers/print-receipt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(printData)
                }).then(r => r.json()).then(res => {
                    if (!res.success) console.warn('Yazıcı uyarı:', res.message);
                }).catch(e => console.error('Yazdırma hatası:', e));

                showSwal({
                    title: tc('success'),
                    text: `${t('paymentCollected')} (${paymentMethod}) ve fiş yazdırıldı!`,
                    icon: 'success',
                });

                setCart([]);
                setSelectedTable(null);
                setIsCheckoutOpen(false);
                setIsSplitPaymentOpen(false);
                setActiveOrderIds([]);
                setDiscount(0);
                setServiceFee(0);
                refreshDynamicData();
            } else {
                const errorData = await saleRes.json();
                showSwal({
                    title: 'Hata Detayı!',
                    text: errorData.errorDetails ? String(errorData.errorDetails) : (errorData.message || 'Ödeme alınamadı.'),
                    icon: 'error'
                });
            }
        } catch (e) {
            console.error(e);
            showSwal({ title: 'Hata!', text: 'Sistem hatası oluştu.', icon: 'error' });
        }
    };


    const handleTableSelection = (table: Table) => {
        setActiveSubCheckId(null);
        if (selectedTable?.id === table.id) {
            setSelectedTable(null);
            return;
        }

        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
        const ownTablesOnly = (user?.extraPermissions || []).includes('OWN_TABLES_ONLY');

        if (!isSuperAdmin && ownTablesOnly && (table.status === 'DOLU' || table.status === 'REZERVE')) {
            if (table.waiterId && table.waiterId !== user.id) {
                showSwal({
                    icon: 'warning',
                    title: 'Erişim Engellendi',
                    text: `Bu masa ${table.waiterName || 'başka bir personel'} üzerine açılmıştır. Sadece kendi masalarınıza bakabilirsiniz.`
                });
                return;
            }
        }
        setSelectedTable(table);
    };

    if (loading || !user) return null;



    const subTotal = cart.reduce((sum, item) => {
        const effectivePrice = (item as any).unitPrice ?? item.product.price;
        const base = (effectivePrice * (item.saleTypeMultiplier || 1)) * item.quantity;
        const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
        return sum + base + extras;
    }, 0);
    const vatAmount = 0;
    const totalBeforeAdjustments = subTotal + vatAmount;
    const grandTotal = Number((totalBeforeAdjustments + serviceFee - discount).toFixed(2));

    const handleCancelAdisyon = async () => {
        if (!canCancelSale) {
            toastSwal({ icon: 'warning', title: 'Adisyon iptal yetkiniz bulunmamaktadır.' });
            return;
        }

        if (!selectedTable) return;
        setCancelView('MAIN');
        setCancelReason('');
        setIsCancellationModalOpen(true);
    };

    const confirmCancelTable = async (reason: string) => {
        if (!selectedTable) return;
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const res = await fetch(`${API_URL}/sales/table/${selectedTable.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                toastSwal({ icon: 'success', title: 'Tüm masa iptal edildi.' });
                setIsCancellationModalOpen(false);
                setSelectedTable(null);
                setCart([]);
                refreshDynamicData();
            } else {
                toastSwal({ icon: 'error', title: 'İşlem başarısız.' });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const confirmCancelSubCheck = async (subCheckId: number, reason: string) => {
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const res = await fetch(`${API_URL}/sales/${subCheckId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                toastSwal({ icon: 'success', title: 'Adisyon iptal edildi.' });
                setIsCancellationModalOpen(false);
                // Refresh data
                if (selectedTable) {
                    const tableRes = await fetch(`${API_URL}/tables/${selectedTable.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (tableRes.ok) {
                        const tableData = await tableRes.json();
                        if (tableData.status === 'BOŞ') {
                            setSelectedTable(null);
                            setCart([]);
                        } else {
                            setSelectedTable({ ...selectedTable }); // Trigger refresh
                        }
                    }
                }
                refreshDynamicData();
            } else {
                toastSwal({ icon: 'error', title: 'İşlem başarısız.' });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const confirmCancelItem = async (itemId: number, reason: string) => {
        try {
            const token = localStorage.getItem('token') || (user as any)?.token;
            const res = await fetch(`${API_URL}/sales/items/${itemId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                toastSwal({ icon: 'success', title: 'Ürün iptal edildi.' });
                // We don't close the modal yet, maybe they want to cancel more? 
                // Or maybe we do. User said "iptal edebilsin".
                setSelectedTable({ ...selectedTable! }); // Refresh
                refreshDynamicData();
            } else {
                toastSwal({ icon: 'error', title: 'İşlem başarısız.' });
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-800 font-sans overflow-hidden transition-colors duration-300 relative">
            {/* Dekoratif Glassmorphism Arabulucu Arka Planlar */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[120px] z-0 pointer-events-none transition-all duration-700 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[30%] w-[30%] h-[30%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[100px] z-0 pointer-events-none transition-all duration-700"></div>
            <div className="absolute top-[20%] right-[-5%] w-[25%] h-[25%] rounded-full bg-purple-500/5 dark:bg-purple-600/10 blur-[80px] z-0 pointer-events-none transition-all duration-700 animate-bounce-slow"></div>

            {/* Corporate Pattern Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            {/* Vurgulu Arkaplan - Silinmiş ShiftManager overlay blok kodu */}

            {/* Sol Pane - Masa Seçimi */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto w-full md:w-auto relative z-10">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                            <i className="fat fa-cash-register text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-wider text-indigo-500">
                                {activeCashRegister ? activeCashRegister.name : 'KASA POS'}
                            </h3>
                            <h5 className="text-slate-500 text-xs font-medium uppercase tracking-widest leading-tight">
                                {activeShift ? (activeShift.user ? `${activeShift.user.firstName} ${activeShift.user.lastName || ''}`.trim() : user ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : 'Aktif Kasiyer') : (t('selectTableDesc') || 'İşlem yapmak istediğiniz masayı seçin')}
                            </h5>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">

                        {/* Shift Manager Overlay / Vardiya Kapat Butonu */}
                        <ShiftManager
                            user={user}
                            apiUrl={API_URL}
                            onShiftOpen={(shift, cashRegister) => {
                                setActiveShift(shift);
                                setActiveCashRegister(cashRegister);
                                setShiftReady(true);
                            }}
                            onShiftClose={() => {
                                setActiveShift(null);
                                setActiveCashRegister(null);
                                setShiftReady(false);
                            }}
                        />

                        <button onClick={() => router.push(`/${locale}/dashboard`)} className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition flex items-center gap-2">
                            <i className="fat fa-home"></i> Ana Menü
                        </button>

                        <button
                            onClick={onSwitchToTakeOrder}
                            className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 backdrop-blur-md px-5 py-2.5 rounded-full border border-teal-500/20 shadow-sm active:scale-95">
                            <i className="fat fa-desktop text-teal-500 group-hover:animate-pulse"></i> Sipariş Ekranı
                        </button>

                        <button
                            onClick={onSwitchToQuickSale}
                            className="group flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 backdrop-blur-md px-5 py-2.5 rounded-full border border-orange-500/20 shadow-sm active:scale-95">
                            <i className="fat fa-bolt text-orange-500 group-hover:animate-pulse"></i> Hızlı Satış
                        </button>



                        {mounted && (
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-xl"
                                title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                            >
                                <i className={`fat ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-indigo-500`}></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* Zone Seçimi */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
                        {zones.length > 1 && (
                            <button
                                onClick={() => setSelectedZone('ALL')}
                                className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${selectedZone === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                            >
                                Tümü
                            </button>
                        )}
                        {Array.isArray(zones) && zones.map(z => (
                            <button
                                key={z.id}
                                onClick={() => setSelectedZone(z.id)}
                                className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${selectedZone === z.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                            >
                                {z.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.isArray(tables) && tables
                        .filter(t => {
                            const zoneMatch = selectedZone === 'ALL'
                                ? zones.some(z => z.id === t.zone?.id || z.id === (t as any).zoneId)
                                : t.zone?.id === selectedZone || (t as any).zoneId === selectedZone;
                            const isOccupied = t.status === 'DOLU' || t.status === 'REZERVE' || (t.currentTotal && t.currentTotal > 0);
                            return zoneMatch && isOccupied;
                        })
                        .map(table => (
                            <div
                                key={table.id}
                                onClick={() => handleTableSelection(table)}
                                className={`relative p-6 rounded-[32px] cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border flex flex-col items-center justify-center text-center gap-2 group 
                                    ${selectedTable?.id === table.id
                                        ? 'ring-4 ring-indigo-500 scale-105 bg-indigo-50/90 dark:bg-indigo-500/30 border-indigo-400/50 dark:border-indigo-400/50'
                                        : table.isBillRequested
                                            ? 'bg-yellow-100 dark:bg-yellow-500/20 border-yellow-400 dark:border-yellow-500/50 shadow-yellow-500/30 animate-[pulse_3s_ease-in-out_infinite]'
                                            : table.status === 'BOŞ'
                                                ? 'bg-white/40 dark:bg-slate-800/40 border-white/50 dark:border-slate-700/50'
                                                : table.status === 'REZERVE'
                                                    ? 'bg-amber-100/60 dark:bg-amber-500/20 border-amber-300 dark:border-amber-400/40 shadow-amber-500/10'
                                                    : 'bg-rose-100/80 dark:bg-rose-600/20 border-rose-300/50 dark:border-rose-500/50 shadow-rose-500/20'}`}
                            >
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <div className={`w-2 h-2 rounded-full ${table.status === 'BOŞ' ? 'bg-emerald-500' : table.status === 'REZERVE' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                </div>

                                <span className="text-4xl mb-1 group-hover:scale-110 transition-transform">
                                    {table.status === 'BOŞ' ? '🪑' : table.status === 'REZERVE' ? '📅' : '🍽️'}
                                </span>
                                <span className="font-extrabold text-slate-800 dark:text-white uppercase tracking-tighter text-lg">
                                    {table.tempName ? (
                                        <span className="text-indigo-600 dark:text-indigo-400">{table.tempName}</span>
                                    ) : table.name}
                                </span>

                                {table.status === 'DOLU' ? (
                                    <div className="flex flex-col items-center gap-1 mt-1 border-t border-rose-200 dark:border-rose-500/20 pt-3 w-full">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                            <span className="opacity-70">👤</span>
                                            <span>{table.waiterName || 'Garson'}</span>
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
            </div>

            {/* Sağ Pane - Adisyon (Cart) */}
            <div className="w-[450px] min-w-[450px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-l border-white/50 dark:border-slate-700/50 flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20 transition-colors">
                <div className="p-6 border-b border-slate-100/50 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        {t('orderDetail') || 'Adisyon'}
                        {selectedTable && (
                            <span className="bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 py-1.5 px-4 rounded-full text-sm font-bold shadow-inner">{selectedTable.tempName || selectedTable.name}</span>
                        )}
                    </h2>

                    {/* Alt Adisyon Sekmeleri */}
                    {selectedTable && allFlatChecks.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                            <button
                                onClick={() => setActiveSubCheckId('ALL')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeSubCheckId === 'ALL'
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                    }`}
                            >
                                <i className="fat fa-layer-group mr-1.5"></i> Tümü
                                <span className="ml-1 opacity-70">₺{allFlatChecks.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0).toFixed(0)}</span>
                            </button>
                            {allFlatChecks.map((check: any) => (
                                <button
                                    key={check.id}
                                    onClick={() => setActiveSubCheckId(check.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeSubCheckId === check.id
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                        : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                        }`}
                                >
                                    {check.subCheckLabel || `Adisyon ${check.subCheckIndex + 1}`}
                                    {check.totalAmount > 0 && (
                                        <span className="ml-1 opacity-70">₺{Number(check.totalAmount).toFixed(0)}</span>
                                    )}
                                </button>
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

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {!selectedTable ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            <p>{t('pleaseSelectTable') || 'Lütfen masa seçiniz'}</p>
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <p>{t('noProductAdded') || 'Henüz ürün eklenmedi'}</p>
                        </div>
                    ) : (
                        cart.map((item: any, index) => (
                            <div key={index} className="flex flex-col gap-1">
                                <div className="flex flex-col gap-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <span className="block font-medium text-slate-800 dark:text-slate-200">
                                            {item.product.name}
                                            {item.saleType && item.saleType !== 'STANDARD' && (
                                                <span className={`text-[10px] ml-1 px-2 py-0.5 rounded-full inline-block font-bold border ${item.saleType === 'HALF' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                                                    {item.saleType === 'HALF' ? 'YARIM' : 'DUBLE'}
                                                </span>
                                            )}
                                            <span className="text-sm text-indigo-500 font-bold ml-1">x{item.quantity}</span>
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase text-xs">
                                            ₺{((
                                                ((item.unitPrice ?? item.product.price) * (item.saleTypeMultiplier || 1)) * item.quantity) +
                                                (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0)
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                {item.subItems && item.subItems.length > 0 && (
                                    <div className="ml-6 flex flex-col gap-1 mb-2">
                                        {item.subItems.map((sub: any, sIdx: number) => (
                                            <div key={sIdx} className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                                <i className="fat fa-caret-right"></i>
                                                <span>{sub.product?.name || `Ürün #${sub.productId}`}</span>
                                                {sub.unitPrice > 0 && <span className="text-indigo-400">(+₺{sub.unitPrice})</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Ödeme / Alt Kısım */}
                <div className="p-6 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-xl border-t border-white/50 dark:border-slate-700/50 m-4 rounded-3xl transition-colors shadow-inner">
                    <div className="flex justify-between mb-2 text-slate-500 dark:text-slate-400 text-sm">
                        <span>{t('subtotal') || 'Ara Toplam'}</span>
                        <span>₺{subTotal.toFixed(2)}</span>
                    </div>


                    {(canDiscount && (!selectedTable?.isBillRequested || canDiscountAfterBill)) && (
                        <div className="grid grid-cols-2 gap-3 mb-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">İndirim (₺)</label>
                                <input
                                    type="number"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">İndirim (%)</label>
                                <input
                                    type="number"
                                    value={(totalBeforeAdjustments > 0 && discount > 0) ? Number((discount / totalBeforeAdjustments) * 100).toFixed(1).replace(/\.0$/, '') : ''}
                                    onChange={(e) => {
                                        const percent = Number(e.target.value) || 0;
                                        setDiscount(Number((totalBeforeAdjustments * percent / 100).toFixed(2)));
                                    }}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono"
                                    placeholder="% 0"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between mb-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('total') || 'Genel Toplam'}</span>
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">₺{grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-3">
                        <button
                            onClick={() => setSelectedTable(null)}
                            className="py-3 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                            disabled={!selectedTable}
                        >
                            <i className="fat fa-pause mr-1"></i> Beklet
                        </button>
                        <button
                            onClick={() => {
                                const perms = user?.extraPermissions || [];
                                const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                if (!isSuperAdmin && !perms.includes('OP:FINANCE_PARTIAL_PAYMENT')) {
                                    showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Adisyon bölme yetkiniz bulunmamaktadır.' });
                                    return;
                                }

                                if (!activeSubCheckId || activeSubCheckId === 'ALL') {
                                    toastSwal({ icon: 'warning', title: 'Lütfen bölünecek tek bir adisyon seçin!' });
                                    return;
                                }
                                const activeCheck = allFlatChecks.find((s: any) => s.id === activeSubCheckId);
                                if (!activeCheck || !activeCheck.items || activeCheck.items.length === 0) {
                                    toastSwal({ icon: 'warning', title: 'Bölünecek ürün yok!' });
                                    return;
                                }
                                setSplitSelectedItems([]);
                                setSplitQuantities({});
                                setIsSplitModalOpen(true);
                            }}
                            className={`py-3 rounded-2xl border font-bold text-sm shadow-sm transition-all ${activeSubCheckId === 'ALL'
                                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                                : 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400 active:scale-[0.98]'
                                }`}
                            disabled={!selectedTable || cart.length === 0 || activeSubCheckId === 'ALL'}
                        >
                            <i className="fat fa-scissors mr-1"></i> Böl
                        </button>
                        <button
                            onClick={() => {
                                if (!selectedTable) return;

                                // --- Yetki Kontrolü ---
                                const perms = user?.extraPermissions || [];
                                const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                if (!isSuperAdmin && !perms.includes('OP:CAN_TRANSFER')) {
                                    showSwal({
                                        icon: 'warning',
                                        title: 'Yetki Yetersiz',
                                        text: 'Masa veya ürün transferi yapma yetkiniz bulunmamaktadır.'
                                    });
                                    return;
                                }

                                // Seçili ürünler varsa ürün transferi, yoksa masa transferi
                                const unpaidItems = cart.filter(i => !i.product.isQuickSale);
                                if (activeSubCheckId && activeSubCheckId !== 'ALL') {
                                    setTransferMode('SUBCHECK_TO_TABLE');
                                    setTransferSelectedItemIds([]);
                                } else {
                                    setTransferMode('TABLE_TRANSFER');
                                    setTransferSelectedItemIds([]);
                                }
                                setIsTransferModalOpen(true);
                            }}
                            className="py-3 rounded-2xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                            disabled={!selectedTable || cart.length === 0}
                        >
                            <i className="fat fa-arrow-right-arrow-left mr-1"></i> Transfer
                        </button>
                        {canCancelSale && (
                            <button
                                onClick={handleCancelAdisyon}
                                className="py-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                                disabled={!selectedTable || cart.length === 0}
                            >
                                <i className="fat fa-trash mr-1"></i> İptal
                            </button>
                        )}

                    </div>
                    <div className="flex gap-3 w-full">
                        {((!selectedTable?.isBillRequested && canPrintBill) || (selectedTable?.isBillRequested && canReprintBill)) && (
                            <button
                                onClick={() => {
                                    if (allFlatChecks.length === 1) {
                                        handlePrintBill([allFlatChecks[0].id]);
                                    } else {
                                        setIsPrintBillModalOpen(true);
                                        if (activeSubCheckId && activeSubCheckId !== 'ALL') {
                                            setSelectedPrintCheckIds([activeSubCheckId as number]);
                                        } else {
                                            setSelectedPrintCheckIds(allFlatChecks.map(c => c.id));
                                        }
                                    }
                                }}
                                className="w-1/4 py-4 rounded-2xl bg-orange-100 hover:bg-orange-200 dark:bg-orange-600/20 dark:hover:bg-orange-600/30 border border-orange-300 dark:border-orange-500/50 text-orange-600 dark:text-orange-500 font-bold text-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shrink-0"
                                disabled={!selectedTable || allFlatChecks.length === 0}
                                title={selectedTable?.isBillRequested ? "2. Kez Yazdır" : "Hesap İste"}
                            >
                                <i className={`fat ${selectedTable?.isBillRequested ? 'fa-repeat' : 'fa-receipt'}`}></i>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                const perms = user?.extraPermissions || [];
                                const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                if (!isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_ACCOUNT')) {
                                    showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Hesap kapatma ve ödeme alma yetkiniz bulunmamaktadır.' });
                                    return;
                                }

                                setIsCheckoutOpen(true);
                                setSelectedPosItems(cart.map(i => i.itemId || i.product.id));
                            }}
                            className="w-3/4 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            disabled={cart.length === 0}
                        >
                            {t('collectPayment') || 'Ödeme Al'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isCheckoutOpen && !isSplitPaymentOpen && (() => {
                const selectedTotalAmount = cart.filter(i => selectedPosItems.includes(i.itemId || i.product.id)).reduce((sum, item) => {
                    const effectivePrice = (item as any).unitPrice ?? item.product.price;
                    const base = (effectivePrice * (item.saleTypeMultiplier || 1)) * item.quantity;
                    const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
                    return sum + base + extras;
                }, 0);
                const appliedDiscount = discount || 0;
                const appliedServiceFee = serviceFee || 0;
                const selectedGrandTotal = Number((selectedTotalAmount + appliedServiceFee - appliedDiscount).toFixed(2));

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 transform transition-all flex flex-col max-h-[90vh]">
                            <div className="p-6 text-center shrink-0 border-b border-slate-100 dark:border-slate-700">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">💳</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('paymentMethod') || 'Ödeme ve Ürün Seçimi'}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Ödemesini alacağınız ürünleri seçin.</p>
                            </div>

                            <div className="overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="space-y-2">
                                    {cart.map((item, idx) => {
                                        const uniqueKey = item.itemId || `cart-${item.product.id}-${idx}`;
                                        const isSelected = selectedPosItems.includes(item.itemId || item.product.id);
                                        return (
                                            <div key={uniqueKey} className="flex flex-col gap-1">
                                                <div
                                                    onClick={() => {
                                                        const id = item.itemId || item.product.id;
                                                        if (selectedPosItems.includes(id)) {
                                                            setSelectedPosItems(prev => prev.filter(pId => pId !== id));
                                                        } else {
                                                            setSelectedPosItems(prev => [...prev, id]);
                                                        }
                                                    }}
                                                    className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/30' : 'bg-white border-transparent dark:bg-slate-800 opacity-60'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'}`}>
                                                            {isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                                        </div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{item.product.name} <span className="text-sm font-extrabold text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 px-2 py-0.5 rounded-full ml-1">x{item.quantity}</span></span>
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                        ₺{(
                                                            (((item as any).unitPrice ?? item.product.price) * (item.saleTypeMultiplier || 1)) * item.quantity +
                                                            (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0)
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                                {/* Display sub-items if present */}
                                                {(item as any).subItems && (item as any).subItems.length > 0 && (
                                                    <div className="ml-10 space-y-1 mb-2">
                                                        {(item as any).subItems.map((sub: any, sIdx: number) => (
                                                            <div key={sIdx} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                                                <i className="fat fa-caret-right"></i>
                                                                <span>{sub.product?.name || sub.productId}</span>
                                                                {sub.unitPrice > 0 && <span className="text-indigo-400">(+₺{sub.unitPrice})</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-6 shrink-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-end mb-6">
                                    <span className="text-slate-500 font-medium">Ödenecek Tutar</span>
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">
                                        ₺{selectedGrandTotal.toFixed(2)}
                                    </span>
                                </div>

                                {/* Check permissions for payment methods */}
                                {(() => {
                                    const allowed = activeCashRegister?.allowedPaymentMethods || [];
                                    const hasLimit = allowed.length > 0;
                                    const canCash = !hasLimit || allowed.includes('Nakit');
                                    const canCard = !hasLimit || allowed.includes('Kart');
                                    const canSplit = !hasLimit || allowed.includes('Parçalı');
                                    const canCari = !hasLimit || allowed.includes('Cari');

                                    return (
                                        <>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                                                {canCash && (
                                                    <button
                                                        onClick={() => {
                                                            const perms = user?.extraPermissions || [];
                                                            const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                                            if (!isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_ACCOUNT')) {
                                                                showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Nakit ödeme alma yetkiniz bulunmamaktadır.' });
                                                                return;
                                                            }
                                                            handleCheckout('Nakit');
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 p-3 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl transition-all font-bold text-emerald-700 dark:text-emerald-400 active:scale-95 text-xs"
                                                    >
                                                        <span className="text-xl">💵</span> {t('paymentCash') || 'Nakit'}
                                                    </button>
                                                )}
                                                {canCard && (
                                                    <button
                                                        onClick={() => {
                                                            const perms = user?.extraPermissions || [];
                                                            const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                                            if (!isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_ACCOUNT')) {
                                                                showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Kart ile ödeme alma yetkiniz bulunmamaktadır.' });
                                                                return;
                                                            }
                                                            handleCheckout('Kart');
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 rounded-xl transition-all font-bold text-blue-700 dark:text-blue-400 active:scale-95 text-xs"
                                                    >
                                                        <span className="text-xl">💳</span> {t('paymentCreditCard') || 'Kart'}
                                                    </button>
                                                )}
                                                {canCari && (
                                                    <button
                                                        onClick={async () => {
                                                            const perms = user?.extraPermissions || [];
                                                            const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                                            if (!isSuperAdmin && !perms.includes('OP:FINANCE_CLOSE_TO_CURRENT_ACCOUNT')) {
                                                                showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Cariye hesap kapatma yetkiniz bulunmamaktadır.' });
                                                                return;
                                                            }

                                                            const token = localStorage.getItem('token') || (user as any)?.token;
                                                            let partners: any[] = [];
                                                            try {
                                                                const pRes = await fetch(`${API_URL}/partners`, { headers: { Authorization: `Bearer ${token}` } });
                                                                if (pRes.ok) partners = await pRes.json();
                                                            } catch (e) { console.error("Partners fetch failed", e); }

                                                            const customerOptions = partners
                                                                .filter(p => p.type === 'CUSTOMER')
                                                                .reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

                                                            const Swal = (await import('sweetalert2')).default;
                                                            const { value: partnerId } = await Swal.fire({
                                                                title: 'Cari Seçimi',
                                                                input: 'select',
                                                                inputOptions: customerOptions,
                                                                inputPlaceholder: 'Müşteri seçin...',
                                                                showCancelButton: true,
                                                                confirmButtonText: 'Cariye Kapat',
                                                                cancelButtonText: 'Vazgeç',
                                                                background: theme === 'dark' ? '#1e293b' : '#fff',
                                                                color: theme === 'dark' ? '#fff' : '#1e293b',
                                                            });

                                                            if (partnerId) {
                                                                handleCheckout('Cari' as any, 0, 0, parseInt(partnerId));
                                                            }
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl transition-all font-bold text-indigo-700 dark:text-indigo-400 active:scale-95 text-xs"
                                                    >
                                                        <span className="text-xl">👤</span> {t('paymentCari') || 'Cari'}
                                                    </button>
                                                )}
                                            </div>

                                            {canSplit && (
                                                <button
                                                    onClick={() => {
                                                        const perms = user?.extraPermissions || [];
                                                        const isSuperAdmin = user?.role?.name?.toUpperCase() === 'ADMIN' || user?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
                                                        if (!isSuperAdmin && !perms.includes('OP:FINANCE_PARTIAL_PAYMENT')) {
                                                            showSwal({ icon: 'warning', title: 'Yetki Yetersiz', text: 'Parçalı ödeme alma yetkiniz bulunmamaktadır.' });
                                                            return;
                                                        }
                                                        setIsSplitPaymentOpen(true);
                                                        setSplitAmounts({ cash: 0, creditCard: selectedGrandTotal });
                                                    }}
                                                    className="w-full py-3 flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl transition-all font-bold text-indigo-700 dark:text-indigo-400 active:scale-[0.98] mb-3"
                                                >
                                                    <span className="text-xl">🔀</span> Tutar Böl (Nakit + Kart)
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}

                                <button
                                    onClick={() => setIsCheckoutOpen(false)}
                                    className="mt-4 w-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors p-2"
                                >
                                    {tc('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Split Payment Modal */}
            {
                isSplitPaymentOpen && (() => {
                    const selectedTotalAmount = cart.filter(i => selectedPosItems.includes(i.itemId || i.product.id)).reduce((sum, item) => {
                        const effectivePrice = (item as any).unitPrice ?? item.product.price;
                        const base = (effectivePrice * (item.saleTypeMultiplier || 1)) * item.quantity;
                        const extras = (item.subItems || []).filter((s: any) => s.isExtra).reduce((es: number, s: any) => es + ((s.unitPrice || 0) * item.quantity), 0);
                        return sum + base + extras;
                    }, 0);
                    const appliedDiscount = discount || 0;
                    const appliedServiceFee = serviceFee || 0;
                    const selectedGrandTotal = Number((selectedTotalAmount + appliedServiceFee - appliedDiscount).toFixed(2));
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 transform transition-all">
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">🔀</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Tutar Bölme (Müşterek)</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mb-4">Seçili Satırlar: ₺{selectedGrandTotal.toFixed(2)}</p>

                                    <div className="space-y-4 text-left">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nakit Alınan (₺)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={splitAmounts.cash}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    let newCash = val;
                                                    if (newCash > selectedGrandTotal) newCash = selectedGrandTotal;
                                                    setSplitAmounts({ cash: newCash, creditCard: Number((selectedGrandTotal - newCash).toFixed(2)) });
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Kredi Kartı Alınan (₺)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={splitAmounts.creditCard}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    let newCC = val;
                                                    if (newCC > selectedGrandTotal) newCC = selectedGrandTotal;
                                                    setSplitAmounts({ creditCard: newCC, cash: Number((selectedGrandTotal - newCC).toFixed(2)) });
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => {
                                                setIsSplitPaymentOpen(false);
                                                setIsCheckoutOpen(true); // Geri dönünce ana checkout açılsın
                                                setSplitAmounts({ cash: 0, creditCard: 0 });
                                            }}
                                            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            Geri
                                        </button>
                                        <button
                                            onClick={() => handleCheckout('Parçalı', splitAmounts.cash, splitAmounts.creditCard)}
                                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-blue-500/30 transition-all"
                                        >
                                            Tahsili Onayla
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Alt Adisyon Ekle Modal */}
            {isAddSubCheckOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
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
                                    if (!activeSubCheckId && activeOrderIds.length === 0) return;
                                    try {
                                        const token = localStorage.getItem('token') || (user as any)?.token;
                                        const parentId = activeOrderIds[0] || activeSubCheckId;
                                        const res = await fetch(`${API_URL}/sales/${parentId}/sub-check`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ label: newSubCheckLabel || undefined })
                                        });
                                        if (res.ok) {
                                            const newSub = await res.json();
                                            toastSwal({ icon: 'success', title: `${newSub.subCheckLabel} oluşturuldu!` });
                                            setIsAddSubCheckOpen(false);
                                            setActiveSubCheckId(newSub.id);
                                            setSelectedTable({ ...selectedTable! });
                                        } else {
                                            toastSwal({ icon: 'error', title: 'Alt adisyon oluşturulamadı!' });
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        toastSwal({ icon: 'error', title: 'Sistem hatası!' });
                                    }
                                }}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all"
                            >
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Adisyon Bölme (Split Check) Modal */}
            {isSplitModalOpen && (() => {
                const activeCheck = allFlatChecks.find((s: any) => s.id === activeSubCheckId);
                const splitItems = activeCheck?.items?.filter((i: any) => i.status === 'ACTIVE') || [];
                const splitTotal = splitSelectedItems.reduce((sum, itemId) => {
                    const item = splitItems.find((i: any) => i.id === itemId);
                    if (!item) return sum;
                    const qty = splitQuantities[itemId] || Number(item.quantity);
                    return sum + (qty * Number(item.unitPrice));
                }, 0);
                const remainingTotal = Number(activeCheck?.totalAmount || 0) - splitTotal;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                            <div className="p-6 text-center shrink-0 border-b border-slate-100 dark:border-slate-700">
                                <div className="w-14 h-14 bg-violet-100 dark:bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl">✂️</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Adisyon Böl</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Yeni adisyona taşınacak ürünleri seçin</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Kaynak: {activeCheck?.subCheckLabel || 'Ana Adisyon'}</h3>
                                        <div className="space-y-2">
                                            {splitItems.map((item: any) => {
                                                const isSelected = splitSelectedItems.includes(item.id);
                                                const splitQty = splitQuantities[item.id] || Number(item.quantity);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-violet-50/80 border-violet-200 dark:bg-violet-500/20 dark:border-violet-500/30' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSplitSelectedItems(prev => prev.filter(id => id !== item.id));
                                                                setSplitQuantities(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                                            } else {
                                                                setSplitSelectedItems(prev => [...prev, item.id]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                                                </div>
                                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{item.product?.name || `Ürün #${item.productId}`}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500">x{Number(item.quantity)}</span>
                                                        </div>
                                                        {isSelected && Number(item.quantity) > 1 && (
                                                            <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Taşı:</span>
                                                                <input type="number" min={1} max={Number(item.quantity)} value={splitQty}
                                                                    onChange={(e) => { const val = Math.min(Number(item.quantity), Math.max(1, Number(e.target.value) || 1)); setSplitQuantities(prev => ({ ...prev, [item.id]: val })); }}
                                                                    className="w-16 px-2 py-1 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">/ {Number(item.quantity)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3">Yeni Adisyon</h3>
                                        <div className="space-y-2">
                                            {splitSelectedItems.map(itemId => {
                                                const item = splitItems.find((i: any) => i.id === itemId);
                                                if (!item) return null;
                                                const qty = splitQuantities[itemId] || Number(item.quantity);
                                                return (
                                                    <div key={itemId} className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{item.product?.name || `Ürün #${item.productId}`}</span>
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">x{qty} — ₺{(qty * Number(item.unitPrice)).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {splitSelectedItems.length === 0 && (
                                                <div className="text-center text-slate-400 py-8 text-sm"><p>← Soldan ürün seçin</p></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase">Kaynak Kalan</span>
                                        <p className="text-lg font-black text-slate-800 dark:text-white">₺{remainingTotal.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-emerald-500 uppercase">Yeni Adisyon</span>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₺{splitTotal.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsSplitModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                        İptal
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (splitSelectedItems.length === 0) return;
                                            try {
                                                const token = localStorage.getItem('token') || (user as any)?.token;
                                                const quantitiesPayload: Record<number, number> = {};
                                                splitSelectedItems.forEach(itemId => {
                                                    const item = splitItems.find((i: any) => i.id === itemId);
                                                    if (item && splitQuantities[itemId] && splitQuantities[itemId] < Number(item.quantity)) {
                                                        quantitiesPayload[itemId] = splitQuantities[itemId];
                                                    }
                                                });
                                                const res = await fetch(`${API_URL}/sales/${activeSubCheckId}/split`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                    body: JSON.stringify({ itemIds: splitSelectedItems, quantities: Object.keys(quantitiesPayload).length > 0 ? quantitiesPayload : undefined })
                                                });
                                                if (res.ok) {
                                                    const result = await res.json();
                                                    toastSwal({ icon: 'success', title: 'Adisyon başarıyla bölündü!' });
                                                    setIsSplitModalOpen(false);
                                                    setActiveSubCheckId(result.newCheck?.id || activeSubCheckId);
                                                    setSelectedTable({ ...selectedTable! });
                                                } else {
                                                    const err = await res.json();
                                                    toastSwal({ icon: 'error', title: err.message || 'Bölme başarısız!' });
                                                }
                                            } catch (e) { console.error(e); toastSwal({ icon: 'error', title: 'Sistem hatası!' }); }
                                        }}
                                        disabled={splitSelectedItems.length === 0}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-violet-500/30 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        Böldür
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Geri Dön Butonu - Float */}
            {/* <button
                onClick={() => router.push('/dashboard')}
                className="absolute top-6 right-[430px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-all z-30"
                title="Panoya Dön"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button> */}
            {/* Print Bill Modal */}
            {isPrintBillModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 p-6 flex flex-col max-h-[90vh]">
                        <div className="text-center mb-6 shrink-0">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fat fa-receipt text-3xl"></i>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Hesap Yazdır</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Yazdırılacak adisyonları seçin.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1 custom-scrollbar">
                            <div
                                onClick={() => {
                                    if (selectedPrintCheckIds.length === allFlatChecks.length) {
                                        setSelectedPrintCheckIds([]);
                                    } else {
                                        setSelectedPrintCheckIds(allFlatChecks.map(c => c.id));
                                    }
                                }}
                                className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all border ${selectedPrintCheckIds.length === allFlatChecks.length ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/20 dark:border-orange-500/30' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${selectedPrintCheckIds.length === allFlatChecks.length ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                        {selectedPrintCheckIds.length === allFlatChecks.length && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Tümü (Tek Fiş)</span>
                                </div>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                            {allFlatChecks.map((check) => {
                                const isSelected = selectedPrintCheckIds.includes(check.id);
                                return (
                                    <div
                                        key={check.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedPrintCheckIds(prev => prev.filter(id => id !== check.id));
                                            } else {
                                                setSelectedPrintCheckIds(prev => [...prev, check.id]);
                                            }
                                        }}
                                        className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/20 dark:border-orange-500/30' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                            </div>
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{check.subCheckLabel || `Adisyon`}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">₺{Number(check.totalAmount).toFixed(2)}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={() => setIsPrintBillModalOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => handlePrintBill()}
                                disabled={selectedPrintCheckIds.length === 0}
                                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                            >
                                <i className="fat fa-print"></i> Yazdır
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancellation Modal */}
            {isCancellationModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-[0_32px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-4 shrink-0 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center">
                                    <i className="fat fa-trash-can text-2xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">İptal İşlemleri</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">{selectedTable?.name} Masası</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCancellationModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center"
                            >
                                <i className="fat fa-xmark text-xl"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {cancelView === 'MAIN' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <button
                                        onClick={async () => {
                                            const Swal = (await import('sweetalert2')).default;
                                            const { value: reason } = await Swal.fire({
                                                title: 'Masa İptal Nedeni',
                                                input: 'text',
                                                inputPlaceholder: 'Neden iptal ediliyor?',
                                                showCancelButton: true,
                                                confirmButtonText: 'İptal Et',
                                                cancelButtonText: 'Vazgeç',
                                                background: theme === 'dark' ? '#1e293b' : '#fff',
                                                color: theme === 'dark' ? '#fff' : '#1e293b',
                                            });
                                            if (reason !== undefined) confirmCancelTable(reason);
                                        }}
                                        className="group p-8 rounded-[32px] bg-rose-500 hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex flex-col items-center justify-center text-center gap-4 active:scale-95"
                                    >
                                        <i className="fat fa-table-list text-5xl text-white group-hover:scale-110 transition-transform"></i>
                                        <span className="text-lg font-black text-white uppercase tracking-tight">Tüm Masayı İptal Et</span>
                                    </button>

                                    <button
                                        onClick={() => setCancelView('SUBCHECK')}
                                        className="group p-8 rounded-[32px] bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 hover:border-amber-500 transition-all shadow-lg flex flex-col items-center justify-center text-center gap-4 active:scale-95"
                                    >
                                        <i className="fat fa-receipt text-5xl text-amber-500 group-hover:scale-110 transition-transform"></i>
                                        <span className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Adisyon İptal Et</span>
                                    </button>

                                    <button
                                        onClick={() => setCancelView('ITEM')}
                                        className="group p-8 rounded-[32px] bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 hover:border-indigo-500 transition-all shadow-lg flex flex-col items-center justify-center text-center gap-4 active:scale-95"
                                    >
                                        <i className="fat fa-burger-soda text-5xl text-indigo-500 group-hover:scale-110 transition-transform"></i>
                                        <span className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Ürün İptal Et</span>
                                    </button>
                                </div>
                            )}

                            {cancelView === 'SUBCHECK' && (
                                <div className="space-y-4">
                                    <button onClick={() => setCancelView('MAIN')} className="text-slate-400 hover:text-indigo-500 font-bold text-sm mb-4 flex items-center gap-2 transition-colors">
                                        <i className="fat fa-arrow-left"></i> Geri Dön
                                    </button>
                                    {allFlatChecks.map((check: any) => (
                                        <div key={check.id} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-rose-500/50 transition-all">
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase">{check.subCheckLabel || 'Adisyon'}</h4>
                                                <p className="text-sm font-bold text-slate-400">₺{Number(check.totalAmount).toFixed(2)} — {check.items?.length || 0} Ürün</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const Swal = (await import('sweetalert2')).default;
                                                    const { value: reason } = await Swal.fire({
                                                        title: 'İptal Nedeni',
                                                        input: 'text',
                                                        inputPlaceholder: 'Neden iptal ediliyor?',
                                                        showCancelButton: true,
                                                        confirmButtonText: 'İptal Et',
                                                        cancelButtonText: 'Vazgeç',
                                                        background: theme === 'dark' ? '#1e293b' : '#fff',
                                                        color: theme === 'dark' ? '#fff' : '#1e293b',
                                                    });
                                                    if (reason !== undefined) confirmCancelSubCheck(check.id, reason);
                                                }}
                                                className="px-6 py-3 rounded-xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                                            >
                                                İptal Et
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {cancelView === 'ITEM' && (
                                <div className="space-y-4">
                                    <button onClick={() => setCancelView('MAIN')} className="text-slate-400 hover:text-indigo-500 font-bold text-sm mb-4 flex items-center gap-2 transition-colors">
                                        <i className="fat fa-arrow-left"></i> Geri Dön
                                    </button>
                                    <div className="grid grid-cols-1 gap-3">
                                        {allFlatChecks.flatMap((c: any) => (c.items || []).filter((i: any) => i.status === 'ACTIVE')).map((item: any) => (
                                            <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-rose-500/50 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-500 border border-slate-100 dark:border-slate-700">
                                                        {item.quantity}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white">{item.product?.name || `Ürün #${item.productId}`}</h4>
                                                        <p className="text-xs font-bold text-slate-400">₺{Number(item.unitPrice).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const Swal = (await import('sweetalert2')).default;
                                                        const { value: reason } = await Swal.fire({
                                                            title: 'İptal Nedeni',
                                                            input: 'text',
                                                            inputPlaceholder: 'Neden iptal ediliyor?',
                                                            showCancelButton: true,
                                                            confirmButtonText: 'İptal Et',
                                                            cancelButtonText: 'Vazgeç',
                                                            background: theme === 'dark' ? '#1e293b' : '#fff',
                                                            color: theme === 'dark' ? '#fff' : '#1e293b',
                                                        });
                                                        if (reason !== undefined) confirmCancelItem(item.id, reason);
                                                    }}
                                                    className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                                >
                                                    <i className="fat fa-trash-can"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                mode={transferMode}
                sourceSubCheckId={typeof activeSubCheckId === 'number' ? activeSubCheckId : undefined}
                sourceTableId={selectedTable?.id}
                sourceTableName={selectedTable?.name}
                selectedItemIds={transferSelectedItemIds}
                allFlatChecks={allFlatChecks}
                tables={tables}
                zones={allZones}
                onTransferComplete={() => {
                    if (selectedTable) {
                        // Refresh table data
                        refreshDynamicData();
                        setSelectedTable(null);
                    }
                }}
            />
        </div>
    );
}
