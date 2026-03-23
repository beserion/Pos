'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface CashRegister {
    id: number;
    name: string;
    isActive: boolean;
    zoneIds?: number[];
}

interface ShiftData {
    id: number;
    userId: number;
    cashRegisterId: number;
    businessDate: string;
    openedAt: string;
    closedAt?: string;
    status: string;
    openingCash: number;
    closingCash?: number;
    expectedCash?: number;
    cashDifference?: number;
    note?: string;
    cashRegister?: CashRegister;
    user?: any;
}

interface ShiftManagerProps {
    user: any;
    apiUrl: string;
    onShiftOpen: (shift: ShiftData, cashRegister: CashRegister) => void;
    onShiftClose: () => void;
}

export default function ShiftManager({ user, apiUrl, onShiftOpen, onShiftClose }: ShiftManagerProps) {
    const tc = useTranslations('Common');

    const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
    const [myCashRegister, setMyCashRegister] = useState<CashRegister | null>(null);
    const [loading, setLoading] = useState(true);
    const [openingCash, setOpeningCash] = useState<number>(0);
    const [closingCash, setClosingCash] = useState<number>(0);
    const [closeNote, setCloseNote] = useState('');
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [closeTab, setCloseTab] = useState<'close' | 'transfer'>('close');
    const [targetUserId, setTargetUserId] = useState<number | ''>('');
    const [cashiers, setCashiers] = useState<any[]>([]);

    const [currentBusinessDate, setCurrentBusinessDate] = useState<string>('');
    const [showZReportModal, setShowZReportModal] = useState(false);
    const [zReportData, setZReportData] = useState<any>(null);

    const token = user?.token || (typeof localStorage !== 'undefined' && localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}` };

    // Check active shift on mount
    useEffect(() => {
        if (user && token) {
            checkShiftStatus();
        }
    }, [user]);

    const checkShiftStatus = async () => {
        setLoading(true);
        try {
            // 1. Check for active shift
            const shiftRes = await fetch(`${apiUrl}/shifts/active`, { headers });
            const shiftText = shiftRes.ok ? await shiftRes.text() : '';
            const shiftData = shiftText ? JSON.parse(shiftText) : null;

            // 2. Get my assigned cash register
            const myRegRes = await fetch(`${apiUrl}/cash-registers/my`, { headers });
            const myRegText = myRegRes.ok ? await myRegRes.text() : '';
            const myRegData = myRegText ? JSON.parse(myRegText) : null;

            // 3. Get current business date
            const dateRes = await fetch(`${apiUrl}/shifts/current-business-date`, { headers });
            const dateText = dateRes.ok ? await dateRes.text() : '';
            setCurrentBusinessDate(dateText);

            setActiveShift(shiftData);
            setMyCashRegister(myRegData);

            if (shiftData && shiftData.id) {
                // Has active shift, notify parent
                const reg = shiftData.cashRegister || myRegData;
                if (reg) onShiftOpen(shiftData, reg);
            } else if (myRegData) {
                // No active shift but has assigned register — show open modal
                setShowOpenModal(true);
            } else {
                // No assigned register
                setError('Bu hesaba henüz bir kasa atanmamıştır. Lütfen yöneticinize başvurun.');
            }
        } catch (err) {
            console.error('Shift status check error:', err);
            setError('Vardiya kontrolü sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async () => {
        if (!myCashRegister) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/shifts/open`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cashRegisterId: myCashRegister.id,
                    openingCash: openingCash
                })
            });

            if (res.ok) {
                const shift = await res.json();
                setActiveShift(shift);
                setShowOpenModal(false);
                onShiftOpen(shift, myCashRegister);
            } else {
                const errData = await res.json();
                setError(errData.message || 'Vardiya açılamadı.');
            }
        } catch (err) {
            console.error(err);
            setError('Vardiya açılırken bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        if (!activeShift) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/shifts/${activeShift.id}/close`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    closingCash: closingCash,
                    note: closeNote || undefined
                })
            });

            if (res.ok) {
                const closedShift = await res.json();
                setActiveShift(null);
                setShowCloseModal(false);
                setClosingCash(0);
                setCloseNote('');
                onShiftClose();
                // Show open modal again for new shift
                setShowOpenModal(true);
            } else {
                const errData = await res.json();
                setError(errData.message || 'Vardiya kapatılamadı.');
            }
        } catch (err) {
            console.error(err);
            setError('Vardiya kapatılırken bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTransferShift = async () => {
        if (!activeShift || !targetUserId) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/shifts/${activeShift.id}/transfer`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toUserId: Number(targetUserId),
                    closingCash: closingCash,
                    note: closeNote || undefined
                })
            });

            if (res.ok) {
                setActiveShift(null);
                setShowCloseModal(false);
                setClosingCash(0);
                setCloseNote('');
                setTargetUserId('');
                onShiftClose();
                // Transfer shift auto-opens for the other user.
                // The current user gets logged out implicitly or just sees 'no shift' open.
                // We'll let the user decide. Usually, they might be logged out.
                // Show open modal again for current user just in case they want to open another one (if allowed).
                setShowOpenModal(true);
            } else {
                const errData = await res.json();
                setError(errData.message || 'Vardiya devredilemedi.');
            }
        } catch (err) {
            console.error(err);
            setError('Vardiya devredilirken bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    const openCloseModal = async () => {
        setClosingCash(0);
        setCloseNote('');
        setError('');
        setCloseTab('close');
        setTargetUserId('');
        setShowCloseModal(true);

        // Fetch cashiers for transfer dropdown
        try {
            const res = await fetch(`${apiUrl}/users/cashiers`, { headers });
            if (res.ok) {
                const data = await res.json();
                // Sadece benimle aynı kasada yetkili olan, ve ben olmayan kişileri listele
                const myRegId = myCashRegister?.id || activeShift?.cashRegisterId;
                const filtered = data.filter((c: any) => c.id !== user?.id && c.cashRegisterId === myRegId);
                setCashiers(filtered);
            }
        } catch (err) {
            console.error('Kasiyerler getirilemedi:', err);
        }
    };

    const handleGenerateZReport = async () => {
        if (!myCashRegister || !currentBusinessDate) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/reports/z-reports`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cashRegisterId: myCashRegister.id,
                    businessDate: currentBusinessDate
                })
            });

            if (res.ok) {
                const report = await res.json();
                setZReportData(report);
                setShowOpenModal(false);
                setShowZReportModal(true);
            } else {
                const errData = await res.json();
                setError(errData.message || 'Z-Raporu alınamadı.');
            }
        } catch (err) {
            console.error(err);
            setError('Z-Raporu alınırken bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
                    <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Vardiya kontrol ediliyor...</p>
                </div>
            </div>
        );
    }

    // No assigned register error
    if (error && !showOpenModal && !showCloseModal && !activeShift) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 p-10 text-center">
                    <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fat fa-triangle-exclamation text-4xl text-rose-500"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">Kasa Yetkisi Bulunamadı</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">{error}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        <i className="fat fa-reply mr-2"></i>Geri Dön
                    </button>
                </div>
            </div>
        );
    }

    // Shift Open Modal
    if (showOpenModal && myCashRegister && !activeShift) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                    <div className="p-10 text-center">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fat fa-cash-register text-4xl text-indigo-500"></i>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Vardiya Aç</h2>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200 dark:border-indigo-500/20 mb-6">
                            <i className="fat fa-cash-register text-indigo-500"></i>
                            <span className="font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest text-sm">{myCashRegister.name}</span>
                        </div>

                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-3 mb-6 text-rose-600 dark:text-rose-400 text-sm font-bold">
                                <i className="fat fa-circle-exclamation mr-2"></i>{error}
                            </div>
                        )}

                        <div className="text-left mb-8">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">AÇILIŞ NAKDİ (₺)</label>
                            <div className="relative">
                                <i className="fat fa-money-bill-wave absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/50 text-lg"></i>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={openingCash || ''}
                                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-black text-xl focus:ring-4 focus:ring-indigo-500/20 outline-none transition-shadow"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleOpenShift}
                            disabled={submitting}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider mb-3"
                        >
                            {submitting ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i>Açılıyor...</>
                            ) : (
                                <><i className="fat fa-play mr-2"></i>Vardiyayı Başlat</>
                            )}
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-px bg-slate-200 dark:bg-slate-700/50 flex-1"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">VEYA</span>
                            <div className="h-px bg-slate-200 dark:bg-slate-700/50 flex-1"></div>
                        </div>

                        <button
                            onClick={handleGenerateZReport}
                            disabled={submitting || !currentBusinessDate}
                            className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest mb-3 flex flex-col items-center justify-center gap-1"
                        >
                            <span><i className="fat fa-file-invoice mr-2 text-rose-500"></i>Günü Kapat (Z-Raporu Al)</span>
                            {currentBusinessDate && <span className="text-[10px] text-slate-400 font-normal">İş Günü: {currentBusinessDate}</span>}
                        </button>

                        <button
                            onClick={() => window.history.back()}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors p-2"
                        >
                            {tc('cancel')} · Geri Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Shift Close Modal
    if (showCloseModal && activeShift) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
                    <div className="p-10 text-center">
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl mb-8 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setCloseTab('close')}
                                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all uppercase tracking-widest ${closeTab === 'close' ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                <i className="fat fa-lock mr-2"></i> Kapat
                            </button>
                            <button
                                onClick={() => setCloseTab('transfer')}
                                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all uppercase tracking-widest ${closeTab === 'transfer' ? 'bg-white dark:bg-slate-800 text-orange-500 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                <i className="fat fa-exchange-alt mr-2"></i> Devret
                            </button>
                        </div>
                        
                        <div className={`w-20 h-20 ${closeTab === 'close' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                            <i className={`fat ${closeTab === 'close' ? 'fa-lock' : 'fa-exchange-alt'} text-4xl`}></i>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Vardiya {closeTab === 'close' ? 'Kapat' : 'Devret'}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Açılış: ₺{Number(activeShift.openingCash).toFixed(2)} · {new Date(activeShift.openedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-3 mb-6 text-rose-600 dark:text-rose-400 text-sm font-bold">
                                <i className="fat fa-circle-exclamation mr-2"></i>{error}
                            </div>
                        )}

                        <div className="text-left mb-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{closeTab === 'close' ? 'KAPANIŞ ' : 'DEVİR '} NAKDİ (₺)</label>
                            <div className="relative">
                                <i className={`fat fa-money-bill-wave absolute left-4 top-1/2 -translate-y-1/2 text-lg ${closeTab === 'close' ? 'text-rose-500/50' : 'text-orange-500/50'}`}></i>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={closingCash || ''}
                                    onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-black text-xl focus:ring-4 outline-none transition-shadow ${closeTab === 'close' ? 'focus:ring-rose-500/20' : 'focus:ring-orange-500/20'}`}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {closeTab === 'transfer' && (
                            <div className="text-left mb-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KİME DEVREDİLECEK?</label>
                                <div className="relative">
                                    <i className="fat fa-user absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/50 text-lg"></i>
                                    <select
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-black text-sm focus:ring-4 focus:ring-orange-500/20 outline-none transition-shadow appearance-none cursor-pointer"
                                    >
                                        <option value="">Seçim Yapın...</option>
                                        {cashiers.map(c => (
                                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="text-left mb-8">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">NOT <span className="text-slate-300 normal-case font-normal">(opsiyonel)</span></label>
                            <textarea
                                value={closeNote}
                                onChange={(e) => setCloseNote(e.target.value)}
                                rows={2}
                                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 outline-none transition-shadow resize-none ${closeTab === 'close' ? 'focus:ring-rose-500/20' : 'focus:ring-orange-500/20'}`}
                                placeholder="Açıklama girebilirsiniz..."
                            />
                        </div>

                        {closeTab === 'close' ? (
                            <button
                                onClick={handleCloseShift}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-lg shadow-lg shadow-rose-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider mb-3"
                            >
                                {submitting ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Kapatılıyor...</>
                                ) : (
                                    <><i className="fat fa-lock mr-2"></i>Vardiyayı Kapat</>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleTransferShift}
                                disabled={submitting || !targetUserId}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-lg shadow-lg shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider mb-3"
                            >
                                {submitting ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Devrediliyor...</>
                                ) : (
                                    <><i className="fat fa-exchange-alt mr-2"></i>Vardiyayı Devret</>
                                )}
                            </button>
                        )}

                        <button
                            onClick={() => { setShowCloseModal(false); setError(''); }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors p-2"
                        >
                            {tc('cancel')} · Geri Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Z-Report Successful Modal (Premium details view)
    if (showZReportModal && zReportData) {
        return (
            <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 my-auto">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-8 sm:p-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                                    <i className="fat fa-receipt text-3xl text-white"></i>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight mb-1">Gün Sonu Raporu</h2>
                                    <div className="flex items-center gap-2 text-indigo-100 font-medium">
                                        <i className="fat fa-calendar-day"></i> {zReportData.businessDate}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center min-w-[140px]">
                                <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mb-1">Rapor ID</div>
                                <div className="text-xl font-black text-white font-mono">#{zReportData.id.toString().padStart(6, '0')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 sm:p-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center text-xl">
                                    <i className="fat fa-money-bill-wave"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Toplam Açılış Nakdi</div>
                                    <div className="text-xl font-black text-slate-800 dark:text-white">
                                        ₺{Number(zReportData.totalOpeningCash).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xl">
                                    <i className="fat fa-cash-register"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Beklenen Kapanış Kasa</div>
                                    <div className="text-xl font-black text-slate-800 dark:text-white">
                                        ₺{Number(zReportData.totalExpectedCash).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center text-xl">
                                    <i className="fat fa-sack-dollar"></i>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Kapanış Nakdi (Bildirilen)</div>
                                    <div className="text-xl font-black text-slate-800 dark:text-white">
                                        ₺{Number(zReportData.totalClosingCash).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-3xl p-6 border flex items-center gap-4 ${Number(zReportData.totalCashDifference) === 0 ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800' : Number(zReportData.totalCashDifference) > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20'}`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${Number(zReportData.totalCashDifference) === 0 ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : Number(zReportData.totalCashDifference) > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                    <i className={`fat ${Number(zReportData.totalCashDifference) === 0 ? 'fa-scale-balanced' : Number(zReportData.totalCashDifference) > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Kasa Farkı</div>
                                    <div className={`text-xl font-black ${Number(zReportData.totalCashDifference) === 0 ? 'text-slate-800 dark:text-white' : Number(zReportData.totalCashDifference) > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                        {Number(zReportData.totalCashDifference) > 0 ? '+' : ''}₺{Number(zReportData.totalCashDifference).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Toplam Ciro */}
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl p-6 border-2 border-indigo-100 dark:border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30">
                                    <i className="fat fa-chart-line"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-indigo-500/70 uppercase tracking-widest mb-1">Toplam Ciro (Tüm Ödemeler)</div>
                                    <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400">
                                        ₺{Number(zReportData.totalIncome).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-indigo-600/70 dark:text-indigo-400/70 max-w-[200px] text-center sm:text-right hidden sm:block leading-relaxed">
                                Bu tutar ilgili iş gününde yapılan tüm satışların toplamıdır.
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowZReportModal(false);
                                    window.location.href = '/tr/admin/reports'; // or redirect to login depending on your flow
                                }}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-sm transition-colors"
                            >
                                <i className="fat fa-check mr-2"></i> Kapat
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-colors shadow-lg shadow-indigo-500/30"
                            >
                                <i className="fat fa-print mr-2"></i> Yazdır
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active shift header bar — rendered inside parent via render prop pattern
    if (activeShift) {
        return (
            <>
                {showCloseModal && null}
                {/* Floating shift close button — will be positioned by parent */}
                <button
                    onClick={openCloseModal}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 backdrop-blur-md px-5 py-2.5 rounded-full border border-rose-500/20 shadow-sm active:scale-95"
                >
                    <i className="fat fa-lock text-rose-500"></i> Vardiya Kapat
                </button>
            </>
        );
    }

    return null;
}
