'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';
import { showSwal } from '../../utils/swal';

interface AlertRule {
    id: number;
    eventKey: string;
    isActive: boolean;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    displayMode: 'POPUP' | 'LIST' | 'SILENT';
    thresholdValue?: number;
    targetType: 'USER' | 'ROLE' | 'ALL';
    targetId?: number;
    description?: string;
    createdAt: string;
}

interface User { id: number; firstName: string; lastName: string; }
interface Role { id: number; name: string; }

const EVENT_OPTIONS = [
    { key: 'SALE_CANCELLED', label: 'Adisyon İptal Edildi', hasThreshold: false, category: 'Finansal' },
    { key: 'SALE_DISCOUNT_HIGH', label: 'Yüksek Oran İndirim', hasThreshold: true, thresholdLabel: 'Min. İndirim %', category: 'Finansal' },
    { key: 'DISCOUNT_LIMIT_VIOLATION', label: 'İndirim Limiti Aşıldı', hasThreshold: false, category: 'Finansal' },
    { key: 'SALE_COMPLIMENTARY', label: 'İkram Yapıldı', hasThreshold: false, category: 'Finansal' },
    { key: 'PAYMENT_METHOD_CHANGE', label: 'Ödeme Tipi Değiştirildi', hasThreshold: false, category: 'Finansal' },
    { key: 'END_OF_DAY', label: 'Gün Sonu Kapandı', hasThreshold: false, category: 'Operasyonel' },
    { key: 'PIN_FAIL_LIMIT', label: 'Hatalı PIN Girişi (Limit)', hasThreshold: true, thresholdLabel: 'Min. Deneme Sayısı', category: 'Güvenlik' },
    { key: 'LOGIN_FAIL_LIMIT', label: 'Başarısız Giriş (Limit)', hasThreshold: true, thresholdLabel: 'Min. Deneme Sayısı', category: 'Güvenlik' },
    { key: 'OVERRIDE_USED', label: 'Yetkili Override Kullanıldı', hasThreshold: false, category: 'Güvenlik' },
    { key: 'STOCK_LOW', label: 'Kritik Stok Seviyesi', hasThreshold: true, thresholdLabel: 'Min. Stok Adedi', category: 'Operasyonel' },
    { key: 'KIOSK_CANCEL', label: 'Kiosk Siparişi İptal', hasThreshold: false, category: 'Operasyonel' },
    { key: 'KDS_MESSAGE_ACTIVE', label: "KDS'den Garsona Mesaj", hasThreshold: false, category: 'Operasyonel' },
    { key: 'CASH_DRAWER_OPEN', label: 'Kasa Açıldı', hasThreshold: false, category: 'Finansal' },
    { key: 'CASH_DRAWER_CLOSE', label: 'Kasa Kapandı', hasThreshold: false, category: 'Finansal' },
];

