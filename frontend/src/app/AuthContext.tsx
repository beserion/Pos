import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: any;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            setUser({ token });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email: string, pass: string) => {
        try {
            const response = await axios.post('http://localhost:3050/auth/login', { email: email.trim(), password: pass });
            if (response.data.access_token) {
                const token = response.data.access_token;
                Cookies.set('token', token, { expires: 1 });
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setUser({ ...response.data.user, token });
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('Login error', error);
            throw error;
        }
    };

    const logout = () => {
        Cookies.remove('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
