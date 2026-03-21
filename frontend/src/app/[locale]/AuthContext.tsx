'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: any;
    login: (email: string, pass: string) => Promise<void>;
    loginPin: (userId: number, pin: string) => Promise<void>;
    loginPinOnly: (pin: string) => Promise<any>;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    loading: boolean;
    setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children, locale }: { children: React.ReactNode, locale: string }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            const token = Cookies.get('token') || localStorage.getItem('token');
            if (token) {
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
                    const res = await axios.get(`${apiBase}/auth/me`);
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

    const login = async (email: string, pass: string) => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
            console.log(`Attempting login to ${apiBase}/auth/login`);
            const response = await axios.post(`${apiBase}/auth/login`, { email: email.trim(), password: pass });
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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';
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
        <AuthContext.Provider value={{ user, login, loginPin, loginPinOnly, logout, hasPermission, loading, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
