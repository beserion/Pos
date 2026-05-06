'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { API_URL as API } from '@/lib/apiConfig';



function getToken() {
    return document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] || '';
}

async function api(path: string, method = 'GET', body?: any) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

export function InposPageClient() {
    const router = useRouter();
    const locale = useLocale();

    // Bağlantı formu
    const [serialNo, setSerialNo] = useState('');
    const [listenIp, setListenIp] = useState('0.0.0.0');
    const [port, setPort] = useState(8000);

    // Durum
    const [status, setStatus] = useState<any>(null);
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [keyBlocked, setKeyBlocked] = useState(false);

    const showMsg = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    // Kayıtlı ayarları yükle
    useEffect(() => {
        const load = async () => {
            try {
                const cfg = await api('/inpos/config');
                if (cfg) {
                    setSerialNo(cfg.serialNo || '');
                    setListenIp(cfg.listenIp || '0.0.0.0');
                    setPort(cfg.port || 8000);
                }
            } catch { /* config yoksa skip */ }
            try {
                const s = await api('/inpos/status');
                setStatus(s);
            } catch { /* skip */ }
        };
        load();
    }, []);

    // Bağlan
    const handleConnect = async () => {
        if (!serialNo || serialNo.length !== 12) { showMsg('Sicil no 12 haneli olmalıdır.', 'error'); return; }
        setLoading(true);
        try {
            await api('/inpos/config', 'POST', { serialNo, listenIp, port });
            const res = await api('/inpos/connect', 'POST', { serialNo, listenIp, port });
            setStatus(res.status);
            if (res.success) showMsg('Yazarkasa bağlantısı kuruldu!', 'success');
            else showMsg('Bağlantı kurulamadı. Cihazı ve ağ ayarlarını kontrol edin.', 'error');
        } catch (err: any) { showMsg(err.message, 'error'); }
        setLoading(false);
    };

    // Bağlantıyı Kes
    const handleDisconnect = async () => {
        try {
            await api('/inpos/disconnect', 'POST');
            setStatus({ connected: false });
            showMsg('Bağlantı kesildi.', 'info');
        } catch (err: any) { showMsg(err.message, 'error'); }
    };

    // Kısım bilgilerini çek
    const handleFetchSections = async () => {
        try {
            const data = await api('/inpos/sections');
            setSections(data);
            showMsg('Kısım bilgileri cihazdan çekildi.', 'success');
        } catch (err: any) { showMsg(err.message, 'error'); }
    };

    // X Raporu
    const handleXReport = async () => {
        try {
            const res = await api('/inpos/x-report', 'POST');
            if (res.success) showMsg('X raporu komutu gönderildi.', 'success');
            else showMsg(`X raporu hatası: ${res.error}`, 'error');
        } catch (err: any) { showMsg(err.message, 'error'); }
    };

    // Z Raporu
    const handleZReport = async () => {
        try {
            const res = await api('/inpos/z-report', 'POST');
            if (res.success) showMsg('Z raporu komutu gönderildi.', 'success');
            else showMsg(`Z raporu hatası: ${res.error}`, 'error');
        } catch (err: any) { showMsg(err.message, 'error'); }
    };

    // Tuş Kilitle
    const handleBlockKeys = async () => {
        try {
            const res = await api('/inpos/block-keys', 'POST');
            if (res.success) { setKeyBlocked(true); showMsg('Tuşlar kilitlendi.', 'success'); }
            else showMsg(`Kilitleme hatası: ${res.error}`, 'error');
        } catch (err: any) { showMsg(err.message, 'error'); }
    };

    // Tuş Kilit Aç
    const handleUnblockKeys = async () => {
        try {
            const res = await api('/inpos/unblock-keys', 'POST');
            if (res.success) { setKeyBlocked(false); showMsg('Tuş kilidi açıldı.', 'success'); }
            else showMsg(`Kilit açma hatası: ${res.error}`, 'error');
        } catch (err: any) { showMsg(err.message, 'error'); }
    };

    const ecrStateNames: Record<number, string> = {
        0: 'Başlatılıyor', 1: 'Boşta', 2: 'Kullanılamaz', 3: 'Hata', 4: 'Giriş Ekranı',
        5: 'Satış', 6: 'Faturalı Satış', 7: 'Ana Menü', 8: 'Raporlar', 9: 'Z Raporu Gerekli',
        10: 'Slip Basılıyor', 13: 'Kart İptali', 14: 'Yemek Kartı Seçimi',
    };

    return (
        <div className="flex-1 flex flex-col p-6 md:p-10 w-full min-h-screen bg-slate-50 dark:bg-slate-900 overflow-auto relative">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-2xl backdrop-blur-sm border transition-all animate-[fadeIn_0.3s_ease] ${message.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : message.type === 'error' ? 'bg-red-500/90 text-white border-red-400/50' : 'bg-slate-700/90 text-white border-slate-500/50'}`}>
                    <i className={`fat ${message.type === 'success' ? 'fa-check-circle' : message.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2`}></i>
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push(`/${locale}/integrations`)}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:border-emerald-300 transition-all hover:-translate-x-0.5 shadow-sm"
                    >
                        <i className="fat fa-arrow-left text-sm"></i>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            inPOS Yazarkasa
                        </h1>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Cihaz bağlantısı ve ayarları</p>
                    </div>
                    {/* Connection badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider ${status?.connected ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${status?.connected ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        {status?.connected ? 'Bağlı' : 'Bağlı Değil'}
                    </div>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
                {/* ─── BAĞLANTI AYARLARI ─── */}
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6">
                    <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <i className="fat fa-link text-emerald-500"></i>
                        Bağlantı Ayarları
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cihaz Sicil No</label>
                            <input value={serialNo} onChange={e => setSerialNo(e.target.value.toUpperCase())} maxLength={12} placeholder="12 haneli sicil no"
                                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dinleme IP</label>
                                <input value={listenIp} onChange={e => setListenIp(e.target.value)} placeholder="0.0.0.0"
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Port</label>
                                <input type="number" value={port} onChange={e => setPort(+e.target.value)} placeholder="8000"
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Status info */}
                    {status?.connected && (
                        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-500 font-bold uppercase">Cihaz Durumu</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{ecrStateNames[status.ecrState] || 'Bilinmiyor'}</span>
                            </div>
                            {status.lastZDateTime && (
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500 font-bold uppercase">Son Z Raporu</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">{new Date(status.lastZDateTime).toLocaleString('tr-TR')}</span>
                                </div>
                            )}
                            {status.ecrDateTime && (
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500 font-bold uppercase">Cihaz Saati</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">{new Date(status.ecrDateTime).toLocaleString('tr-TR')}</span>
                                </div>
                            )}
                            {status.saleLimit > 0 && (
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500 font-bold uppercase">Satış Limiti</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">{(status.saleLimit / 100).toFixed(2)} ₺</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 mt-5">
                        <button onClick={handleConnect} disabled={loading}
                            className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <i className="fat fa-spinner-third animate-spin"></i> : <i className="fat fa-plug"></i>}
                            {loading ? 'Bağlanıyor...' : 'Bağlan'}
                        </button>
                        {status?.connected && (
                            <button onClick={handleDisconnect}
                                className="h-11 px-5 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 hover:text-red-500 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 transition-all flex items-center gap-2">
                                <i className="fat fa-unlink"></i> Kes
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── KDV KISIM EŞLEŞTİRME ─── */}
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6">
                    <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <i className="fat fa-percentage text-indigo-500"></i>
                        KDV Kısım Bilgileri
                    </h2>

                    {sections.length > 0 ? (
                        <div className="space-y-2">
                            {sections.map((s: any) => (
                                <div key={s.section} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/40">
                                    <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-500">{s.section}</span>
                                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-300">{s.name || '(Tanımsız)'}</span>
                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">%{(s.vatRate / 100).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                            <i className="fat fa-inbox text-3xl mb-3 block"></i>
                            <p className="text-xs font-bold">Kısım bilgisi yüklenmedi</p>
                            <p className="text-[11px] mt-1">Bağlantı kurduktan sonra bilgileri çekin</p>
                        </div>
                    )}

                    <button onClick={handleFetchSections} disabled={!status?.connected}
                        className="w-full mt-4 h-10 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl border border-indigo-200/60 dark:border-indigo-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                        <i className="fat fa-download"></i> Cihazdan Çek
                    </button>
                </div>

                {/* ─── RAPOR İŞLEMLERİ ─── */}
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6">
                    <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <i className="fat fa-file-chart-column text-amber-500"></i>
                        Rapor İşlemleri
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleXReport} disabled={!status?.connected}
                            className="h-20 bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100 dark:hover:bg-amber-500/10 rounded-xl border border-amber-200/60 dark:border-amber-500/20 flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 group">
                            <i className="fat fa-file-lines text-xl text-amber-500 group-hover:scale-110 transition-transform"></i>
                            <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">X Raporu</span>
                        </button>
                        <button onClick={handleZReport} disabled={!status?.connected}
                            className="h-20 bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-xl border border-red-200/60 dark:border-red-500/20 flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 group">
                            <i className="fat fa-file-signature text-xl text-red-500 group-hover:scale-110 transition-transform"></i>
                            <span className="text-[11px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider">Z Raporu</span>
                        </button>
                    </div>
                </div>

                {/* ─── CİHAZ TUŞ KİLİDİ ─── */}
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-6">
                    <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <i className="fat fa-lock text-rose-500"></i>
                        Cihaz Tuş Kilidi
                    </h2>

                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Yazarkasa tuş takımını kilitleyerek kasiyerin cihaz üzerinden müdahalesini engelleyebilirsiniz. <strong>Önemli:</strong> Entegrasyon sırasında tuşların kilitli olması tavsiye edilir.
                    </p>

                    <div className="flex items-center gap-3">
                        <button onClick={handleBlockKeys} disabled={!status?.connected}
                            className="flex-1 h-11 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl border border-rose-200/60 dark:border-rose-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                            <i className="fat fa-lock"></i> Kilitle
                        </button>
                        <button onClick={handleUnblockKeys} disabled={!status?.connected}
                            className="flex-1 h-11 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                            <i className="fat fa-lock-open"></i> Aç
                        </button>
                    </div>

                    <div className={`mt-3 flex items-center gap-2 text-[11px] font-bold ${keyBlocked ? 'text-rose-500' : 'text-slate-400'}`}>
                        <i className={`fat ${keyBlocked ? 'fa-lock' : 'fa-lock-open'}`}></i>
                        Durum: {keyBlocked ? 'Kilitli' : 'Açık'}
                    </div>
                </div>
            </div>
        </div>
    );
}