const SEVERITY_CONFIG = {
    CRITICAL: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-500/20', label: 'Kritik', icon: 'fa-triangle-exclamation' },
    WARNING:  { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20', label: 'Uyarı', icon: 'fa-circle-exclamation' },
    INFO:     { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'Bilgi', icon: 'fa-circle-info' },
};

const DISPLAY_CONFIG = {
    POPUP:   { label: 'Popup', icon: 'fa-window-restore', color: 'text-red-500' },
    LIST:    { label: 'Liste', icon: 'fa-list', color: 'text-blue-500' },
    SILENT:  { label: 'Sessiz', icon: 'fa-bell-slash', color: 'text-slate-400' },
};

const EMPTY_FORM = {
    eventKey: 'SALE_CANCELLED',
    severity: 'WARNING' as 'CRITICAL' | 'WARNING' | 'INFO',
    displayMode: 'LIST' as 'POPUP' | 'LIST' | 'SILENT',
    thresholdValue: '' as any,
    targetType: 'ALL' as 'USER' | 'ROLE' | 'ALL',
    targetId: '' as any,
    description: '',
    isActive: true,
};

export function AlertRulesPageClient() {
    const router = useRouter();
    const locale = useLocale();
    const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL;

    const [rules, setRules] = useState<AlertRule[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

    const selectedEvent = EVENT_OPTIONS.find(e => e.key === form.eventKey);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/alerts/rules`, { headers: headers() });
            if (res.ok) setRules(await res.json());
        } finally { setLoading(false); }
    }, []);

    const fetchUsersRoles = useCallback(async () => {
        try {
            const [ur, rr] = await Promise.all([
                fetch(`${API}/users`, { headers: headers() }),
                fetch(`${API}/roles`, { headers: headers() }),
            ]);
            if (ur.ok) setUsers(await ur.json());
            if (rr.ok) setRoles(await rr.json());
        } catch { }
    }, []);

    useEffect(() => { fetchRules(); fetchUsersRoles(); }, []);

    const openNew = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
    const openEdit = (r: AlertRule) => {
        setEditingId(r.id);
        setForm({
            eventKey: r.eventKey, severity: r.severity, displayMode: r.displayMode,
            thresholdValue: r.thresholdValue ?? '', targetType: r.targetType,
            targetId: r.targetId ?? '', description: r.description ?? '', isActive: r.isActive,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.eventKey) return;
        setSaving(true);
        try {
            const body = {
                ...form,
                thresholdValue: form.thresholdValue !== '' ? Number(form.thresholdValue) : null,
                targetId: form.targetId !== '' ? Number(form.targetId) : null,
            };
            const url = editingId ? `${API}/alerts/rules/${editingId}` : `${API}/alerts/rules`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
            if (!res.ok) throw new Error('Kayıt başarısız');
            await fetchRules();
            setShowModal(false);
            showSwal({ icon: 'success', title: editingId ? 'Kural güncellendi' : 'Kural oluşturuldu', timer: 1500, showConfirmButton: false });
        } catch (e: any) {
            showSwal({ icon: 'error', title: 'Hata', text: e.message });
        } finally { setSaving(false); }
    };

    const handleToggle = async (id: number) => {
        await fetch(`${API}/alerts/rules/${id}/toggle`, { method: 'PATCH', headers: headers() });
        fetchRules();
    };

    const handleDelete = async (id: number) => {
        const r = await showSwal({ icon: 'warning', title: 'Kuralı sil?', text: 'Bu işlem geri alınamaz.', showCancelButton: true, confirmButtonText: 'Sil' });
        if (!r.isConfirmed) return;
        await fetch(`${API}/alerts/rules/${id}`, { method: 'DELETE', headers: headers() });
        fetchRules();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                            <i className="fat fa-bell text-violet-600 dark:text-violet-400 text-lg" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-900 dark:text-white">Bildirim Kuralları</h1>
                            <p className="text-xs text-slate-400">Parametrik uyarı ve bildirim yönetimi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            id="alert-new-rule-btn"
                            onClick={openNew}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 text-sm font-bold transition"
                        >
                            <i className="fat fa-plus" /> Yeni Kural
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/dashboard`)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                            <i className="fat fa-house" /> Ana Menü
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Kategori gruplu kural listesi */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400">
                        <i className="fat fa-spinner-third animate-spin text-3xl mr-3 text-violet-500" />
                        <span className="font-semibold">Yükleniyor...</span>
                    </div>
                ) : rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <i className="fat fa-bell-slash text-5xl mb-4 text-slate-300 dark:text-slate-700" />
                        <p className="text-lg font-bold mb-1">Henüz kural yok</p>
                        <p className="text-sm mb-6">Bildirim kanallarını yapılandırmak için yeni bir kural ekleyin.</p>
                        <button onClick={openNew} className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold shadow hover:bg-violet-700 transition">
                            <i className="fat fa-plus mr-2" /> İlk Kuralı Ekle
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="text-left px-5 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Olay</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Seviye</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Görüntüleme</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Eşik</th>
                                    <th className="text-left px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Hedef</th>
                                    <th className="text-center px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">Durum</th>
                                    <th className="text-right px-5 py-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rules.map(rule => {
                                    const sev = SEVERITY_CONFIG[rule.severity];
                                    const disp = DISPLAY_CONFIG[rule.displayMode];
                                    const evOpt = EVENT_OPTIONS.find(e => e.key === rule.eventKey);
                                    return (
                                        <tr key={rule.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${!rule.isActive ? 'opacity-50' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{evOpt?.label || rule.eventKey}</p>
                                                {rule.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{rule.description}</p>}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${sev.bg} ${sev.color}`}>
                                                    <i className={`fat ${sev.icon} text-xs`} /> {sev.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${disp.color}`}>
                                                    <i className={`fat ${disp.icon} text-xs`} /> {disp.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                                                {rule.thresholdValue != null ? `≥ ${rule.thresholdValue}` : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                                                {rule.targetType === 'ALL' && <span className="text-slate-400">Herkes</span>}
                                                {rule.targetType === 'ROLE' && <span><i className="fat fa-users mr-1 text-slate-400" />Rol #{rule.targetId}</span>}
                                                {rule.targetType === 'USER' && <span><i className="fat fa-user mr-1 text-slate-400" />Kullanıcı #{rule.targetId}</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button
                                                    onClick={() => handleToggle(rule.id)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${rule.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => openEdit(rule)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-violet-600 transition" title="Düzenle">
                                                        <i className="fat fa-pen-to-square text-sm" />
                                                    </button>
                                                    <button onClick={() => handleDelete(rule.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition" title="Sil">
                                                        <i className="fat fa-trash text-sm" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                                    <i className="fat fa-bell text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 dark:text-white text-base">{editingId ? 'Kuralı Düzenle' : 'Yeni Kural'}</h2>
                                    <p className="text-xs text-slate-400">Bildirim tetikleyici tanımla</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-xl">
                                <i className="fat fa-times" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Olay */}
                            <div>
                                <SearchableSelect
                                    value={form.eventKey}
                                    onChange={val => setForm(p => ({ ...p, eventKey: val }))}
                                    options={EVENT_OPTIONS.map(e => ({
                                        value: e.key,
                                        label: e.label,
                                        category: e.category
                                    }))}
                                />
                            </div>

                            {/* Eşik (opsiyonel) */}
                            {selectedEvent?.hasThreshold && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">{selectedEvent.thresholdLabel}</label>
                                    <input id="alert-form-threshold" type="number" value={form.thresholdValue} onChange={e => setForm(p => ({ ...p, thresholdValue: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                        placeholder="Örn: 15" />
                                </div>
                            )}

                            {/* Seviye + Görüntüleme */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <SearchableSelect
                                        value={form.severity}
                                        onChange={val => setForm(p => ({ ...p, severity: val as any }))}
                                        options={[
                                            { value: 'CRITICAL', label: '🔴 Kritik' },
                                            { value: 'WARNING', label: '🟡 Uyarı' },
                                            { value: 'INFO', label: '🔵 Bilgi' }
                                        ]}
                                    />
                                </div>
                                <div>
                                    <SearchableSelect
                                        value={form.displayMode}
                                        onChange={val => setForm(p => ({ ...p, displayMode: val as any }))}
                                        options={[
                                            { value: 'POPUP', label: 'Popup' },
                                            { value: 'LIST', label: 'Liste' },
                                            { value: 'SILENT', label: 'Sessiz' }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Hedef */}
                            <div>
                                <SearchableSelect
                                    value={form.targetType}
                                    onChange={val => setForm(p => ({ ...p, targetType: val as any, targetId: '' }))}
                                    options={[
                                        { value: 'ALL', label: 'Herkes (Tüm yetkili kullanıcılar)' },
                                        { value: 'ROLE', label: 'Role Göre' },
                                        { value: 'USER', label: 'Belirli Kullanıcı' }
                                    ]}
                                />
                                {form.targetType === 'ROLE' && (
                                    <SearchableSelect
                                        value={form.targetId.toString()}
                                        onChange={val => setForm(p => ({ ...p, targetId: val }))}
                                        options={[
                                            { value: '', label: 'Rol Seç...' },
                                            ...roles.map(r => ({ value: r.id.toString(), label: r.name }))
                                        ]}
                                    />
                                )}
                                {form.targetType === 'USER' && (
                                    <SearchableSelect
                                        value={form.targetId.toString()}
                                        onChange={val => setForm(p => ({ ...p, targetId: val }))}
                                        options={[
                                            { value: '', label: 'Kullanıcı Seç...' },
                                            ...users.map(u => ({ value: u.id.toString(), label: `${u.firstName} ${u.lastName}` }))
                                        ]}
                                    />
                                )}
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Açıklama (isteğe bağlı)</label>
                                <input id="alert-form-desc" type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                    placeholder="Kural için kısa açıklama..." />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setShowModal(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                <i className="fat fa-times" /> İptal
                            </button>
                            <button id="alert-form-save-btn" onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition disabled:opacity-50">
                                <i className={`fat ${saving ? 'fa-spinner-third animate-spin' : 'fa-save'}`} />
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
