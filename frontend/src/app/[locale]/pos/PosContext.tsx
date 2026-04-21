'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../AuthContext';

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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';

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

        return () => {
            socket.disconnect();
        };
    }, [API_URL, user, fetchDynamicData]);

    return (
        <PosContext.Provider value={{
            products,
            tables,
            zones,
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
