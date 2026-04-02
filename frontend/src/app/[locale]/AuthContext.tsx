'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAlerts } from '../../hooks/useAlerts';
import { AlertsBell } from '../../components/alerts/AlertsBell';
import { AlertCriticalPopup } from '../../components/alerts/AlertCriticalPopup';

interface AuthContextType {
    user: any;
    login: (email: string, pass: string) => Promise<void>;
    loginPin: (userId: number, pin: string) => Promise<void>;
    loginPinOnly: (pin: string) => Promise<any>;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    hasFeature: (feature: string) => boolean;
    loading: boolean;
    setUser: (user: any) => void;
    alertsBell: React.ReactNode;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children, locale }: { children: React.ReactNode, locale: string }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const userId = user?.id ?? null;
    const roleId = user?.role?.id ?? null;
    const { notifications, unreadCount, criticalPopup, markAsRead, markAllAsRead, dismissPopup } = useAlerts(userId, roleId);

    const alertsBell = user ? (
        <AlertsBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
        />
    ) : null;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

    useEffect(() => {
        const fetchProfile = async () => {
            const token = Cookies.get('token') || localStorage.getItem('token');
            if (token) {
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await axios.get(`${API_URL}/auth/me`);
                    setUser({ ...res.data, token });
                    if (!localStorage.getItem('token')) {
                        localStorage.setItem('token', token);
                    }
                } catch (error) {
                    console.error('Failed to fetch profile:', error);
                    logout();
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const hasPermission = (permission: string) => {
        if (!user || !user.role) return false;
        
        const roleName = user.role.name?.toUpperCase();
        if (roleName === 'ADMIN' || roleName === 'ADMINISTRATOR') return true;

        const perms: any = user.role.permissions || [];
        const extra: string[] = user.extraPermissions || [];
        
        // Combine perms if they are string arrays
        let normalizedPerms: string[] = [];
        if (perms === 'ALL' || (Array.isArray(perms) && perms[0] === 'ALL')) return true;
        
        if (Array.isArray(perms)) {
            normalizedPerms = perms.flatMap(p => typeof p === 'string' ? p.split(',').map(s => s.trim()) : []);
        } else if (typeof perms === 'string') {
            normalizedPerms = perms.split(',').map(s => s.trim());
        }

        const allUserPerms = [...normalizedPerms, ...extra];
        return allUserPerms.includes(permission) || allUserPerms.includes('ALL');
    };

    const hasFeature = (feature: string) => {
        if (!user || !user.firm) return true; // If no firm setup, allow all (or return true based on default behavior)
        const activeFeatures: string[] = user.firm.activeFeatures || [];
        return activeFeatures.includes(feature) || activeFeatures.includes('ALL');
    };

    const login = async (email: string, pass: string) => {
        try {
            console.log(`[AuthContext] Attempting login to: ${API_URL}/auth/login`);
            const response = await axios.post(`${API_URL}/auth/login`, { email: email.trim(), password: pass });
            if (response.data.access_token) {
                const token = response.data.access_token;
                Cookies.set('token', token, { expires: 1 });
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser({ ...response.data.user, token });
                window.location.href = `/${locale}/dashboard`;
            }
        } catch (error: any) {
            console.error('Login error details:', error.response?.data || error.message);
            throw error;
        }
    };

    const loginPin = async (userId: number, pin: string) => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));
            const response = await axios.post(`${apiBase}/auth/login-pin`, { userId, pinCode: pin });
            if (response.data.access_token) {
                const token = response.data.access_token;
                Cookies.set('token', token, { expires: 1 });
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser({ ...response.data.user, token });
            }
        } catch (error) {
            console.warn('PIN Login failure:', error);
        }
    };

    const loginPinOnly = async (pin: string) => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));
            const response = await axios.post(`${apiBase}/auth/login-pin-only`, { pinCode: pin });
            if (response.data.access_token) {
                const token = response.data.access_token;
                Cookies.set('token', token, { expires: 1 });
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser({ ...response.data.user, token });
                return response.data.user;
            }
            return null;
        } catch (error) {
            console.warn('PIN Login Only failure:', error);
            return null;
        }
    };

    const logout = () => {
        Cookies.remove('token');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        router.push(`/${locale}/login`);
    };

    return (
        <AuthContext.Provider value={{ user, login, loginPin, loginPinOnly, logout, hasPermission, hasFeature, loading, setUser, alertsBell }}>
            {children}
            <AlertCriticalPopup notification={criticalPopup} onDismiss={dismissPopup} />
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
