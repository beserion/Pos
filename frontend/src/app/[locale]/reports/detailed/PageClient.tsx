'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../AuthContext';
import { useLocale } from 'next-intl';
import PremiumModuleLocked from '@/components/PremiumModuleLocked';
import {
  ArrowLeft,
  TrendingUp,
  BarChart,
  Gift,
  RefreshCw,
  XCircle,
  Percent
} from 'lucide-react';

export function PageClient() {
  const { user, loading, hasFeature } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!loading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, loading, router, locale]);

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (user && !hasFeature('finance_system')) {
    return (
      <div className="h-screen bg-[#0f172a] flex flex-col">
        <PremiumModuleLocked moduleName="Detaylı Raporlar & Derin Analiz" featureKey="finance_system" />
      </div>
    );
  }

  const reportsList = [
    {
      key: 'complimentary-non-payable',
      title: 'İkram & Ödenmez Detay Raporu',
      desc: 'İkram edilen ve ödenmez olarak kapatılan ürünlerin masa, adisyon, personel ve ürün cinsi bazlı detaylı dökümü.',
      badge: 'Finansal Rapor',
      color: 'rose',
      glowClass: 'hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-[0_8px_30px_-5px_rgba(244,63,94,0.3)]',
      iconClass: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      titleHoverClass: 'group-hover:text-rose-300',
      icon: Gift,
      route: '/reports/detailed/complimentary-non-payable'
    },
    {
      key: 'refunds',
      title: 'İade Detay Raporu',
      desc: 'İptal ve iade edilen ürünlerin masa, adisyon no, işlem tarihi, yetkili personel, ürün adet ve kategori bazlı detaylı dökümü.',
      badge: 'İade Raporu',
      color: 'violet',
      glowClass: 'hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-[0_8px_30px_-5px_rgba(139,92,246,0.3)]',
      iconClass: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
      titleHoverClass: 'group-hover:text-violet-300',
      icon: RefreshCw,
      route: '/reports/detailed/refunds'
    },
    {
      key: 'cancelled',
      title: 'İptal Detay Raporu',
      desc: 'İptal edilen adisyon ürünlerinin masa, adisyon no, işlem tarihi, yetkili personel ve kategori bazlı detaylı dökümü.',
      badge: 'İptal Raporu',
      color: 'amber',
      glowClass: 'hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)]',
      iconClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      titleHoverClass: 'group-hover:text-amber-300',
      icon: XCircle,
      route: '/reports/detailed/cancelled'
    },
    {
      key: 'discounts',
      title: 'Detaylı İndirim Raporu',
      desc: 'Uygulanan adisyon ve ürün indirimlerinin masa, adisyon no, işlem tarihi, yetkili personel ve kategori bazlı detaylı dökümü.',
      badge: 'İndirim Raporu',
      color: 'emerald',
      glowClass: 'hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)]',
      iconClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      titleHoverClass: 'group-hover:text-emerald-300',
      icon: Percent,
      route: '/reports/detailed/discounts'
    }
  ];

  return (
    <div className="w-full px-[50px] py-12 min-h-screen bg-slate-955 dark:bg-slate-955 font-sans relative overflow-hidden flex flex-col justify-start transition-colors duration-300">
      
      {/* 
        PREMIUM DYNAMIC NEON GLOW BLOBS (Glassmorphism Arka Planı)
        Sayfanın arkasında derin buzlu cam yansıması yaratan neon parıltılar.
      */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Sol üst mor/pembe neon küre */}
        <div className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-violet-600/25 to-fuchsia-600/30 blur-[150px] animate-[pulse_10s_infinite_alternate]" />
        
        {/* Sağ alt mavi/turkuaz neon küre */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/25 blur-[150px] animate-[pulse_12s_infinite_alternate]" />
        
        {/* Ortada sarı/amber parıltı */}
        <div className="absolute top-[35%] left-[25%] w-[450px] h-[450px] rounded-full bg-amber-500/5 blur-[130px] opacity-60" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col">
        
        {/* HEADER - formtitle Standart Uyumu */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center">
            <div className="relative me-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-md" />
              <TrendingUp 
                className="relative text-violet-400 dark:text-violet-400"
                style={{ fontSize: '50px', width: '50px', height: '50px' }}
              />
            </div>
            <div>
              <h3 className="mb-0 text-3xl font-extralight text-violet-400 dark:text-violet-400 leading-none uppercase tracking-[0.25em]">
                DETAYLI RAPORLAR
              </h3>
              <h5 className="text-slate-400 dark:text-slate-400 mb-0 text-lg font-medium mt-1.5 leading-relaxed">
                İşletmenizin finansal ve operasyonel derin analiz modüllerine buradan erişebilirsiniz.
              </h5>
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            {/* Geri Dön butonu en sağda, formtitle standardına uygun nötr stil */}
            <button
              onClick={() => router.push(`/${locale}/reports`)}
              className="px-6 py-3 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/10 dark:border-slate-800/80 text-slate-300 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-white/20 dark:hover:bg-slate-900/60 hover:shadow-lg transition-all flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={16} /> Geri Dön
            </button>
          </div>
        </div>

        {/* 
          REPORT CARDS GRID - cardrighticon Standardında Premium Rapor Butonları
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {reportsList.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.key}
                onClick={() => router.push(`/${locale}${r.route}`)}
                className={`bg-white/10 dark:bg-slate-800/20 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 dark:border-slate-800/60 flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer group ${r.glowClass}`}
              >
                <div className="flex-1 pr-4">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    {r.badge}
                  </p>
                  <h3 className={`text-xl font-black text-white leading-snug transition-colors ${r.titleHoverClass}`}>
                    {r.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                    {r.desc}
                  </p>
                </div>
                
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-6 ${r.iconClass}`}>
                  <Icon size={30} />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
