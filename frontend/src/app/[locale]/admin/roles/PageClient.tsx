'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Role {
    id: number;
    name: string;
    description: string;
    permissions?: string[];
}

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role?: { id: number; name: string };
}

// ─── Module / Action Definitions ───────────────────────────────────────────────

type Action = 'VIEW' | 'ADD' | 'EDIT' | 'DELETE' | 'PRINT' | 'APPROVE';

interface ModuleDefinition {
    key: string;
    label: string;
    icon: string;
    color: string;
    accentBg: string;
    actions: Action[];
}

const ACTION_META: Record<Action, { icon: string; label: string; color: string; activeClass: string }> = {
    VIEW:    { icon: 'fa-eye',           label: 'Görüntüle', color: 'text-sky-500',    activeClass: 'bg-sky-500 border-sky-500 text-white' },
    ADD:     { icon: 'fa-plus',          label: 'Ekle',      color: 'text-emerald-500', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
    EDIT:    { icon: 'fa-pen',           label: 'Düzenle',   color: 'text-amber-500',  activeClass: 'bg-amber-500 border-amber-500 text-white' },
    DELETE:  { icon: 'fa-trash',         label: 'Sil',       color: 'text-rose-500',   activeClass: 'bg-rose-500 border-rose-500 text-white' },
    PRINT:   { icon: 'fa-print',         label: 'Yazdır',    color: 'text-purple-500', activeClass: 'bg-purple-500 border-purple-500 text-white' },
    APPROVE: { icon: 'fa-circle-check',  label: 'Onayla',    color: 'text-pink-500',   activeClass: 'bg-pink-500 border-pink-500 text-white' },
};

const ALL_ACTIONS: Action[] = ['VIEW', 'ADD', 'EDIT', 'DELETE', 'PRINT', 'APPROVE'];

// Using dynamically loaded modules from backend instead of a hardcoded MODULES array.

// Yetki anahtarı oluşturur: "ORDERS:VIEW"
const permKey = (mod: string, action: Action) => `${mod}:${action}`;

// ─── Component ─────────────────────────────────────────────────────────────────

export function PageClient() {
    const t = useTranslations('Roles');
    const tc = useTranslations('Common');
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();

    const [roles, setRoles] = useState<Role[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Upsert Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    // Permission Matrix Modal
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [permissionRole, setPermissionRole] = useState<Role | null>(null);
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

    // User Assignment Modal
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    
    // Dynamic permissions modules from backend
    const [modules, setModules] = useState<ModuleDefinition[]>([]);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) fetchRoles();
    }, [user, loading, router]);

    const fetchRoles = async () => {
        try {
            const token = Cookies.get('token');
            const [rolesRes, modulesRes] = await Promise.all([
                axios.get(`${API_URL}/roles`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/permission-modules`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setRoles(rolesRes.data);
            
            // Convert modules
            const backendModules = modulesRes.data.map((m: any) => ({
                key: m.key,
                label: m.label,
                icon: m.icon,
                color: m.color,
                accentBg: m.accentBg,
                actions: m.actions ? m.actions.split(',').map((s: string) => s.trim()).filter(Boolean) : []
            }));
            setModules(backendModules);
            
        } catch (error) {
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        }
    };

    // ── Upsert ────────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };
            if (editingRole) {
                await axios.put(`${API_URL}/roles/${editingRole.id}`, formData, { headers });
            } else {
                await axios.post(`${API_URL}/roles`, formData, { headers });
            }
            toastSwal({ icon: 'success', title: tc('success') });
            setIsModalOpen(false);
            setEditingRole(null);
            setFormData({ name: '', description: '' });
            fetchRoles();
        } catch {
            showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number, name: string) => {
        showSwal({
            title: t('deleteConfirmTitle'),
            text: t('deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('delete'),
            cancelButtonText: tc('cancel')
        }).then(async (result: any) => {
            if (result.isConfirmed) {
                try {
                    const token = Cookies.get('token');
                    await axios.delete(`${API_URL}/roles/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    toastSwal({ icon: 'success', title: tc('delete') });
                    fetchRoles();
                } catch {
                    showSwal({ title: tc('error'), text: t('deleteError'), icon: 'error' });
                }
            }
        });
    };

    const openModal = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            setFormData({ name: role.name, description: role.description });
        } else {
            setEditingRole(null);
            setFormData({ name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    // ── Permission Matrix ─────────────────────────────────────────────────────
    const openPermissionModal = (role: Role) => {
        setPermissionRole(role);
        setSelectedPerms(role.permissions || []);
        setIsPermissionModalOpen(true);
    };

    const togglePerm = (mod: string, action: Action) => {
        const key = permKey(mod, action);
        setSelectedPerms(prev =>
            prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
        );
    };

    // Tüm satır yetkilerini toggle et
    const toggleRowAll = (mod: ModuleDefinition) => {
        const keys = mod.actions.map(a => permKey(mod.key, a));
        const allSelected = keys.every(k => selectedPerms.includes(k));
        if (allSelected) {
            setSelectedPerms(prev => prev.filter(p => !keys.includes(p)));
        } else {
            setSelectedPerms(prev => [...new Set([...prev, ...keys])]);
        }
    };

    // Tüm kolon yetkilerini toggle et
    const toggleColAll = (action: Action) => {
        const eligibleModules = modules.filter(m => m.actions.includes(action));
        const keys = eligibleModules.map(m => permKey(m.key, action));
        const allSelected = keys.every(k => selectedPerms.includes(k));
        if (allSelected) {
            setSelectedPerms(prev => prev.filter(p => !keys.includes(p)));
        } else {
            setSelectedPerms(prev => [...new Set([...prev, ...keys])]);
        }
    };

    // Tüm yetkileri toggle et
    const toggleAll = () => {
        const allKeys = modules.flatMap(m => m.actions.map(a => permKey(m.key, a)));
        const allSelected = allKeys.every(k => selectedPerms.includes(k));
        setSelectedPerms(allSelected ? [] : allKeys);
    };

    const savePermissions = async () => {
        if (!permissionRole) return;
        try {
            const token = Cookies.get('token');
            await axios.put(`${API_URL}/roles/${permissionRole.id}`, {
                ...permissionRole,
                permissions: selectedPerms
            }, { headers: { Authorization: `Bearer ${token}` } });
            toastSwal({ icon: 'success', title: tc('success') });
            setIsPermissionModalOpen(false);
            fetchRoles();
        } catch {
            showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
        }
    };

    // ── User Assignment ───────────────────────────────────────────────────────
    const openUserModal = async (role: Role) => {
        setPermissionRole(role);
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllUsers(res.data);
            setSelectedUserIds(res.data.filter((u: any) => u.role?.id === role.id).map((u: any) => u.id));
            setIsUserModalOpen(true);
        } catch {
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        }
    };

    const saveUserAssignment = async () => {
        if (!permissionRole) return;
        try {
            const token = Cookies.get('token');
            await axios.post(`${API_URL}/users/batch-role`, {
                userIds: selectedUserIds,
                roleId: permissionRole.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            toastSwal({ icon: 'success', title: tc('success') });
            setIsUserModalOpen(false);
        } catch {
            showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
        }
    };

    // Filtered list
    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // ── Permission count helper ───────────────────────────────────────────────
    const getPermSummary = (role: Role) => {
        const perms = role.permissions || [];
        const total = modules.reduce((s, m) => s + m.actions.length, 0);
        const active = perms.filter(p => p.includes(':')).length;
        return { active, total };
    };

    // ── Column all-selected state ─────────────────────────────────────────────
    const isColAllSelected = (action: Action) => {
        const eligible = modules.filter(m => m.actions.includes(action));
        return eligible.every(m => selectedPerms.includes(permKey(m.key, action)));
    };

    const isAllSelected = () => {
        const allKeys = modules.flatMap(m => m.actions.map(a => permKey(m.key, a)));
        return allKeys.every(k => selectedPerms.includes(k));
    };

    // ─── RENDER ─────────────────────────────────────────────────────────────────
    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-user-tag me-3 text-pink-600 dark:text-pink-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-pink-600 dark:text-pink-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-pink-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus text-lg"></i> {t('newRole')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-white dark:border-slate-700 mb-6">
                    <div className="relative">
                        <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-pink-500/10 outline-none transition-all dark:text-white font-bold"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableRoleName')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableDescription')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetki Özeti</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {filteredRoles.map((role) => {
                                    const { active, total } = getPermSummary(role);
                                    const pct = total > 0 ? Math.round((active / total) * 100) : 0;
                                    return (
                                        <tr key={role.id} className="hover:bg-pink-500/5 dark:hover:bg-pink-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{role.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-user-tag text-xl"></i>
                                                    </div>
                                                    <span className="font-black text-slate-800 dark:text-white tracking-tight text-lg uppercase">{role.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{role.description || '-'}</p>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                                                        <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums">{active}/{total}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openPermissionModal(role)} title="Yetki Matrisi" className="w-10 h-10 bg-white dark:bg-slate-800 text-pink-600 hover:text-white hover:bg-pink-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-shield-halved text-lg"></i>
                                                    </button>
                                                    <button onClick={() => openUserModal(role)} title="Kullanıcı Ata" className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-users text-lg"></i>
                                                    </button>
                                                    <button onClick={() => openModal(role)} className="w-10 h-10 bg-white dark:bg-slate-800 text-amber-600 hover:text-white hover:bg-amber-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-to-square text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(role.id, role.name)} className="w-10 h-10 bg-white dark:bg-slate-800 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRoles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                                            <div className="text-4xl mb-4 opacity-30">📁</div>
                                            {tc('notFound')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Upsert Modal ──────────────────────────────────────────────────── */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                        <i className={`fat ${editingRole ? 'fa-pen-to-square' : 'fa-plus'} text-pink-600`}></i>
                                        {editingRole ? t('modalEdit') : t('modalNew')}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                            </div>
                            <div className="flex-1 overflow-hidden w-full flex flex-col">
                                <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                            <div className="relative">
                                                <i className="fat fa-user-tag absolute left-4 top-4 text-pink-500/50"></i>
                                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-pink-500/10 outline-none transition-shadow" placeholder={t('placeholderName')} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelDesc')}</label>
                                            <div className="relative">
                                                <i className="fat fa-align-left absolute left-4 top-4 text-pink-500/50"></i>
                                                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-pink-500/10 outline-none transition-shadow" placeholder={t('placeholderDesc')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                            <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                        </button>
                                        <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-pink-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <i className="fat fa-check text-lg"></i> {tc('save')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Permission Matrix Modal ───────────────────────────────────────── */}
                {isPermissionModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
                        <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-[1200px] shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[95vh]">

                            {/* Header */}
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/50 shrink-0 rounded-t-[32px]">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tight mb-0">
                                        <i className="fat fa-shield-halved text-pink-500"></i>
                                        <span className="text-pink-500">{permissionRole?.name}</span>
                                        <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
                                        Yetki Matrisi
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        {selectedPerms.length} yetki aktif — modül ve aksiyon bazlı kontrol
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleAll}
                                        className={`px-5 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${isAllSelected() ? 'bg-pink-600 border-pink-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-pink-300'}`}
                                    >
                                        {isAllSelected() ? 'Tümünü Kaldır' : 'Tümünü Ver'}
                                    </button>
                                    <button onClick={() => setIsPermissionModalOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all shadow-sm">&times;</button>
                                </div>
                            </div>

                            {/* Matrix Table */}
                            <div className="flex-1 overflow-auto p-6">
                                <table className="w-full border-collapse text-sm">
                                    {/* Column headers */}
                                    <thead>
                                        <tr>
                                            <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[220px]">Modül</th>
                                            {ALL_ACTIONS.map(action => {
                                                const meta = ACTION_META[action];
                                                const colAll = isColAllSelected(action);
                                                return (
                                                    <th key={action} className="px-2 py-3 text-center w-[110px]">
                                                        <button
                                                            onClick={() => toggleColAll(action)}
                                                            className={`flex flex-col items-center gap-1 mx-auto px-3 py-2 rounded-xl border-2 transition-all w-full ${colAll ? meta.activeClass : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-400 hover:border-slate-300'}`}
                                                        >
                                                            <i className={`fat ${meta.icon} text-base`}></i>
                                                            <span className="text-[9px] font-black uppercase tracking-widest">{meta.label}</span>
                                                        </button>
                                                    </th>
                                                );
                                            })}
                                            <th className="px-2 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-[80px]">Tümü</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modules.map((mod, idx) => {
                                            const rowPerms = mod.actions.map(a => permKey(mod.key, a));
                                            const rowAllSelected = rowPerms.every(k => selectedPerms.includes(k));
                                            return (
                                                <tr key={mod.key} className={`border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                                                    {/* Module label */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl ${mod.accentBg} flex items-center justify-center ${mod.color} shrink-0`}>
                                                                <i className={`fat ${mod.icon} text-sm`}></i>
                                                            </div>
                                                            <span className="font-black text-slate-700 dark:text-slate-200 text-xs uppercase tracking-tight">{mod.label}</span>
                                                        </div>
                                                    </td>

                                                    {/* Action cells */}
                                                    {ALL_ACTIONS.map(action => {
                                                        const supported = mod.actions.includes(action);
                                                        const key = permKey(mod.key, action);
                                                        const active = selectedPerms.includes(key);
                                                        const meta = ACTION_META[action];
                                                        return (
                                                            <td key={action} className="px-2 py-3 text-center">
                                                                {supported ? (
                                                                    <button
                                                                        onClick={() => togglePerm(mod.key, action)}
                                                                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-95 ${active ? meta.activeClass : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 hover:border-slate-400'}`}
                                                                        title={`${mod.label} – ${meta.label}`}
                                                                    >
                                                                        <i className={`fat ${active ? 'fa-check' : meta.icon} text-sm`}></i>
                                                                    </button>
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700/50 flex items-center justify-center mx-auto opacity-30">
                                                                        <i className="fat fa-minus text-slate-300 text-xs"></i>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Row all toggle */}
                                                    <td className="px-2 py-3 text-center">
                                                        <button
                                                            onClick={() => toggleRowAll(mod)}
                                                            className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mx-auto transition-all hover:scale-110 ${rowAllSelected ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-pink-300'}`}
                                                            title="Satırdaki tüm yetkileri toggle et"
                                                        >
                                                            <i className={`fat ${rowAllSelected ? 'fa-check-double' : 'fa-list-check'} text-sm`}></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shrink-0 flex justify-between items-center rounded-b-[32px]">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <i className="fat fa-info-circle text-pink-400 mr-2"></i>
                                    Seçili: <span className="text-pink-500 font-black">{selectedPerms.length}</span> yetki
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsPermissionModalOpen(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Vazgeç</button>
                                    <button onClick={savePermissions} className="px-12 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-pink-500/20 hover:scale-105 transition-all flex items-center gap-2">
                                        <i className="fat fa-shield-check"></i> Yetkileri Kaydet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── User Assignment Modal ─────────────────────────────────────────── */}
                {isUserModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
                        <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-tight mb-0">
                                        <i className="fat fa-users-gear text-blue-600"></i>
                                        Toplu Rol Atama
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        <span className="text-blue-500">{permissionRole?.name}</span> rolünü kullanıcılara ata
                                    </p>
                                </div>
                                <button onClick={() => setIsUserModalOpen(false)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-2">
                                {allUsers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedUserIds.includes(u.id) ? 'bg-blue-500/5 border-blue-500' : 'bg-white dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedUserIds.includes(u.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                                {u.firstName[0]}{u.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-white text-sm leading-none">{u.firstName} {u.lastName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u.email} — {u.role?.name || 'Rol Yok'}</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedUserIds.includes(u.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-700'}`}>
                                            {selectedUserIds.includes(u.id) && <i className="fat fa-check text-[10px]"></i>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 shrink-0 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedUserIds.length} kullanıcı seçildi</span>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsUserModalOpen(false)} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Vazgeç</button>
                                    <button onClick={saveUserAssignment} className="px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2">
                                        <i className="fat fa-users-check"></i> Kaydet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
