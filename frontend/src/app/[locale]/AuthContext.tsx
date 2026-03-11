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
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children, locale }: { children: React.ReactNode, locale: string }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('token') || localStorage.getItem('token');
        if (token) {
            setUser({ token });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (!localStorage.getItem('token')) {
                localStorage.setItem('token', token);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, pass: string) => {
        try {
            const response = await axios.post('http://localhost:3050/auth/login', { email: email.trim(), password: pass });
            if (response.data.access_token) {
                const token = response.data.access_token;
                Cookies.set('token', token, { expires: 1 });
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser({ ...response.data.user, token });
                window.location.href = `/${locale}/dashboard`;
            }
        } catch (error) {
            console.error('Login error', error);
            throw error;
        }
    };

    const loginPin = async (userId: number, pin: string) => {
        try {
            const response = await axios.post('http://localhost:3050/auth/login-pin', { userId, pinCode: pin });
            if (response.data.access_token) {
                const token = response.data.access_token;
                Cookies.set('token', token, { expires: 1 });
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser({ ...response.data.user, token });
            }
        } catch (error) {
            console.warn('PIN Login failure:', error);
            return null;
        }
    };

    const loginPinOnly = async (pin: string) => {
        try {
            const response = await axios.post('http://localhost:3050/auth/login-pin-only', { pinCode: pin });
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
        <AuthContext.Provider value={{ user, login, loginPin, loginPinOnly, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
