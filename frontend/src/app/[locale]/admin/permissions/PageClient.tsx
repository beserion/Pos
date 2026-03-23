'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Action = 'VIEW' | 'ADD' | 'EDIT' | 'DELETE' | 'PRINT' | 'APPROVE';

const ALL_ACTIONS: Action[] = ['VIEW', 'ADD', 'EDIT', 'DELETE', 'PRINT', 'APPROVE'];

const ACTION_META: Record<Action, { icon: string; label: string; color: string; bg: string }> = {
    VIEW:    { icon: 'fa-eye',          label: 'Görüntüle', color: 'text-sky-600',     bg: 'bg-sky-500/10 border-sky-300' },
    ADD:     { icon: 'fa-plus',         label: 'Ekle',      color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-300' },
    EDIT:    { icon: 'fa-pen',          label: 'Düzenle',   color: 'text-amber-600',   bg: 'bg-amber-500/10 border-amber-300' },
    DELETE:  { icon: 'fa-trash',        label: 'Sil',       color: 'text-rose-600',    bg: 'bg-rose-500/10 border-rose-300' },
    PRINT:   { icon: 'fa-print',        label: 'Yazdır',    color: 'text-purple-600',  bg: 'bg-purple-500/10 border-purple-300' },
    APPROVE: { icon: 'fa-circle-check', label: 'Onayla',    color: 'text-pink-600',    bg: 'bg-pink-500/10 border-pink-300' },
};

// Backend DTO shape
interface PermModuleDTO {
    id?: number;
    key: string;
    label: string;
    icon: string;
    color: string;
    accentBg: string;
    actions: string;   // comma-separated in DB
    sortOrder: number;
}

// Frontend shape (actions as array)
interface PermModule extends Omit<PermModuleDTO, 'actions'> {
    id?: number;
    actions: Action[];
}

const COLOR_OPTIONS = [
    { label: 'Mavi',       color: 'text-blue-500',    bg: 'bg-blue-500/10'    },
    { label: 'İndigo',     color: 'text-indigo-500',  bg: 'bg-indigo-500/10'  },
    { label: 'Cyan',       color: 'text-cyan-500',    bg: 'bg-cyan-500/10'    },
    { label: 'Yeşil',      color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Koyu Yeşil', color: 'text-green-500',   bg: 'bg-green-500/10'   },
    { label: 'Limon',      color: 'text-lime-600',    bg: 'bg-lime-500/10'    },
    { label: 'Teal',       color: 'text-teal-500',    bg: 'bg-teal-500/10'    },
    { label: 'Amber',      color: 'text-amber-500',   bg: 'bg-amber-500/10'   },
    { label: 'Turuncu',    color: 'text-orange-500',  bg: 'bg-orange-500/10'  },
    { label: 'Sarı',       color: 'text-yellow-600',  bg: 'bg-yellow-500/10'  },
    { label: 'Mor',        color: 'text-purple-500',  bg: 'bg-purple-500/10'  },
    { label: 'Pembe',      color: 'text-pink-500',    bg: 'bg-pink-500/10'    },
    { label: 'Koyu Pembe', color: 'text-pink-600',    bg: 'bg-pink-600/10'    },
    { label: 'Kırmızı',    color: 'text-rose-500',    bg: 'bg-rose-500/10'    },
    { label: 'Koyu Kırmızı', color: 'text-red-500',  bg: 'bg-red-500/10'     },
    { label: 'Gri',        color: 'text-slate-500',   bg: 'bg-slate-500/10'   },
    { label: 'Koyu Gri',   color: 'text-slate-700',   bg: 'bg-slate-500/10'   },
];

const emptyForm = (): PermModule => ({
    key: '', label: '', icon: 'fa-cube',
    color: 'text-blue-500', accentBg: 'bg-blue-500/10',
    actions: ['VIEW'], sortOrder: 99
});

// Map between DTO and frontend model
const toModel = (dto: PermModuleDTO): PermModule => ({
    ...dto,
    actions: dto.actions
        ? dto.actions.split(',').map(s => s.trim()).filter(Boolean) as Action[]
        : [],
});

const toDTO = (m: PermModule): PermModuleDTO => ({
    ...m,
    actions: m.actions.join(','),
});

// ─── Component ─────────────────────────────────────────────────────────────────

export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const { user: currentUser } = useAuth();

    const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3050' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050'));

    const [modules, setModules] = useState<PermModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<PermModule>(emptyForm());

    const getConfig = () => ({
        headers: { Authorization: `Bearer ${currentUser?.token}` }
    });

    // ── Load ─────────────────────────────────────────────────────────────────
    const fetchModules = async () => {
        if (!currentUser?.token) return;
        setLoading(true);
        try {
            const res = await axios.get<PermModuleDTO[]>(`${API_URL}/permission-modules`, getConfig());
            setModules(res.data.map(toModel));
        } catch {
            showSwal({ title: 'Hata', text: 'Yetki kalemleri yüklenemedi.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.token) fetchModules();
    }, [currentUser]);

    // ── Modal ─────────────────────────────────────────────────────────────────
    const openNew = () => {
        setForm({ ...emptyForm(), sortOrder: modules.length + 1 });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const openEdit = (mod: PermModule) => {
        setForm({ ...mod });
        setEditingId(mod.id ?? null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.key.trim() || !form.label.trim()) {
            showSwal({ title: 'Hata', text: 'Modül kodu ve adı zorunludur.', icon: 'warning' });
            return;
        }
        if (form.actions.length === 0) {
            showSwal({ title: 'Uyarı', text: 'En az bir aksiyon seçmelisiniz.', icon: 'warning' });
            return;
        }

        const cleanKey = form.key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const dto = toDTO({ ...form, key: cleanKey });

        setSaving(true);
        try {
            if (editingId === null) {
                await axios.post(`${API_URL}/permission-modules`, dto, getConfig());
            } else {
                await axios.put(`${API_URL}/permission-modules/${editingId}`, dto, getConfig());
            }
            toastSwal({ icon: 'success', title: 'Kaydedildi' });
            setIsModalOpen(false);
            fetchModules();
        } catch (err: any) {
            showSwal({ title: 'Hata', text: err?.response?.data?.message || 'Kayıt hatası oluştu.', icon: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (mod: PermModule) => {
        if (!mod.id) return;
        const result = await showSwal({
            title: `"${mod.label}" silinsin mi?`,
            text: 'Bu modül tüm rol/kullanıcı yetki matrislerinden kaldırılacak.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sil', cancelButtonText: 'İptal'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/permission-modules/${mod.id}`, getConfig());
                toastSwal({ icon: 'success', title: 'Silindi' });
                fetchModules();
            } catch {
                showSwal({ title: 'Hata', text: 'Silme işlemi başarısız.', icon: 'error' });
            }
        }
    };

    const resetToDefaults = async () => {
        const result = await showSwal({
            title: 'Varsayılanlara sıfırla?',
            text: 'Tüm kayıtlar silinip fabrika verileri yeniden yüklenecek.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sıfırla', cancelButtonText: 'İptal'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/permission-modules/reset-defaults`, getConfig());
                toastSwal({ icon: 'success', title: 'Varsayılanlara döndürüldü' });
                fetchModules();
            } catch {
                showSwal({ title: 'Hata', text: 'Sıfırlama başarısız.', icon: 'error' });
            }
        }
    };

    const exportJson = () => {
        const blob = new Blob([JSON.stringify(modules, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'permission-modules.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const toggleFormAction = (action: Action) => {
        setForm(prev => ({
            ...prev,
            actions: prev.actions.includes(action)
                ? prev.actions.filter(a => a !== action)
                : [...prev.actions, action]
        }));
    };

    const filtered = modules.filter(m =>
        m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center shrink-0">
                        <i className="fat fa-sliders me-3 text-violet-600 dark:text-violet-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-violet-600 dark:text-violet-400 leading-none uppercase tracking-[0.25em]" id="title">Yetki Kalemleri</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-violet-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Modül ve aksiyon tanımlarını yönetin</h5>
                        </div>
                    </div>

                    {/* Search - centered */}
                    <div className="flex-1 flex justify-center px-6">
                        <div className="w-full max-w-md bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-sm border border-white dark:border-slate-700 flex items-center gap-3">
                            <i className="fat fa-search text-slate-400"></i>
                            <input type="text" placeholder="Modül adı veya kodu ile ara..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white font-bold text-sm placeholder:text-slate-400"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{filtered.length} sonuç</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button onClick={openNew} className="px-5 py-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-violet-100 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Modül
                        </button>
                        <button onClick={exportJson} className="px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-file-export"></i> JSON İndir
                        </button>
                        <button onClick={resetToDefaults} className="px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-rotate-left"></i> Varsayılana Sıfırla
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Toplam Modül',        value: modules.length,                                              icon: 'fa-cubes',         color: 'text-violet-600',  bg: 'bg-violet-500/10' },
                        { label: 'Toplam Yetki Kalemi', value: modules.reduce((s, m) => s + m.actions.length, 0),           icon: 'fa-key',           color: 'text-amber-600',   bg: 'bg-amber-500/10'  },
                        { label: 'Onay Destekli',       value: modules.filter(m => m.actions.includes('APPROVE')).length,  icon: 'fa-circle-check',  color: 'text-pink-600',    bg: 'bg-pink-500/10'   },
                        { label: 'Yazdırma Destekli',   value: modules.filter(m => m.actions.includes('PRINT')).length,    icon: 'fa-print',         color: 'text-purple-600',  bg: 'bg-purple-500/10' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[28px] border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:scale-[1.02] transition-all">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stat.value}</h3>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                                <i className={`fat ${stat.icon} text-2xl`}></i>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cards */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
                            {filtered.map(mod => (
                                <div key={mod.id || mod.key} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-[28px] border border-white dark:border-slate-700 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all group relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-[28px] ${mod.accentBg.replace('/10', '/60')}`}></div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl ${mod.accentBg} flex items-center justify-center ${mod.color} shrink-0`}>
                                                    <i className={`fat ${mod.icon} text-xl`}></i>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 dark:text-white text-base leading-tight">{mod.label}</p>
                                                    <code className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg mt-1 inline-block">{mod.key}</code>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 w-7 h-7 rounded-xl flex items-center justify-center shrink-0">#{mod.sortOrder}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            {ALL_ACTIONS.map(action => {
                                                const supported = mod.actions.includes(action);
                                                const meta = ACTION_META[action];
                                                return (
                                                    <span key={action} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all
                                                        ${supported ? `${meta.bg} ${meta.color}` : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 line-through'}`}>
                                                        <i className={`fat ${meta.icon}`}></i>{meta.label}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <button onClick={() => openEdit(mod)} className="flex-1 py-2.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 border border-violet-200 dark:border-violet-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-100 transition-colors flex items-center justify-center gap-1.5">
                                                <i className="fat fa-pen text-sm"></i> Düzenle
                                            </button>
                                            <button onClick={() => handleDelete(mod)} className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-200 dark:border-rose-500/20 rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center">
                                                <i className="fat fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button onClick={openNew} className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl rounded-[28px] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/30 transition-all group flex flex-col items-center justify-center gap-3 p-8 min-h-[180px]">
                                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
                                    <i className="fat fa-plus text-xl"></i>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 group-hover:text-violet-500 uppercase tracking-widest transition-colors">Yeni Modül Ekle</span>
                            </button>

                            {filtered.length === 0 && searchTerm && (
                                <div className="col-span-full py-16 text-center text-slate-400">
                                    <i className="fat fa-magnifying-glass text-4xl mb-3 opacity-30 block"></i>
                                    <p className="font-bold text-sm">"<strong>{searchTerm}</strong>" için sonuç bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Upsert Modal ─────────────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-900 rounded-[36px] w-full max-w-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[95vh]">

                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/50 shrink-0 rounded-t-[36px]">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tight mb-0">
                                    <i className={`fat ${editingId === null ? 'fa-plus-circle' : 'fa-pen'} text-violet-600`}></i>
                                    {editingId === null ? 'Yeni Modül' : 'Modülü Düzenle'}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Yetki matrisinde görünecek modülü tanımlayın</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all">&times;</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Modül Kodu *</label>
                                    <div className="relative">
                                        <i className="fat fa-code absolute left-3.5 top-3.5 text-violet-400 text-sm"></i>
                                        <input type="text" value={form.key}
                                            onChange={e => setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                                            placeholder="ORDERS, FINANCE..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-black text-sm focus:ring-4 focus:ring-violet-500/10 outline-none tracking-widest"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1 px-1">Büyük harf, rakam ve _ kullanın</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Görünen Ad *</label>
                                    <div className="relative">
                                        <i className="fat fa-tag absolute left-3.5 top-3.5 text-violet-400 text-sm"></i>
                                        <input type="text" value={form.label}
                                            onChange={e => setForm({ ...form, label: e.target.value })}
                                            placeholder="Sipariş Yönetimi..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-violet-500/10 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Font Awesome İkon</label>
                                    <div className="relative">
                                        <div className={`absolute left-3.5 top-3.5 ${form.color}`}><i className={`fat ${form.icon} text-sm`}></i></div>
                                        <input type="text" value={form.icon}
                                            onChange={e => setForm({ ...form, icon: e.target.value })}
                                            placeholder="fa-clipboard-list"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-violet-500/10 outline-none font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sıra No</label>
                                    <div className="relative">
                                        <i className="fat fa-sort-numeric-up absolute left-3.5 top-3.5 text-violet-400 text-sm"></i>
                                        <input type="number" value={form.sortOrder}
                                            onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 99 })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-sm focus:ring-4 focus:ring-violet-500/10 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Renk</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_OPTIONS.map(opt => (
                                        <button key={opt.color} type="button" onClick={() => setForm({ ...form, color: opt.color, accentBg: opt.bg })} title={opt.label}
                                            className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-110 ${opt.bg} ${form.color === opt.color ? 'border-slate-700 dark:border-white scale-110 shadow-md' : 'border-transparent'}`}>
                                            <i className={`fat fa-circle text-sm ${opt.color}`}></i>
                                        </button>
                                    ))}
                                </div>
                                <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2.5 ${form.accentBg} rounded-xl`}>
                                    <i className={`fat ${form.icon} ${form.color}`}></i>
                                    <span className={`text-xs font-black uppercase tracking-widest ${form.color}`}>{form.label || 'Önizleme'}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    Desteklenen Aksiyonlar *
                                    <span className="ml-2 font-bold normal-case text-slate-300 tracking-normal">({form.actions.length} seçili)</span>
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {ALL_ACTIONS.map(action => {
                                        const meta = ACTION_META[action];
                                        const selected = form.actions.includes(action);
                                        return (
                                            <button key={action} type="button" onClick={() => toggleFormAction(action)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all hover:scale-[1.02]
                                                    ${selected ? `${meta.bg} ${meta.color}` : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'}`}>
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selected ? 'bg-white/50 shadow-sm' : 'bg-white dark:bg-slate-700'}`}>
                                                    <i className={`fat ${meta.icon} text-sm ${selected ? meta.color : 'text-slate-300'}`}></i>
                                                </div>
                                                <span className="font-black text-xs uppercase tracking-widest">{meta.label}</span>
                                                {selected && <i className="fat fa-check text-[10px] ml-auto"></i>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center rounded-b-[36px] bg-slate-50/80 dark:bg-slate-900/50">
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">İptal</button>
                            <button onClick={handleSave} disabled={saving} className="px-12 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100 flex items-center gap-2">
                                {saving ? <><i className="fat fa-spinner animate-spin"></i> Kaydediliyor...</> : <><i className="fat fa-check"></i> Kaydet</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
