'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import { toastSwal } from '../utils/swal';
import { API_URL } from '@/lib/apiConfig';

interface PosContextType {
    products: any[];
    tables: any[];
    zones: any[];
    departments: any[];
    parentGroups: any[];
    productTypes: any[];
    dataLoading: boolean;
    refreshStaticData: () => Promise<void>;
    refreshDynamicData: () => Promise<void>;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export function usePos() {
    const context = useContext(PosContext);
    if (!context) {
        throw new Error('usePos must be used within a PosProvider');
    }
    return context;
}

export function PosProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [parentGroups, setParentGroups] = useState<any[]>([]);
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const fetchStaticData = useCallback(async () => {
        const token = Cookies.get('token') || localStorage.getItem('token');
        if (!token || authLoading || !user) return;

        try {
            const [productsRes, zonesRes, depsRes, typesRes, pGroupsRes] = await Promise.all([
                fetch(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                fetch(`${API_URL}/zones`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                fetch(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/product-types`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/parent-groups`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => [])
            ]);

            setProducts(Array.isArray(productsRes) ? productsRes : []);
            setZones(Array.isArray(zonesRes) ? zonesRes : []);
            setDepartments(Array.isArray(depsRes) ? depsRes : []);
            setProductTypes(Array.isArray(typesRes) ? typesRes : []);
            setParentGroups(Array.isArray(pGroupsRes) ? pGroupsRes : []);
        } catch (error) {
            console.error('Error fetching static POS data:', error);
        }
    }, [API_URL, authLoading, user]);

    const fetchDynamicData = useCallback(async () => {
        const token = Cookies.get('token') || localStorage.getItem('token');
        if (!token || authLoading || !user) return;

        try {
            const tablesRes = await fetch(`${API_URL}/tables`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
            setTables(Array.isArray(tablesRes) ? tablesRes : []);
        } catch (error) {
            console.error('Error fetching dynamic POS data (Tables):', error);
        } finally {
            setDataLoading(false);
        }
    }, [API_URL, authLoading, user]);

    // Initial load
    useEffect(() => {
        if (!authLoading && user) {
            setDataLoading(true);
            Promise.all([fetchStaticData(), fetchDynamicData()]).finally(() => setDataLoading(false));
        }
    }, [user, authLoading, fetchStaticData, fetchDynamicData]);

    // WebSocket logic centralized
    useEffect(() => {
        if (!user) return;

        const socket: Socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        const handleRealtimeUpdate = () => {
            // Only refresh Tables/Sales on standard updates to keep it fast
            fetchDynamicData();
        };

        socket.on('salesUpdate', handleRealtimeUpdate);
        socket.on('newOrder', handleRealtimeUpdate);
        socket.on('orderUpdated', handleRealtimeUpdate);

        socket.on('ecrStatusUpdate', (status: { connected: boolean; message: string }) => {
            toastSwal({
                icon: status.connected ? 'success' : 'warning',
                title: status.message,
                customClass: {
                    container: '!z-[10000]',
                    popup: `!bg-white dark:!bg-slate-900 border border-slate-200 dark:border-slate-700 border-l-4 ${status.connected ? '!border-l-emerald-500' : '!border-l-amber-500'} shadow-xl shadow-slate-900/10 !rounded-2xl`,
                    title: '!text-slate-800 dark:!text-white font-bold text-sm tracking-tight',
                    timerProgressBar: status.connected ? 'bg-emerald-500' : 'bg-amber-500'
                }
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [API_URL, user, fetchDynamicData]);

    // Yetki bazlı salon filtreleme
    const filteredZones = useMemo(() => {
        if (!user || zones.length === 0) return zones;
        const role = user?.role?.name?.toUpperCase();
        if (role === 'ADMIN' || role === 'ADMINISTRATOR') return zones;

        // 1. Manuel Zone Yetkileri (ZONE:ID)
        const manualZoneIds = (user?.extraPermissions || [])
            .filter((p: string) => p.startsWith('ZONE:'))
            .map((p: string) => Number(p.split(':')[1]));

        // 2. Masa bazlı daraltma (Eğer hiç yetkili masası yoksa salonu gizle)
        // Not: tables zaten backend tarafından yetkilere göre filtrelenmiş geliyor
        if (tables.length > 0) {
            return zones.filter(z => 
                (manualZoneIds.length === 0 || manualZoneIds.includes(z.id)) && // Salon yetkisi varsa
                tables.some(t => t.zone?.id === z.id || (t as any).zoneId === z.id) // Ve o salonda en az bir masası varsa
            );
        }

        // Masalar henüz yüklenmediyse sadece salon yetkilerine göre dön
        if (manualZoneIds.length > 0) {
            return zones.filter(z => manualZoneIds.includes(z.id));
        }

        return zones;
    }, [zones, tables, user]);

    return (
        <PosContext.Provider value={{
            products,
            tables,
            zones: filteredZones,
            departments,
            parentGroups,
            productTypes,
            dataLoading,
            refreshStaticData: fetchStaticData,
            refreshDynamicData: fetchDynamicData
        }}>
            {children}
        </PosContext.Provider>
    );
}
