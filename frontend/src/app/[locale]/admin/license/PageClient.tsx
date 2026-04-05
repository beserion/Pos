'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';

const API = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

interface Feature {
    key: string;
    label: string;
    description: string;
    icon: string;
    color: string;
}

const PREMIUM_FEATURES: Feature[] = [
    { key: 'recipe_system', label: 'Stok & Reçete Sistemi', description: 'Ürün reçeteleri, hammadde takibi ve maliyet analizi.', icon: 'fa-blender', color: 'text-emerald-500' },
    { key: 'inventory_system', label: 'Envanter Yönetimi', description: 'Depo yönetimi, stok sayımı ve kritik stok uyarıları.', icon: 'fa-boxes-stacked', color: 'text-lime-500' },
    { key: 'kds_system', label: 'Mutfak Ekranı (KDS)', description: 'Görsel sipariş hazırlık ekranı ve pişirme süreleri takibi.', icon: 'fa-fire-burner', color: 'text-rose-500' },
    { key: 'reservation_system', label: 'Rezervasyon Sistemi', description: 'Masa rezervasyonu, müşteri yönetimi ve hatırlatıcılar.', icon: 'fa-calendar-check', color: 'text-indigo-500' },
    { key: 'delivery_system', label: 'Paket Servis & Kurye Paneli', description: 'Dış servis siparişleri, kurye takibi ve harita entegrasyonu.', icon: 'fa-truck-fast', color: 'text-orange-500' },
    { key: 'finance_system', label: 'Finans & Cari & Fatura', description: 'Fatura yönetimi, cari hesap takibi ve detaylı finansal raporlar.', icon: 'fa-building-columns', color: 'text-blue-500' },
    { key: 'waiter_system', label: 'Garson / Terminal Sistemi', description: 'Tablet/Mobil üzerinden sipariş alma ve masa yönetimi.', icon: 'fa-tablet-screen-button', color: 'text-violet-500' },
];

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const { user, login } = useAuth();
    const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user?.firm?.activeFeatures) {
            setActiveFeatures(user.firm.activeFeatures);
            setLoading(false);
        } else if (user?.firm?.id) {
            fetchFirmFeatures();
        }
    }, [user]);

    const fetchFirmFeatures = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API}/firms/${user?.firm?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveFeatures(res.data.activeFeatures || []);
        } catch (error) {
            console.error('Firm fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = (key: string) => {
        setActiveFeatures(prev =>
            prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
        );
    };

    const handleSave = async () => {
        if (!user?.firm?.id) return;
        setSaving(true);
        try {
            const token = Cookies.get('token');
            await axios.put(`${API}/firms/${user.firm.id}`, {
                activeFeatures: activeFeatures
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toastSwal({ icon: 'success', title: 'Lisans Ayarları Güncellendi', text: 'Değişikliklerin yansıması için sistem yeniden yüklenebilir.' });
            
            // Backend update user's firm features in memory if possible, 
            // but usually a re-login or hard refresh is better.
            setTimeout(() => {
                window.location.reload(); // Hard reload to refresh user context
            }, 2000);

        } catch (error: any) {
            showSwal({ icon: 'error', title: 'Hata', text: error.response?.data?.message || 'Güncelleme başarısız.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 relative overflow-hidden">
            {/* Ambient Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px]"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 dark:bg-purple-600/10 blur-[120px]"></div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <i className="fat fa-shield-keyhole text-3xl"></i>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-2">Lisans Yönetimi</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Firmanıza ait premium modül yetkilerini yönetin.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/${locale}/admin`)}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> Vazgeç
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <i className="fat fa-spinner animate-spin"></i> : <i className="fat fa-check"></i>}
                            DEĞİŞİKLİKLERİ KAYDET
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {PREMIUM_FEATURES.map((feature) => {
                        const isActive = activeFeatures.includes(feature.key);
                        return (
                            <div
                                key={feature.key}
                                onClick={() => toggleFeature(feature.key)}
                                className={`group p-6 rounded-[32px] border-2 transition-all cursor-pointer flex items-center justify-between
                                    ${isActive 
                                        ? 'bg-white dark:bg-slate-800/60 border-indigo-500 shadow-xl shadow-indigo-500/10' 
                                        : 'bg-slate-100/50 dark:bg-slate-800/20 border-transparent border-dashed grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 
                                        ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 ' + feature.color : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                        <i className={`fat ${feature.icon}`}></i>
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-bold transition-colors ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                            {feature.label}
                                        </h3>
                                        <p className="text-sm text-slate-400 max-w-md mt-1 font-medium">{feature.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all
                                        ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'}`}>
                                        {isActive ? 'AKTİF' : 'KAPALI'}
                                    </span>
                                    
                                    <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${isActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info Note */}
                <div className="mt-10 p-6 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-[32px] flex gap-4 items-start">
                    <i className="fat fa-circle-info text-indigo-500 text-xl mt-1"></i>
                    <div>
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Önemli Bilgi</h4>
                        <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70 mt-1 leading-relaxed">
                            Buradaki değişiklikler firmanızın genel lisans ayarıdır. Bir modülü kapattığınızda, o modül tüm kullanıcılarınız için (garsonlar, mutfak personeli vb.) anında erişilemez hale gelecektir. Değişikliklerin tam olarak yansıması için sistem sayfayı yenileyecektir.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
