'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Key, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

interface LicenseContextType {
  isValid: boolean;
  modules: string[];
  daysOffline: number;
  loading: boolean;
  refreshLicense: () => void;
  /** Belirtilen modülün aktif olup olmadığını kontrol eder. Lisans yokken false döner. */
  hasModule: (moduleKey: string) => boolean;
}

const LicenseContext = createContext<LicenseContextType>({} as LicenseContextType);

export const LicenseProvider = ({ children }: { children: React.ReactNode }) => {
  const [isValid, setIsValid] = useState(true); // Default to true while checking
  const [modules, setModules] = useState<string[]>([]);
  const [daysOffline, setDaysOffline] = useState(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Activation form state
  const [licenseKey, setLicenseKey] = useState('');
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050';

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/licenses/status`);
      setIsValid(res.data.isValid);
      setModules(res.data.modules || []);
      setDaysOffline(res.data.daysOffline || 0);
      setReason(res.data.reason || '');
    } catch (err) {
      console.error('License check failed:', err);
      // Backend not running?
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    
    setActLoading(true);
    setActError('');
    try {
      await axios.post(`${API_URL}/licenses/activate`, { key: licenseKey.trim() });
      await fetchStatus();
    } catch (err: any) {
      setActError(err.response?.data?.message || 'Aktivasyon başarısız oldu.');
    } finally {
      setActLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-100 flex-col gap-4">
        <Cpu className="w-12 h-12 text-blue-500 animate-pulse" />
        <p className="text-sm font-medium tracking-wide">Sistem Başlatılıyor...</p>
      </div>
    );
  }

  // Eğer lisans GEÇERSİZ ise, uygulamayı TAMAMEN kitleyip sadece bu ekranı gösterir
  if (!isValid) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-[#0a192f] to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-purple-600/10 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
            <ShieldAlert className="w-8 h-8 text-blue-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-center text-white mb-2">Lisans Geçersiz</h1>
          <p className="text-slate-400 text-center mb-8 text-sm">
            {reason || 'Uygulamayı kullanmaya devam etmek için lütfen geçerli bir lisans anahtarı giriniz.'}
          </p>

          <form onSubmit={handleActivate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Lisans Anahtarı</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="PNTX-..."
                  className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none font-mono tracking-wider"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  disabled={actLoading}
                />
              </div>
            </div>

            {actError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {actError}
              </div>
            )}

            <button
              type="submit"
              disabled={actLoading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-white font-medium bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Doğrulanıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Lisansı Aktifleştir
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-500">
              Antigravity POS v1.0 • Lisans Yönetim Sistemi
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasModule = (moduleKey: string): boolean => {
    if (!isValid) return false;
    return modules.includes(moduleKey);
  };

  return (
    <LicenseContext.Provider value={{ isValid, modules, daysOffline, loading, refreshLicense: fetchStatus, hasModule }}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => useContext(LicenseContext);
