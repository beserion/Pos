'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../app/[locale]/AuthContext';

interface BusinessDayStatus {
    activeBusinessDate: string;
    realDate: string;
    realDateTime: string;
    lastEndOfDay: { date: string; closedAt: string; zReportId: number } | null;
    openShiftCount: number;
    openShifts: {
        id: number; userId: number; userName: string;
        cashRegisterId: number; cashRegisterName: string;
        openedAt: string; businessDate: string;
    }[];
    openTableCount: number;
    openSaleCount: number;
    dateDiff: number;
    needsRollover: boolean;
    closedDayQueue: string[];
    hasIssues: boolean;
    canAccessSales: boolean;
    shiftSystemEnabled: boolean;
}

interface BusinessDayGuardProps {
    apiUrl: string;
    onReady: () => void;
}

type Screen = 'loading' | 'status' | 'rollover' | 'end-of-day' | 'ready';

export default function BusinessDayGuard({ apiUrl, onReady }: BusinessDayGuardProps) {
    const { user, hasPermission } = useAuth();
    const [screen, setScreen] = useState<Screen>('loading');
    const [status, setStatus] = useState<BusinessDayStatus | null>(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Rollover wizard state
    const [rolloverQueue, setRolloverQueue] = useState<string[]>([]);
    const [rolloverIndex, setRolloverIndex] = useState(0);
    const [rolloverNote, setRolloverNote] = useState('');
    const [rolloverIsClosed, setRolloverIsClosed] = useState(true);

    // Erken gün sonu onayı
    const [showFutureConfirm, setShowFutureConfirm] = useState(false);
    const [futureConfirmMsg, setFutureConfirmMsg] = useState('');

    // Aynı tarihte devam onayı
    const [showContinueModal, setShowContinueModal] = useState(false);
    const [continueNote, setContinueNote] = useState('');

    const token = user?.token || (typeof localStorage !== 'undefined' && localStorage.getItem('token'));
    const headers: any = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (user && token) {
            checkBusinessDay();
        }
    }, [user]);

    const checkBusinessDay = async () => {
        setScreen('loading');
        setError('');

        try {
            const res = await fetch(`${apiUrl}/business-day/status`, { headers });
            if (!res.ok) {
                // API henüz hazır değilse veya endpoint yoksa POS'a geçişe izin ver
                console.warn('BusinessDayGuard: status endpoint erişilemedi, POS\'a geçiş izni veriliyor.');
                setScreen('ready');
                onReady();
                return;
            }

            const data: BusinessDayStatus = await res.json();
            setStatus(data);

            if (data.needsRollover && data.closedDayQueue.length > 0) {
                // Önce mevcut gün kapanış kontrolünü göster
                setRolloverQueue(data.closedDayQueue);
                setRolloverIndex(0);
                setRolloverNote('');
                setScreen('status');
            } else if (data.canAccessSales) {
                setScreen('ready');
                onReady();
            } else {
                setScreen('status');
            }
        } catch (err) {
            console.error('BusinessDayGuard check error:', err);
            // Hata durumunda POS'a geçişe izin ver
            setScreen('ready');
            onReady();
        }
    };

    // ─── Gün sonu al ──────────────────────────────────────────────
    const handleEndOfDay = async (force: boolean = false) => {
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/business-day/end-of-day`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    note: force ? 'Erken gün sonu (onaylandı)' : 'POS açılış öncesi gün sonu',
                    force: force
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setShowFutureConfirm(false);
                await checkBusinessDay();
            } else {
                if (data.message && data.message.startsWith('CONFIRM_FUTURE_DATE|')) {
                    const msg = data.message.split('|')[1];
                    setFutureConfirmMsg(msg);
                    setShowFutureConfirm(true);
                } else {
                    setError(data.message || 'Gün sonu alınamadı.');
                }
            }
        } catch (err: any) {
            setError('Gün sonu işleminde hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Kapalı gün devri ─────────────────────────────────────────
    const handleRollover = async () => {
        if (!rolloverQueue[rolloverIndex]) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/business-day/rollover-closed-day`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessDate: rolloverQueue[rolloverIndex],
                    isClosed: rolloverIsClosed,
                    note: rolloverNote || 'Kapalı gün',
                }),
            });

            if (res.ok) {
                if (rolloverIndex + 1 < rolloverQueue.length) {
                    // Sıradaki gün
                    setRolloverIndex((prev) => prev + 1);
                    setRolloverNote('');
                    setRolloverIsClosed(true);
                } else {
                    // Tüm devir tamamlandı
                    await checkBusinessDay();
                }
            } else {
                const errData = await res.json();
                setError(errData.message || 'Kapalı gün devri başarısız.');
            }
        } catch (err: any) {
            setError('Kapalı gün devri sırasında hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Aynı tarihte devam et ────────────────────────────────────
    const handleContinueSameDate = async () => {
        if (!continueNote || continueNote.trim().length < 3) {
            setError('Açıklama en az 3 karakter olmalıdır.');
            return;
        }
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/business-day/continue-same-date`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: continueNote }),
            });

            if (res.ok) {
                setShowContinueModal(false);
                setScreen('ready');
                onReady();
            } else {
                const errData = await res.json();
                setError(errData.message || 'İşlem başarısız.');
            }
        } catch {
            setError('İşlem sırasında hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Gerçek Tarihe Dön (Hata Düzeltme) ────────────────────────
    const handleFixDate = async () => {
        if (!status || !status.realDate) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/business-day/technical-date-fix`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    newDate: status.realDate, 
                    note: 'Kullanıcı talebiyle gelecek tarihten gerçek tarihe dönüldü.' 
                }),
            });

            if (res.ok) {
                await checkBusinessDay();
            } else {
                const errData = await res.json();
                setError(errData.message || 'Tarih düzeltme işlemi başarısız oldu.');
            }
        } catch {
            setError('İşlem sırasında sunucuyla iletişim kurulamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (d: string) => {
        if (!d) return '-';
        const date = new Date(d);
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
    };

    const formatDateTime = (d: string) => {
        if (!d) return '-';
        const date = new Date(d);
        return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // ─── LOADING ──────────────────────────────────────────────────
    if (screen === 'loading') {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-indigo-500"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className="fat fa-calendar-check text-indigo-400 text-2xl"></i>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-white/80 font-bold text-sm uppercase tracking-widest">İş Günü Kontrol Ediliyor</p>
                        <p className="text-white/40 text-xs mt-1">Program tarihi ve kapanış durumu doğrulanıyor...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── READY ────────────────────────────────────────────────────
    if (screen === 'ready') return null;

    // ─── STATUS — Sorun var ───────────────────────────────────────
    if (screen === 'status' && status) {
        const isAuthorized = hasPermission('business_day.continue_same_date') ||
            user?.role?.name === 'Admin' || user?.role?.name === 'Süper Admin';

        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto">
                {/* Ambient */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none"></div>

                <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 my-auto overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                                <i className="fat fa-triangle-exclamation text-3xl text-white"></i>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Açılış Kontrol Ekranı</h2>
                                <p className="text-amber-100 text-sm font-medium">Önceki çalışma günü kapatılmamış</p>
                            </div>
                        </div>
                    </div>

                    {/* Bilgiler */}
                    <div className="p-8 space-y-4">
                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-bold">
                                <i className="fat fa-circle-exclamation mr-2"></i>{error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <InfoCard icon="fa-calendar" color="indigo" label="Aktif Program Tarihi" value={formatDate(status.activeBusinessDate)} />
                            <InfoCard icon="fa-clock" color="sky" label="Gerçek Sistem Tarihi" value={formatDateTime(status.realDateTime)} />
                            <InfoCard icon="fa-calendar-check" color="emerald" label="Son Başarılı Gün Sonu" value={status.lastEndOfDay ? formatDateTime(status.lastEndOfDay.closedAt) : 'Hiç alınmamış'} />
                            <InfoCard icon="fa-arrow-right-arrow-left" color="amber" label="Tarih Farkı" value={`${status.dateDiff} gün`} />
                            {status.shiftSystemEnabled && (
                                <InfoCard icon="fa-user-clock" color="purple" label="Açık Vardiya" value={`${status.openShiftCount} adet`} />
                            )}
                            <InfoCard icon="fa-utensils" color="rose" label="Açık Masa / Adisyon" value={`${status.openTableCount} masa · ${status.openSaleCount} adisyon`} />
                        </div>

                        {/* Açık vardiya detayları */}
                        {status.shiftSystemEnabled && status.openShifts.length > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl p-4">
                                <p className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">
                                    <i className="fat fa-user-clock mr-1"></i> Açık Vardiyalar
                                </p>
                                {status.openShifts.map((shift) => (
                                    <div key={shift.id} className="flex items-center justify-between py-1.5 text-sm">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{shift.userName}</span>
                                        <span className="text-slate-500 text-xs">{shift.cashRegisterName} · {new Date(shift.openedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* İşlem butonları */}
                        <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                            
                            {/* Gelecek Tarih Hatası (dateDiff < 0) Durumu */}
                            {status.dateDiff < 0 ? (
                                <button
                                    onClick={handleFixDate}
                                    disabled={submitting}
                                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-lg shadow-lg shadow-rose-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                                >
                                    {submitting ? (
                                        <><i className="fas fa-spinner fa-spin mr-2"></i>Düzeltiliyor...</>
                                    ) : (
                                        <><i className="fat fa-clock-rotate-left mr-2"></i>Gerçek Tarihe Dön ({formatDate(status.realDate)})</>
                                    )}
                                </button>
                            ) : (
                                /* Normal İşlemler (dateDiff >= 0) */
                                <>
                                    {/* Eksik kapanışı tamamla (gün sonu al) */}
                                    {status.dateDiff === 0 && (
                                        <button
                                            onClick={() => handleEndOfDay(false)}
                                            disabled={submitting}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                                        >
                                            {submitting ? (
                                                <><i className="fas fa-spinner fa-spin mr-2"></i>İşleniyor...</>
                                            ) : (
                                                <><i className="fat fa-check-double mr-2"></i>Eksik Kapanışı Tamamla</>
                                            )}
                                        </button>
                                    )}

                                    {/* Kapalı gün devrine geç */}
                                    {status.needsRollover && rolloverQueue.length > 0 && (
                                        <button
                                            onClick={() => setScreen('rollover')}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-lg shadow-lg shadow-amber-500/30 transition-all active:scale-[0.98] uppercase tracking-wider"
                                        >
                                            <i className="fat fa-forward mr-2"></i>Kapalı Gün Devrine Geç
                                            <span className="text-amber-100 text-sm ml-2 font-normal">({rolloverQueue.length} gün)</span>
                                        </button>
                                    )}

                                    {/* Aynı tarihte devam et — sadece yetkili */}
                                    {isAuthorized && (
                                        <button
                                            onClick={() => { setShowContinueModal(true); setContinueNote(''); setError(''); }}
                                            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                        >
                                            <i className="fat fa-arrow-rotate-right mr-2"></i>Aynı Program Tarihinde Devam Et
                                        </button>
                                    )}
                                </>
                            )}

                            <button
                                onClick={() => window.history.back()}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors p-2"
                            >
                                <i className="fat fa-reply mr-1"></i> Geri Dön
                            </button>
                        </div>
                    </div>
                </div>

                {/* Aynı tarihte devam modal */}
                {showContinueModal && (
                    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl border border-white/20 dark:border-slate-700/50 p-8">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fat fa-shield-exclamation text-3xl text-amber-500"></i>
                            </div>
                            <h3 className="text-xl font-black text-center text-slate-800 dark:text-white mb-2">Yetkili Onay Gerekli</h3>
                            <p className="text-sm text-slate-500 text-center mb-6">Bu işlem loglanacaktır. Devam etmek için açıklama giriniz.</p>

                            {error && (
                                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-3 py-2 mb-4 text-rose-600 dark:text-rose-400 text-sm font-bold">
                                    <i className="fat fa-circle-exclamation mr-1"></i>{error}
                                </div>
                            )}

                            <textarea
                                value={continueNote}
                                onChange={(e) => setContinueNote(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-amber-500/20 outline-none transition-shadow resize-none mb-6"
                                placeholder="Neden aynı tarihte devam ediyorsunuz? (zorunlu)"
                                autoFocus
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowContinueModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleContinueSameDate}
                                    disabled={submitting || continueNote.trim().length < 3}
                                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm transition-all disabled:opacity-50"
                                >
                                    {submitting ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fat fa-check mr-1"></i>}
                                    Onayla ve Devam Et
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gelecek tarih onay modal */}
                {showFutureConfirm && (
                    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 transform animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i className="fat fa-calendar-clock text-4xl text-rose-500"></i>
                            </div>
                            <h3 className="text-2xl font-black text-center text-slate-800 dark:text-white mb-3">Erken Gün Sonu?</h3>
                            <p className="text-base text-slate-500 dark:text-slate-400 text-center mb-8 font-medium whitespace-pre-line">
                                {futureConfirmMsg}
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleEndOfDay(true)}
                                    disabled={submitting}
                                    className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-lg shadow-lg shadow-rose-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {submitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fat fa-check-double mr-2"></i>}
                                    Evet, Gün Sonu Al
                                </button>
                                <button
                                    onClick={() => setShowFutureConfirm(false)}
                                    disabled={submitting}
                                    className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-lg transition-all"
                                >
                                    Hayır, Vazgeç
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── ROLLOVER — Kapalı gün devri wizard ───────────────────────
    if (screen === 'rollover') {
        const currentDate = rolloverQueue[rolloverIndex];
        const totalDays = rolloverQueue.length;
        const progress = ((rolloverIndex) / totalDays) * 100;

        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-4">
                {/* Ambient */}
                <div className="absolute top-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse"></div>

                <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-lg shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                                        <i className="fat fa-calendar-xmark text-2xl text-white"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Kapalı Gün Devri</h2>
                                        <p className="text-indigo-200 text-xs font-medium">{rolloverIndex + 1} / {totalDays} gün</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                                    <span className="text-white font-black text-sm">{Math.round(progress)}%</span>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-white/20 rounded-full h-2">
                                <div
                                    className="bg-white rounded-full h-2 transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-3 mb-6 text-rose-600 dark:text-rose-400 text-sm font-bold">
                                <i className="fat fa-circle-exclamation mr-2"></i>{error}
                            </div>
                        )}

                        {/* Tarih kartı */}
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-6 text-center mb-6">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">İşlenecek Tarih</p>
                            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{formatDate(currentDate)}</p>
                        </div>

                        {/* Bu gün kapalı mı? */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">Bu gün kapalı mı?</p>
                                <p className="text-xs text-slate-400">Kapalı gün olarak işaretleyip devredin</p>
                            </div>
                            <button
                                onClick={() => setRolloverIsClosed(!rolloverIsClosed)}
                                className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none ${rolloverIsClosed ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${rolloverIsClosed ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Not alanı */}
                        <div className="mb-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">NOT</label>
                            <textarea
                                value={rolloverNote}
                                onChange={(e) => setRolloverNote(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/20 outline-none transition-shadow resize-none"
                                placeholder="Açıklama girebilirsiniz..."
                            />
                        </div>

                        {/* Butonlar */}
                        <button
                            onClick={handleRollover}
                            disabled={submitting}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider mb-3"
                        >
                            {submitting ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i>İşleniyor...</>
                            ) : (
                                <><i className="fat fa-forward mr-2"></i>Kapat ve Devret</>
                            )}
                        </button>

                        <button
                            onClick={() => setScreen('status')}
                            className="w-full text-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium transition-colors p-2"
                        >
                            <i className="fat fa-reply mr-1"></i> Geri Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// ─── Yardımcı bileşen: Bilgi kartı ──────────────────────────────
function InfoCard({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-100 dark:border-indigo-500/20' },
        sky: { bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-100 dark:border-sky-500/20' },
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-100 dark:border-emerald-500/20' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-100 dark:border-amber-500/20' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-100 dark:border-purple-500/20' },
        rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-100 dark:border-rose-500/20' },
    };
    const c = colorMap[color] || colorMap.indigo;

    return (
        <div className={`${c.bg} border ${c.border} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center text-lg`}>
                <i className={`fat ${icon}`}></i>
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white truncate">{value}</p>
            </div>
        </div>
    );
}
