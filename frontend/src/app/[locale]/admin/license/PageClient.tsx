'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useLicense } from '@/app/[locale]/LicenseContext';
import { ShieldCheck, ShieldOff, ExternalLink, RefreshCw } from 'lucide-react';

interface Feature {
    key: string;
    label: string;
    description: string;
    icon: string;
    color: string;
}

const KNOWN_MODULES: Feature[] = [
    { key: 'core_v1',        label: 'Ana Yazılım Lisansı', description: 'Kasa (POS), sipariş yönetimi, temel satış ve raporlar.',         icon: 'fa-cash-register',       color: 'text-blue-500' },
    { key: 'kds',            label: 'Mutfak Ekranı (KDS)',  description: 'Görsel sipariş hazırlık ekranı ve pişirme süreleri takibi.',       icon: 'fa-fire-burner',         color: 'text-rose-500' },
    { key: 'qr_menu',        label: 'QR Menü',              description: 'Müşterilerin telefonuyla tarayıp sipariş verdiği dijital menü.',   icon: 'fa-qrcode',              color: 'text-emerald-500' },
    { key: 'accounting',     label: 'Ön Muhasebe Modülü',   description: 'Fatura yönetimi, cari hesap takibi ve finansal raporlar.',         icon: 'fa-building-columns',    color: 'text-blue-500' },
    { key: 'recipe_system',  label: 'Reçete / Yarı Mamul',  description: 'Ürün reçeteleri, hammadde takibi ve maliyet analizi.',            icon: 'fa-blender',             color: 'text-lime-500' },
    { key: 'waiter_app',     label: 'Garson Uygulaması',    description: 'Tablet/Mobil üzerinden sipariş alma ve masa yönetimi.',           icon: 'fa-tablet-screen-button',color: 'text-violet-500' },
    { key: 'delivery',       label: 'Paket Servis & Kurye', description: 'Dış servis siparişleri, kurye takibi ve harita entegrasyonu.',    icon: 'fa-truck-fast',          color: 'text-orange-500' },
    { key: 'ecommerce',      label: 'E-Ticaret Entegrasyonu', description: 'Online satış kanalları ve e-ticaret platform entegrasyonu.',    icon: 'fa-cart-shopping',       color: 'text-cyan-500' },
    { key: 'crm',            label: 'Gelişmiş CRM',          description: 'Müşteri ilişkileri yönetimi ve sadakat programları.',            icon: 'fa-users-gear',          color: 'text-pink-500' },
    { key: 'branch_system',  label: 'Şubeli Sistem',        description: 'Birden fazla şube ve depo ekleme, merkezi stok yönetimi.',        icon: 'fa-network-wired',       color: 'text-purple-500' },
];

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const { isValid, modules, daysOffline, refreshLicense } = useLicense();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 relative overflow-hidden">
            {/* Ambient Background */}
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
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic">Panel üzerinden atanan aktif modül lisanslarınız.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/${locale}/admin`)}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> Geri
                        </button>
                        <button
                            onClick={refreshLicense}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Yenile
                        </button>
                    </div>
                </div>

                {/* Durum Kartı */}
                <div className={`mb-8 p-6 rounded-[32px] border-2 flex items-center gap-5 ${isValid
                    ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                    : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'}`}
                >
                    {isValid
                        ? <ShieldCheck className="w-12 h-12 text-emerald-500 flex-shrink-0" />
                        : <ShieldOff className="w-12 h-12 text-red-500 flex-shrink-0" />
                    }
                    <div>
                        <h2 className={`text-xl font-bold ${isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            {isValid ? 'Lisans Aktif' : 'Lisans Geçersiz'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {isValid
                                ? `${modules.length} modül aktif${daysOffline > 0 ? ` • ${daysOffline} gündür çevrimdışı` : ' • Çevrimiçi doğrulandı'}`
                                : 'Lütfen geçerli bir lisans anahtarı girin veya panel yöneticinizle iletişime geçin.'
                            }
                        </p>
                    </div>
                </div>

                {/* Modüller */}
                <div className="grid grid-cols-1 gap-4">
                    {KNOWN_MODULES.map((feature) => {
                        const isActive = modules.includes(feature.key);
                        return (
                            <div
                                key={feature.key}
                                className={`group p-6 rounded-[32px] border-2 flex items-center justify-between transition-all
                                    ${isActive
                                        ? 'bg-white dark:bg-slate-800/60 border-indigo-500 shadow-xl shadow-indigo-500/10'
                                        : 'bg-slate-100/50 dark:bg-slate-800/20 border-transparent grayscale opacity-50'
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

                                <div className="flex items-center gap-4 flex-shrink-0">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full
                                        ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'}`}>
                                        {isActive ? 'AKTİF' : 'LİSANS YOK'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bilgi Notu */}
                <div className="mt-10 p-6 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-[32px] flex gap-4 items-start">
                    <i className="fat fa-circle-info text-indigo-500 text-xl mt-1"></i>
                    <div>
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Lisans Değişikliği</h4>
                        <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70 mt-1 leading-relaxed">
                            Modül lisanslarınız yalnızca PosNetX Yönetim Paneli üzerinden değiştirilebilir. 
                            Yeni bir modül satın almak veya mevcut lisansınızla ilgili işlem yapmak için bayi veya yetkili satıcınızla iletişime geçin.
                        </p>
                        <a 
                            href="http://localhost:3005" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:underline"
                        >
                            <ExternalLink className="w-4 h-4" />
                            PosNetX Panel'e Git
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
