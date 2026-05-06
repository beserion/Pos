'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';
import { API_URL } from '@/lib/apiConfig';

interface Role {
    id: number;
    name: string;
    permissions?: string[];
}

interface CashRegister {
    id: number;
    name: string;
    isActive: boolean;
}

interface Zone {
    id: number;
    name: string;
}

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    pinCode?: string;
    passwordClearText?: string;
    isActive: boolean;
    role?: Role;
    extraPermissions?: string[];
    cashRegisterId?: number;
}

type Action = 'VIEW' | 'ADD' | 'EDIT' | 'DELETE' | 'PRINT' | 'APPROVE';
const ALL_ACTIONS: Action[] = ['VIEW', 'ADD', 'EDIT', 'DELETE', 'PRINT', 'APPROVE'];

const ACTION_META: Record<Action, { icon: string; label: string }> = {
    VIEW: { icon: 'fa-eye', label: 'Görüntüle' },
    ADD: { icon: 'fa-plus', label: 'Ekle' },
    EDIT: { icon: 'fa-pen', label: 'Düzenle' },
    DELETE: { icon: 'fa-trash', label: 'Sil' },
    PRINT: { icon: 'fa-print', label: 'Yazdır' },
    APPROVE: { icon: 'fa-circle-check', label: 'Onayla' },
};

export function PageClient() {
    const t = useTranslations('Users');
    const tc = useTranslations('Common');
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const locale = useLocale();

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPermModalOpen, setIsPermModalOpen] = useState(false);
    const [permUser, setPermUser] = useState<User | null>(null);
    const [rolePerms, setRolePerms] = useState<string[]>([]);
    const [extraPerms, setExtraPerms] = useState<string[]>([]);
    const [permSaving, setPermSaving] = useState(false);
    const [activePermTab, setActivePermTab] = useState<'MODULES' | 'POS_SPECIAL'>('MODULES');
    const [tempCashRegisterId, setTempCashRegisterId] = useState<number>(0);

    // UI states
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    const [formData, setFormData] = useState({
        id: 0,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        pinCode: '',
        roleId: 0,
        isActive: true,
        cashRegisterId: 0
    });

    useEffect(() => {
        if (currentUser?.token) {
            fetchData();
        }
    }, [currentUser]);

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${currentUser?.token}` } };

            const [usersRes, rolesRes, modulesRes, cashRegsRes, zonesRes, tablesRes] = await Promise.all([
                axios.get(`${API_URL}/users`, config),
                axios.get(`${API_URL}/roles`, config),
                axios.get(`${API_URL}/permission-modules`, config),
                axios.get(`${API_URL}/cash-registers`, config),
                axios.get(`${API_URL}/zones`, config),
                axios.get(`${API_URL}/tables`, config)
            ]);

            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            setCashRegisters(cashRegsRes.data || []);
            setZones(zonesRes.data || []);
            setTables(tablesRes.data || []);

            const backendModules = (modulesRes.data || []).map((m: any) => ({
                key: m.key,
                name: m.label,
                icon: m.icon || 'fa-cube',
                actions: m.actions ? m.actions.split(',').map((s: string) => s.trim()).filter(Boolean) : []
            }));
            setModules(backendModules);

        } catch (error: any) {
            console.error('Error fetching data:', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${currentUser?.token}` } };

            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                pinCode: formData.pinCode,
                isActive: formData.isActive,
                passwordHash: formData.password,
                role: formData.roleId !== 0 ? { id: formData.roleId } : null,
                cashRegisterId: formData.cashRegisterId || null
            };

            if (formData.id === 0) {
                await axios.post(`${API_URL}/users`, payload, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            } else {
                if (!formData.password) delete (payload as any).passwordHash;
                await axios.put(`${API_URL}/users/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving user detail:', error?.response?.data || error.message || error);
            const errDetail = error?.response?.data?.message || error?.response?.data?.error || error.message || 'Bilinmeyen bir hata oluştu.';
            showSwal({ title: tc('error'), text: Array.isArray(errDetail) ? errDetail.join(', ') : errDetail, icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        if (id === currentUser?.id) {
            showSwal({ title: tc('error'), text: t('selfDeleteWarning') || 'You cannot delete yourself.', icon: 'warning' });
            return;
        }

        const result = await showSwal({
            title: t('deleteConfirmTitle') || 'Silmek İstediginizden Emin Misiniz?',
            text: t('deleteConfirmText') || 'Bu silme işlemini geri alamazsınız.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('delete') || 'Sil',
            cancelButtonText: tc('cancel') || 'İptal'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/users/${id}`, {
                    headers: { Authorization: `Bearer ${currentUser?.token}` }
                });
                toastSwal({ title: tc('delete'), text: t('deleteSuccess') || 'Silindi', icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting user', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    const openModal = (usr?: User) => {
        setIsPermModalOpen(false);
        setShowPassword(false);
        setShowPin(false);
        if (usr) {
            setFormData({
                id: usr.id,
                firstName: usr.firstName,
                lastName: usr.lastName,
                email: usr.email,
                phone: usr.phone || '',
                password: usr.passwordClearText || '',
                pinCode: usr.pinCode || '',
                roleId: usr.role?.id || 0,
                isActive: usr.isActive,
                cashRegisterId: usr.cashRegisterId || 0
            });
        } else {
            setFormData({
                id: 0,
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                password: '',
                pinCode: '',
                roleId: roles.length > 0 ? roles[0].id : 0,
                isActive: true,
                cashRegisterId: 0
            });
        }
        setIsModalOpen(true);
    };

    const toggleShowPassword = () => setShowPassword(prev => !prev);
    const toggleShowPin = () => setShowPin(prev => !prev);

    const openPermModal = (usr: User) => {
        setIsModalOpen(false);
        setPermUser(usr);
        
        // Ensure role permissions is always an array
        const rolePermsArray = Array.isArray(usr.role?.permissions) 
            ? usr.role.permissions 
            : (typeof usr.role?.permissions === 'string' ? (usr.role.permissions as string).split(',').filter(Boolean) : []);
            
        setRolePerms(rolePermsArray);
        setExtraPerms(usr.extraPermissions || []);
        setTempCashRegisterId(usr.cashRegisterId || 0);
        setActivePermTab('MODULES');
        setIsPermModalOpen(true);
    };

    // --- Permissions Logic ---
    const permKey = (mod: string, action: string) => `${mod}:${action}`;

    const isSuperAdmin = (u: User | null) => {
        return u?.role?.name?.toUpperCase() === 'ADMIN' || u?.role?.name?.toUpperCase() === 'ADMINISTRATOR';
    };

    const getEffectiveSummary = (u: User) => {
        if (isSuperAdmin(u)) return { count: 'Tümü', total: 'Tümü', pct: 100 };
        const basePaths = u.role?.permissions || [];
        const extra = u.extraPermissions || [];
        const combined = [...new Set([...basePaths, ...extra])];
        const count = combined.filter(p => p.includes(':')).length;
        const total = modules.reduce((s, m) => s + m.actions.length, 0);
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return { count, total, pct };
    };

    const getAllKeys = () => modules.flatMap(m => m.actions.map((a: string) => permKey(m.key, a)));

    const getCellState = (mod: string, action: Action) => {
        const k = permKey(mod, action).toUpperCase();
        if (rolePerms.some(rp => rp.toUpperCase() === k)) return 'role';
        if (extraPerms.some(ep => ep.toUpperCase() === k)) return 'extra';
        return 'none';
    };

    const isColAllSelected = (action: Action) => {
        if (isSuperAdmin(permUser)) return true;
        const eligible = modules.filter(m => m.actions.includes(action));
        if (eligible.length === 0) return false;

        return eligible.every(m => {
            const k = permKey(m.key, action);
            return rolePerms.includes(k) || extraPerms.includes(k);
        });
    };

    const togglePermission = (mod: string, action: Action) => {
        if (isSuperAdmin(permUser)) return;
        const key = permKey(mod, action);
        if (rolePerms.includes(key)) {
            toastSwal({ title: 'Rol Yetkisi', text: 'Bu yetki kullanıcının rolünden gelmektedir, buradan kaldırılamaz.', icon: 'info' });
            return;
        }
        setExtraPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const toggleZonePerm = (zoneId: number) => {
        if (isSuperAdmin(permUser)) return;
        const key = `ZONE:${zoneId}`;
        setExtraPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const toggleTablePerm = (tableId: number) => {
        if (isSuperAdmin(permUser)) return;
        const key = `TABLE:${tableId}`;
        setExtraPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const setTableAccessType = (type: 'ALL' | 'ASSIGNED') => {
        if (isSuperAdmin(permUser)) return;
        setExtraPerms(prev => {
            // Remove existing access type keys and specific table keys if switching to ALL
            let next = prev.filter(p => !p.startsWith('TABLE_ACCESS:') && (type === 'ASSIGNED' || !p.startsWith('TABLE:')));
            next.push(`TABLE_ACCESS:${type}`);
            return [...new Set(next)];
        });
    };

    const toggleExtraPerm = (key: string) => {
        if (isSuperAdmin(permUser)) return;
        setExtraPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const setDiscountLimit = (val: string) => {
        if (isSuperAdmin(permUser)) return;
        const num = Math.min(100, Math.max(0, parseInt(val) || 0));
        setExtraPerms(prev => {
            const next = prev.filter(p => !p.startsWith('DISCOUNT_LIMIT:'));
            if (num > 0) next.push(`DISCOUNT_LIMIT:${num}`);
            return next;
        });
    };

    const getTableAccessType = () => {
        if (rolePerms.includes('TABLE_ACCESS:ASSIGNED') || extraPerms.includes('TABLE_ACCESS:ASSIGNED')) return 'ASSIGNED';
        return 'ALL'; // Default
    };

    const toggleRowAll = (mod: string, actions: Action[]) => {
        if (isSuperAdmin(permUser)) return;
        const keys = actions.map(a => permKey(mod, a)).filter(k => !rolePerms.includes(k));
        if (keys.length === 0) return;
        const allSelected = keys.every(k => extraPerms.includes(k));

        setExtraPerms(prev => {
            let next = [...prev];
            if (allSelected) {
                keys.forEach(k => { next = next.filter(p => p !== k); });
            } else {
                keys.forEach(k => { if (!next.includes(k)) next.push(k); });
            }
            return next;
        });
    };

    const toggleColAll = (action: Action) => {
        if (isSuperAdmin(permUser)) return;
        const eligibleModules = modules.filter(m => m.actions.includes(action));
        const keys = eligibleModules.map(m => permKey(m.key, action)).filter(k => !rolePerms.includes(k));
        if (keys.length === 0) return;
        const allSelected = keys.every(k => extraPerms.includes(k));

        setExtraPerms(prev => {
            let next = [...prev];
            if (allSelected) {
                keys.forEach(k => { next = next.filter(p => p !== k); });
            } else {
                keys.forEach(k => { if (!next.includes(k)) next.push(k); });
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (isSuperAdmin(permUser)) return;
        const allKeys = modules.flatMap(m => (m.actions as Action[]).map(a => permKey(m.key, a))).filter(k => !rolePerms.includes(k));
        if (allKeys.length === 0) return;
        const allSelected = allKeys.every(k => extraPerms.includes(k));

        setExtraPerms(prev => {
            let next = [...prev];
            if (allSelected) {
                allKeys.forEach(k => { next = next.filter(p => p !== k); });
            } else {
                allKeys.forEach(k => { if (!next.includes(k)) next.push(k); });
            }
            return next;
        });
    };

    const isAllSelected = () => {
        if (isSuperAdmin(permUser)) return true;
        const allKeys = modules.flatMap(m => (m.actions as Action[]).map(a => permKey(m.key, a)));
        if (allKeys.length === 0) return false;
        return allKeys.every(k => rolePerms.includes(k) || extraPerms.includes(k));
    };

    const savePermissions = async () => {
        if (!permUser) return;
        setPermSaving(true);
        try {
            const config = { headers: { Authorization: `Bearer ${currentUser?.token}` } };
            // Hit the standard PUT /users/:id endpoint which accepts Partial<User>
            await axios.put(`${API_URL}/users/${permUser.id}`, {
                extraPermissions: extraPerms,
                cashRegisterId: tempCashRegisterId || null
            }, config);
            toastSwal({ title: 'Başarılı', text: 'Kişisel ek yetkiler kaydedildi', icon: 'success' });
            setIsPermModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showSwal({ title: 'Hata', text: 'Yetkiler kaydedilemedi', icon: 'error' });
        } finally {
            setPermSaving(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Details */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full h-full px-[50px] py-8 relative z-10 flex flex-col">

                {/* --- NORMAL VIEW (TABLE) --- */}
                {!isPermModalOpen && (<>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center">
                            <i className="fat fa-user-shield me-3 text-cyan-600 dark:text-cyan-400" style={{ fontSize: '50px' }}></i>
                            <div>
                                <h3 className="mb-0 text-3xl font-extralight text-cyan-600 dark:text-cyan-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                                <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent rounded-full mt-2 mb-1"></div>
                                <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle') || 'Kullanıcı Yönetimi'}</h5>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => openModal()} className="px-6 py-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-cyan-100 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                                <i className="fat fa-user-plus text-lg"></i> {t('newUser')}
                            </button>
                            <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                                <i className="fat fa-reply"></i> {tc('back')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:scale-[1.02] transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalUsers')}</p>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{users.length}</h3>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                <i className="fat fa-user-group text-3xl"></i>
                            </div>
                        </div>
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm hover:scale-[1.02] transition-all">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aktif Yöneticiler</p>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{users.filter(u => u.role?.name?.toLowerCase() === 'admin').length}</h3>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <i className="fat fa-shield-check text-3xl"></i>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 flex-1">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loading')}</p>
                        </div>
                    ) : (
                        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-slate-200 dark:border-slate-700/50 shadow-xl overflow-hidden mb-8 flex-1 flex flex-col">
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableUser')}</th>
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableEmail')}</th>
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableRole')}</th>
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetkili Kasa</th>
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetki Durumu</th>
                                            <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {users.map(usr => {
                                            const { count, total, pct } = getEffectiveSummary(usr);
                                            const extraCount = (usr.extraPermissions || []).filter(p => p.includes(':')).length;
                                            return (
                                                <tr key={usr.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                                    <td className="px-8 py-3"><span className="text-sm font-black text-slate-400">#{usr.id}</span></td>
                                                    <td className="px-8 py-3">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                                                                {usr.firstName[0]}{usr.lastName[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{usr.firstName} {usr.lastName}</p>
                                                                <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${usr.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {usr.isActive ? t('statusActive') : t('statusPassive')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-3">
                                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                            <i className="fat fa-envelope text-slate-300"></i>{usr.email}
                                                        </p>
                                                    </td>
                                                    <td className="px-8 py-3">
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <i className="fat fa-shield-halved text-slate-400 text-xs"></i>
                                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{usr.role?.name || t('notSpecified')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-3">
                                                        {(() => {
                                                            const reg = cashRegisters.find(r => r.id === usr.cashRegisterId);
                                                            return reg ? (
                                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-500/20">
                                                                    <i className="fat fa-cash-register text-indigo-500 text-xs"></i>
                                                                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">{reg.name}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-300 font-bold">Atanmamış</span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        {usr.role ? (
                                                            <button onClick={() => openPermModal(usr)} className="flex items-center gap-3 hover:scale-[1.02] transition-all group/p">
                                                                <div className="flex flex-col gap-1 min-w-[120px]">
                                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden w-full">
                                                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-slate-500 tabular-nums">{count}/{total} yetki</span>
                                                                        {extraCount > 0 && (
                                                                            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-500/20">+{extraCount} ek</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <i className="fat fa-arrow-up-right-from-square text-[10px] text-slate-300 group-hover/p:text-cyan-500 transition-colors"></i>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-300 font-bold">Rol atanmamış</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-3 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            {usr.role && (
                                                                <button onClick={() => openPermModal(usr)} title="Yetki Yönetimi" className="w-10 h-10 bg-white dark:bg-slate-800 text-purple-600 hover:text-white hover:bg-purple-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                                    <i className="fat fa-shield-halved text-lg"></i>
                                                                </button>
                                                            )}
                                                            <button onClick={() => openModal(usr)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                                <i className="fat fa-user-pen text-lg"></i>
                                                            </button>
                                                            <button onClick={() => handleDelete(usr.id)} disabled={usr.id === currentUser?.id} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center disabled:opacity-30">
                                                                <i className="fat fa-user-xmark text-lg"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {users.length === 0 && (
                                            <tr><td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-users-slash text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{tc('notFound')}</p>
                                                </div>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>)}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-xl animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
                        <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col animate-in zoom-in-95 duration-300 max-w-3xl h-auto">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                        <i className={`fat ${formData.id === 0 ? 'fa-user-plus' : 'fa-user-pen'} text-cyan-600`}></i>
                                        {formData.id === 0 ? 'YENİ KULLANICI' : 'KULLANICI DÜZENLE'}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Sistem erişim bilgilerini tanımlayın</p>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                            </div>
                            <div className="w-full">
                                <form onSubmit={handleSave} className="flex flex-col w-full">
                                    <div className="p-8 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelFirstName')}</label>
                                                <div className="relative"><i className="fat fa-user absolute left-4 top-4 text-cyan-500/50"></i>
                                                    <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder={t('labelFirstName')} /></div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelLastName')}</label>
                                                <div className="relative"><i className="fat fa-user absolute left-4 top-4 text-cyan-500/50"></i>
                                                    <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder={t('labelLastName')} /></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelEmail')}</label>
                                                <div className="relative"><i className="fat fa-envelope absolute left-4 top-4 text-cyan-500/50"></i>
                                                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="ornek@domain.com" /></div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">TELEFON</label>
                                                <div className="relative"><i className="fat fa-phone absolute left-4 top-4 text-cyan-500/50"></i>
                                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="+90 5xx xxx xx xx" /></div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                                    {t('labelPassword')} {formData.id === 0 && <span className="text-red-500">*</span>}
                                                </label>
                                                <div className="relative">
                                                    <i className="fat fa-key absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 text-base pointer-events-none"></i>
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        required={formData.id === 0}
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-white focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow"
                                                        placeholder={formData.id === 0 ? "Şifre giriniz" : "Yeni şifre (değiştirmek için)"}
                                                    />
                                                    <button type="button" onClick={toggleShowPassword} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-cyan-500 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700" tabIndex={-1}>
                                                        <i className={`fat ${showPassword ? 'fa-eye-slash text-cyan-500' : 'fa-eye'} text-base`}></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">PİN KODU <span className="text-slate-300 normal-case font-normal">(Garson girişi)</span></label>
                                                <div className="relative">
                                                    <i className="fat fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 text-base pointer-events-none"></i>
                                                    <input
                                                        type={showPin ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        maxLength={4}
                                                        value={formData.pinCode}
                                                        onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '') })}
                                                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-white focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow"
                                                        placeholder="4 haneli PIN"
                                                    />
                                                    <button type="button" onClick={toggleShowPin} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-cyan-500 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700" tabIndex={-1}>
                                                        <i className={`fat ${showPin ? 'fa-eye-slash text-cyan-500' : 'fa-eye'} text-base`}></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelRole')}</label>
                                                <div className="relative"><i className="fat fa-shield-halved absolute left-4 top-4 text-cyan-500/50"></i>
                                                    <div className="-m-2 w-full">
                                                        <SearchableSelect
                                                            value={formData.roleId}
                                                            onChange={(val) => setFormData({ ...formData, roleId: parseInt(val.toString()) || 0 })}
                                                            options={[
                                                                { value: 0, label: t('selectRole') },
                                                                ...roles.map(role => ({ value: role.id, label: role.name.toUpperCase() }))
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">YETKİLİ KASA</label>
                                                <div className="relative"><i className="fat fa-cash-register absolute left-4 top-4 text-cyan-500/50"></i>
                                                    <div className="-m-2 w-full">
                                                        <SearchableSelect
                                                            value={formData.cashRegisterId}
                                                            onChange={(val) => setFormData({ ...formData, cashRegisterId: parseInt(val.toString()) || 0 })}
                                                            options={[
                                                                { value: 0, label: 'Kasa Atanmamış' },
                                                                ...cashRegisters.filter(cr => cr.isActive).map(cr => ({ value: cr.id, label: cr.name }))
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{tc('active')}</label>
                                                <div className="relative flex items-center pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl w-full h-[54px]">
                                                    <i className={`fat ${formData.isActive ? 'fa-toggle-on text-emerald-500' : 'fa-toggle-off text-slate-400'} absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-lg`}></i>
                                                    <div className="flex-1 flex justify-end">
                                                        <label className="relative inline-flex items-center cursor-pointer group">
                                                            <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                                            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500 shadow-inner"></div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                            <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                        </button>
                                        <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <i className="fat fa-check text-lg"></i> {tc('save')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}


            </div>

            {/* --- PERMISSION MATRIX FULL SCREEN VIEW --- */}
            {isPermModalOpen && permUser && (
                <div className="fixed inset-0 z-[200] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 flex flex-col overflow-hidden">
                    {/* Ambient background glow */}
                    <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-gradient-to-bl from-purple-500/5 via-indigo-500/3 to-transparent blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-cyan-500/5 via-emerald-500/3 to-transparent blur-[100px] pointer-events-none"></div>

                    {/* HEADER */}
                    <div className="px-10 py-3 border-b border-slate-200/80 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shrink-0 relative z-10">
                        <div className="flex items-center justify-between">
                            {/* Left - Title */}
                            <div className="flex gap-4 items-center shrink-0">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    <i className="fat fa-shield-halved text-xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1.5">Kişisel Yetki Yönetimi</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                            <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-black text-purple-600 dark:text-purple-400 shadow-sm">{permUser.firstName[0]}{permUser.lastName[0]}</div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">{permUser.firstName} {permUser.lastName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-100 dark:border-purple-500/20">
                                            <i className="fat fa-shield-halved text-purple-500 text-xs"></i>
                                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">{permUser.role?.name || 'ROL YOK'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center - KPIs + Legend */}
                            <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
                                <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0"><i className="fat fa-chart-pie text-base"></i></div>
                                    <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Toplam</p><h4 className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-none">{permUser ? getEffectiveSummary(permUser).count : 0}<span className="text-[10px] text-slate-400 font-bold">/{permUser ? getEffectiveSummary(permUser).total : 0}</span></h4></div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0"><i className="fat fa-shield-check text-base"></i></div>
                                    <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Rol</p><h4 className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-none">{rolePerms.filter(k => k.includes(':')).length}</h4></div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><i className="fat fa-user-plus text-base"></i></div>
                                    <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Kişisel</p><h4 className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-none">{extraPerms.filter(k => k.includes(':')).length}</h4></div>
                                </div>
                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm self-stretch">
                                    <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-purple-100 border-2 border-purple-200 dark:bg-purple-900/40 dark:border-purple-500/30"></div><span className="font-bold text-slate-500 text-xs uppercase">Rol</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-emerald-500 border-2 border-emerald-500"></div><span className="font-bold text-slate-500 text-xs uppercase">Kişisel</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-white border-2 border-slate-200 dark:bg-slate-900 dark:border-slate-700"></div><span className="font-bold text-slate-500 text-xs uppercase">Yok</span></div>
                                </div>
                                {isSuperAdmin(permUser) && (
                                    <div className="text-rose-500 text-[9px] font-bold uppercase bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
                                        <i className="fat fa-triangle-exclamation text-xs"></i> Admin
                                    </div>
                                )}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
                                    <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase">Rolden Gelen:</span>
                                    <span className="text-[10px] font-black text-purple-700 dark:text-purple-300">{rolePerms.length} Yetki</span>
                                </div>
                            </div>

                                 <div className="flex items-center gap-3 shrink-0">
                                <div className="relative">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                                        className={`px-6 py-2.5 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${showTemplateMenu ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'}`}
                                    >
                                        <i className={`fat ${showTemplateMenu ? 'fa-circle-xmark' : 'fa-wand-magic-sparkles'}`}></i> Şablon Uygula
                                    </button>
                                    
                                    {showTemplateMenu && (
                                        <>
                                            <div className="fixed inset-0 z-[290]" onClick={() => setShowTemplateMenu(false)}></div>
                                            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[300]">
                                                <div className="p-3 space-y-1">
                                                    <div className="px-3 py-2 mb-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hazır Şablonlar</p>
                                                    </div>
                                                    {roles.filter(r => {
                                                        const n = r.name.toUpperCase();
                                                        return n.includes('GARSON') || n.includes('KASİYER') || n.includes('KASIYER') || n.includes('MÜDÜR') || n.includes('MUDUR') || n.includes('PATRON');
                                                    }).map(role => (
                                                        <button
                                                            key={role.id}
                                                            onClick={async () => {
                                                                setShowTemplateMenu(false);
                                                                const result = await showSwal({
                                                                    title: `${role.name} Şablonu`,
                                                                    text: "Kullanıcının rolü ve varsayılan yetkileri bu şablona göre güncellenecektir. Devam edilsin mi?",
                                                                    icon: 'question',
                                                                    showCancelButton: true
                                                                });
                                                                if (result.isConfirmed) {
                                                                    try {

                                                                        await axios.put(`${API_URL}/users/${permUser.id}`, {
                                                                            role: { id: role.id },
                                                                            extraPermissions: []
                                                                        }, { headers: { Authorization: `Bearer ${currentUser?.token}` } });
                                                                        
                                                                        const rolePermsArray = Array.isArray(role.permissions) 
                                                                            ? role.permissions 
                                                                            : (typeof role.permissions === 'string' ? (role.permissions as string).split(',').filter(Boolean) : []);
                                                                        
                                                                        setPermUser({ ...permUser, role: role, extraPermissions: [] });
                                                                        setRolePerms(rolePermsArray);
                                                                        setExtraPerms([]);
                                                                        
                                                                        toastSwal({ title: 'Başarılı', text: 'Şablon başarıyla uygulandı', icon: 'success' });
                                                                        await fetchData();
                                                                    } catch (err) {
                                                                        console.error("Template Apply Error:", err);
                                                                        showSwal({ title: 'Hata', text: 'Şablon uygulanamadı', icon: 'error' });
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-2xl transition-all flex items-center gap-3 group/item hover:scale-[1.02] active:scale-95"
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all shadow-sm">
                                                                <i className={`fat ${role.name.toUpperCase() === 'GARSON' ? 'fa-hand-holding-heart' : role.name.toUpperCase() === 'KASİYER' ? 'fa-cash-register' : role.name.toUpperCase() === 'MÜDÜR' ? 'fa-user-tie' : 'fa-crown'} text-sm`}></i>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{role.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Varsayılan Şablon</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button type="button" onClick={savePermissions} disabled={isSuperAdmin(permUser) || permSaving} className="px-6 py-2.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                                    {permSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fat fa-check"></i>}
                                    Kaydet
                                </button>
                                <button type="button" onClick={() => setIsPermModalOpen(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:shadow-md">
                                    <i className="fat fa-reply text-sm"></i>Geri Dön
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex items-center justify-center mt-6 z-20 relative">
                        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex gap-2 shadow-sm">
                            <button
                                onClick={() => setActivePermTab('MODULES')}
                                className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activePermTab === 'MODULES' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-100' : 'bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 scale-95 opacity-80'}`}
                            >
                                <i className="fat fa-layer-group"></i> Genel Modüller
                            </button>
                            <button
                                onClick={() => setActivePermTab('POS_SPECIAL')}
                                className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activePermTab === 'POS_SPECIAL' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-100' : 'bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 scale-95 opacity-80'}`}
                            >
                                <i className="fat fa-cash-register"></i> POS / Kasa Yetkileri
                            </button>
                        </div>
                    </div>

                    {/* MATRIX TABLE & TAB CONTENT */}
                    <div className="flex-1 min-h-0 px-10 py-4 relative z-0 flex flex-col">
                        {activePermTab === 'MODULES' && (
                            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl overflow-auto h-full custom-scrollbar animate-in fade-in zoom-in-95 duration-300">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 border-b-2 border-slate-200 dark:border-slate-700 text-xs font-black text-slate-400 uppercase tracking-wider min-w-[220px] w-[22%] align-middle bg-slate-50/90 dark:bg-slate-900/70 sticky top-0 z-20 backdrop-blur-xl">Modül Adı</th>
                                            {ALL_ACTIONS.map(action => {
                                                const meta = ACTION_META[action];
                                                const colAll = isColAllSelected(action);
                                                return (
                                                    <th key={action} className="border-b-2 border-slate-200 dark:border-slate-700 min-w-[90px] bg-slate-50/90 dark:bg-slate-900/70 sticky top-0 z-20 backdrop-blur-xl align-middle p-1.5">
                                                        <button onClick={() => toggleColAll(action)} className={`flex flex-col items-center gap-1 mx-auto px-2 py-2 rounded-xl border-2 transition-all w-[85%] hover:scale-105 active:scale-95 ${colAll ? 'bg-indigo-50 border-indigo-300 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-500/30 dark:text-indigo-400 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}>
                                                            <i className={`fat ${meta.icon} text-sm`}></i>
                                                            <span className="text-[9px] font-black uppercase tracking-wider">{meta.label}</span>
                                                        </button>
                                                    </th>
                                                );
                                            })}
                                            <th className="border-b-2 border-slate-200 dark:border-slate-700 min-w-[90px] align-middle bg-slate-50/90 dark:bg-slate-900/70 sticky top-0 z-20 backdrop-blur-xl text-center p-1.5">
                                                <button onClick={toggleAll} className={`flex flex-col items-center gap-1 mx-auto px-2 py-2 rounded-xl border-2 transition-all w-[85%] hover:scale-105 active:scale-95 ${isAllSelected() ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-500 hover:bg-indigo-50'}`}>
                                                    <i className={`fat ${isAllSelected() ? 'fa-square-xmark' : 'fa-square-check'} text-sm`}></i>
                                                    <span className="text-[9px] font-black uppercase tracking-wider">Tümü</span>
                                                </button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modules.map((mod, idx) => {
                                            const modActions = mod.actions as Action[];
                                            if (modActions.length === 0) return null;
                                            const rowPerms = modActions.map(a => permKey(mod.key, a));
                                            const rowAllSelected = rowPerms.every(k => rolePerms.includes(k) || extraPerms.includes(k));

                                            return (
                                                <tr key={mod.key || idx} className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group border-b border-slate-100 dark:border-slate-700/30 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800/40' : 'bg-slate-50/80 dark:bg-slate-800/70'}`}>
                                                    <td className="px-5 py-2 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow border border-indigo-100/50 dark:border-indigo-500/10">
                                                                <i className={`fat ${mod.icon} text-sm`}></i>
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize tracking-tight">{mod.name}</span>
                                                        </div>
                                                    </td>
                                                    {ALL_ACTIONS.map(action => {
                                                        const supported = modActions.includes(action);
                                                        if (!supported) {
                                                            return (
                                                                <td key={action} className="p-1 text-center align-middle">
                                                                    <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700/50 flex items-center justify-center mx-auto opacity-30">
                                                                        <i className="fat fa-minus text-slate-300 text-[10px]"></i>
                                                                    </div>
                                                                </td>
                                                            );
                                                        }

                                                        const state = getCellState(mod.key, action);
                                                        return (
                                                            <td key={action} className="p-1 text-center align-middle">
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => state !== 'role' && togglePermission(mod.key, action)} 
                                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-90 ${state === 'role' ? 'bg-purple-100 border-purple-500 text-purple-600 dark:bg-purple-900/50 dark:border-purple-400 shadow-sm cursor-not-allowed ring-2 ring-purple-500/20' : state === 'extra' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 hover:border-slate-400 hover:text-slate-500'}`} 
                                                                    title={state === 'role' ? 'Bu yetki seçili rolden (şablondan) geliyor' : ACTION_META[action].label}
                                                                >
                                                                    <i className={`fat ${state === 'role' ? 'fa-shield-check text-[10px]' : state === 'extra' ? 'fa-check text-xs' : ACTION_META[action].icon + ' text-[10px]'}`}></i>
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="p-1 text-center align-middle">
                                                        <button onClick={() => toggleRowAll(mod.key, modActions)} className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-90 ${rowAllSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-600 dark:bg-indigo-900/40 dark:border-indigo-500/40 shadow-md shadow-indigo-500/10' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}`} title="Tüm Satırı Seç/İptal Et">
                                                            <i className={`fat ${rowAllSelected ? 'fa-check-double text-[10px]' : 'fa-list-check text-[10px]'}`}></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activePermTab === 'POS_SPECIAL' && (
                            <div className="h-full overflow-auto bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in zoom-in-95 duration-300 custom-scrollbar rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl">
                                <div className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">

                                        {/* Column 1: Settings & Info (3 Units) */}
                                        <div className="md:col-span-3 space-y-2">
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <i className="fat fa-cash-register text-indigo-500"></i> Kasa Ayarı
                                                </h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Atanmış Kasa POS</label>
                                                        <div className="relative">
                                                            <i className="fat fa-cash-register absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500/50 text-[10px] z-10 pointer-events-none"></i>
                                                            <div className="-m-1 w-full">
                                                                <SearchableSelect
                                                                    value={tempCashRegisterId}
                                                                    onChange={(val) => setTempCashRegisterId(parseInt(val.toString()) || 0)}
                                                                    options={[
                                                                        { value: 0, label: 'Kasa Atanmamış' },
                                                                        ...cashRegisters.filter(cr => cr.isActive).map(cr => ({ value: cr.id, label: cr.name }))
                                                                    ]}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Masa Erişim Tipi</label>
                                                        <div className="flex flex-col gap-2">
                                                            <button
                                                                onClick={() => setTableAccessType('ALL')}
                                                                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${getTableAccessType() === 'ALL' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${getTableAccessType() === 'ALL' ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                                    {getTableAccessType() === 'ALL' && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                                                                </div>
                                                                <span className="text-[10px] font-bold uppercase">Tüm Masalar</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setTableAccessType('ASSIGNED')}
                                                                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${getTableAccessType() === 'ASSIGNED' ? 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-purple-300'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${getTableAccessType() === 'ASSIGNED' ? 'border-purple-500' : 'border-slate-300'}`}>
                                                                    {getTableAccessType() === 'ASSIGNED' && <div className="w-2 h-2 bg-purple-500 rounded-full"></div>}
                                                                </div>
                                                                <span className="text-[10px] font-bold uppercase">Görevli Olduğu Masalar</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>


                                            </div>

                                            <div className="bg-slate-800 dark:bg-slate-950 rounded-2xl p-4 text-white shadow-lg">
                                                <h4 className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Durum Paneli</h4>
                                                <div className="space-y-2">
                                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><i className="fat fa-location-dot text-xs"></i></div>
                                                            <span className="text-[9px] font-bold uppercase text-white/60">Salonlar</span>
                                                        </div>
                                                        <span className="text-[11px] font-black text-emerald-400">{[...new Set([...extraPerms, ...rolePerms])].filter(p => p.startsWith('ZONE:')).length}</span>
                                                    </div>
                                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-lg bg-slate-500/20 text-slate-400 flex items-center justify-center"><i className="fat fa-bolt text-xs"></i></div>
                                                            <span className="text-[9px] font-bold uppercase text-white/60">Yetkiler</span>
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-400">0</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Zone Permissions + Price/Campaign (4 Units) */}
                                        <div className="md:col-span-4 space-y-4">
                                            {/* Zone Permissions */}
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[100px] transition-all hover:shadow-md">
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                                                    <h4 className="text-[9px] font-black text-slate-500 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <i className="fat fa-location-dot text-emerald-500"></i> Yetkili Salonlar
                                                    </h4>
                                                </div>
                                                <div className="p-4 overflow-auto max-h-[300px] custom-scrollbar">
                                                    {zones.length === 0 ? (
                                                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Salon bulunmuyor.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                                            {zones.map(zone => {
                                                                const key = `ZONE:${zone.id}`;
                                                                const isRolePerm = rolePerms.includes(key);
                                                                const isExtraPerm = extraPerms.includes(key);
                                                                const isActive = isRolePerm || isExtraPerm;
                                                                const isSuper = isSuperAdmin(permUser);

                                                                return (
                                                                    <button
                                                                        key={`zone-${zone.id}`}
                                                                        type="button"
                                                                        onClick={() => !isRolePerm && !isSuper && toggleZonePerm(zone.id)}
                                                                        disabled={isRolePerm || isSuper}
                                                                        className={`relative flex items-center gap-2 p-2 rounded-xl border transition-all ${isSuper || isRolePerm ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed' : isExtraPerm ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}
                                                                    >
                                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isActive || isSuper ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-900 text-transparent'}`}>
                                                                            <i className="fat fa-check text-[9px]"></i>
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-tight truncate flex-1 text-left">
                                                                            {zone.name}
                                                                        </span>
                                                                        {(isSuper || isRolePerm) && (
                                                                            <i className="fat fa-shield-check text-slate-400 text-[10px] opacity-30"></i>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Column 2 - Box 2: Price / Campaign Permissions */}
                                            <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md animate-in slide-in-from-bottom-5 duration-500 mt-4">
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                                                    <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                        <i className="fat fa-tags"></i> Fiyat / Kampanya Yetkileri
                                                    </h4>
                                                </div>

                                                <div className="p-4 relative">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300">
                                                        {[
                                                            { key: 'OP:CAN_CHANGE_PRICE', label: 'Fiyat Değiştirebilir', icon: 'fa-tags', color: 'text-blue-500' },
                                                            { key: 'OP:PRICE_AFTER_BILL', label: 'Hesap Sonrası Fiyat', icon: 'fa-file-invoice-dollar', color: 'text-indigo-500' },
                                                            { key: 'OP:CAN_DISCOUNT', label: 'İndirim Yapabilir', icon: 'fa-percent', color: 'text-emerald-500' },
                                                            { key: 'OP:DISCOUNT_AFTER_BILL', label: 'Hesap Sonrası İndirim', icon: 'fa-receipt', color: 'text-amber-500' },
                                                            { key: 'OP:CAN_COMPLIMENTARY', label: 'İkram Yapabilir', icon: 'fa-gift', color: 'text-pink-500' },
                                                            { key: 'OP:CAN_REFUND', label: 'İade Edebilir', icon: 'fa-rotate-left', color: 'text-rose-500' },
                                                            { key: 'OP:CAN_PROMOTION', label: 'Promosyon Uygula', icon: 'fa-star', color: 'text-yellow-500' },
                                                            { key: 'OP:STAFF_SALE', label: 'Personel Satışı', icon: 'fa-user-tag', color: 'text-indigo-600' },
                                                            { key: 'OP:NON_PAYMENT', label: 'Bedelsiz İşlem', icon: 'fa-hand-holding-dollar', color: 'text-teal-500' },
                                                            { key: 'OP:SET_MENU_SALE', label: 'Set Menü Satışı', icon: 'fa-list-check', color: 'text-violet-500' },
                                                            { key: 'OP:COMBO_SALE', label: 'Kombo Satışı', icon: 'fa-cubes', color: 'text-cyan-500' },
                                                            { key: 'OP:BOGO_CAMPAIGN', label: 'BOGO / Kampanya', icon: 'fa-ticket', color: 'text-orange-500' },
                                                            { key: 'OP:CAN_TICKET', label: 'Bilet Uygulayabilir', icon: 'fa-ticket-simple', color: 'text-blue-400' },
                                                        ].map((item, i) => {
                                                            const isFromRole = rolePerms.some(rp => rp.toUpperCase() === item.key.toUpperCase());
                                                            const isFromExtra = extraPerms.some(ep => ep.toUpperCase() === item.key.toUpperCase());
                                                            const isActive = isFromRole || isFromExtra;
                                                            const isSuper = isSuperAdmin(permUser);
                                                            
                                                            return (
                                                                <button
                                                                    key={item.key}
                                                                    type="button"
                                                                    onClick={() => !isSuper && !isFromRole && toggleExtraPerm(item.key)}
                                                                    disabled={isSuper}
                                                                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border-2 transition-all duration-300 ${isSuper ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed' : isFromRole ? 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400 shadow-sm cursor-not-allowed ring-1 ring-purple-500/20' : isFromExtra ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md'}`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isFromRole ? 'bg-purple-500 text-white' : isFromExtra ? 'bg-white text-emerald-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'}`}>
                                                                            <i className={`fat ${item.icon} text-sm`}></i>
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-tight truncate leading-tight">{item.label}</span>
                                                                    </div>
                                                                    {!isSuper && (
                                                                        <i className={`fat ${isFromRole ? 'fa-shield-check text-purple-500' : isFromExtra ? 'fa-check-circle text-white' : 'fa-circle text-slate-200 dark:text-slate-700'} text-xs`}></i>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                                                    <i className="fat fa-gauge-high"></i>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">Azami İndirim Oranı</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Kullanıcı için üst limit (%)</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={(extraPerms.find(p => p.startsWith('DISCOUNT_LIMIT:')) || rolePerms.find(p => p.startsWith('DISCOUNT_LIMIT:')))?.split(':')[1] || '0'}
                                                                    onChange={(e) => setDiscountLimit(e.target.value)}
                                                                    className="w-16 h-10 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-900/50 rounded-xl text-center font-black text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 transition-all font-mono"
                                                                />
                                                                <span className="font-black text-rose-400 font-mono">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-5 space-y-4">
                                            {/* Operational Permissions (Always Visible) */}
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[100px]">
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                                    <h4 className="text-[9px] font-black text-slate-500 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <i className="fat fa-scale-balanced text-orange-500"></i> Operasyonel Yetkiler
                                                    </h4>
                                                </div>

                                                <div className="p-4 relative">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300">
                                                        {[
                                                            { key: 'OP:CAN_ORDER', label: 'Sipariş Alabilir', icon: 'fa-cart-plus', color: 'text-emerald-500' },
                                                            { key: 'OP:ORDER_AFTER_BILL', label: 'Hesap Sonrası Sipariş', icon: 'fa-file-invoice-dollar', color: 'text-amber-500' },
                                                            { key: 'OP:CAN_TRANSFER', label: 'Transfer Yapabilir', icon: 'fa-arrow-right-arrow-left', color: 'text-blue-500' },
                                                            { key: 'OP:CAN_PRINT_BILL', label: 'Adisyon Yazdır / Hesap İste', icon: 'fa-print', color: 'text-slate-500' },
                                                            { key: 'OP:REPRINT_BILL', label: '2. Kez / Tekrar Adisyon Yazdır', icon: 'fa-repeat', color: 'text-purple-500' },
                                                            { key: 'OP:CAN_CANCEL_SALE', label: 'Adisyon İptal', icon: 'fa-ban', color: 'text-rose-500' },
                                                            { key: 'OP:RECALL_CLOSED_BILL', label: 'Kapalı Adisyon Geri Çağır', icon: 'fa-arrow-rotate-left', color: 'text-indigo-500' },
                                                            { key: 'OP:UNLOCK_BILL', label: 'Adisyon Kilidi Kaldır', icon: 'fa-unlock-keyhole', color: 'text-orange-500' },
                                                            { key: 'OWN_TABLES_ONLY', label: 'Kendi Masaları', icon: 'fa-user-lock', color: 'text-indigo-500' },
                                                        ].map((item, i) => {
                                                            const isActive = rolePerms.some(rp => rp.toUpperCase() === item.key.toUpperCase()) || 
                                                                             extraPerms.some(ep => ep.toUpperCase() === item.key.toUpperCase());
                                                            const isSuper = isSuperAdmin(permUser);
                                                            return (
                                                                <button
                                                                    key={item.key}
                                                                    onClick={() => !isSuper && toggleExtraPerm(item.key)}
                                                                    disabled={isSuper}
                                                                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border-2 transition-all duration-300 ${isSuper ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed' : isActive ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/5' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:shadow-md'}`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${isActive ? 'bg-orange-500 text-white shadow-orange-500/30' : 'bg-slate-100 dark:bg-slate-900 shadow-black/5'}`}>
                                                                            <i className={`fat ${item.icon} text-sm ${isActive ? 'text-white' : item.color}`}></i>
                                                                        </div>
                                                                        <div className="flex flex-col items-start translate-y-[-1px]">
                                                                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</span>
                                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 opacity-60">{isActive ? 'AKTİF' : 'PASİF'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-8 h-4 rounded-full relative transition-all duration-500 overflow-hidden ${isActive ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-[18px]' : 'left-0.5'}`}></div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Finance / Payment Permissions */}
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[100px] animate-in slide-in-from-bottom-5 duration-500 mt-4">
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                                    <h4 className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <i className="fat fa-money-bill-wave"></i> Finans / Ödeme Yetkileri
                                                    </h4>
                                                </div>

                                                <div className="p-4 relative">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300">
                                                        {[
                                                            { key: 'OP:FINANCE_CLOSE_ACCOUNT', label: 'Hesap kapatabilir', icon: 'fa-cash-register', color: 'text-emerald-600' },
                                                            { key: 'OP:FINANCE_CLOSE_OPEN_ACCOUNT', label: 'Açık hesap adisyon kpt', icon: 'fa-file-invoice', color: 'text-blue-500' },
                                                            { key: 'OP:FINANCE_PARTIAL_PAYMENT', label: 'Parçalı ödeme alabilir', icon: 'fa-chart-pie', color: 'text-indigo-500' },
                                                            { key: 'OP:FINANCE_DOWN_PAYMENT', label: 'Peşinat tahsilatı', icon: 'fa-hand-holding-dollar', color: 'text-teal-500' },
                                                            { key: 'OP:FINANCE_COLLECT_CURRENT_ACCOUNT', label: 'Cari hesap tahsilatı', icon: 'fa-money-bill-transfer', color: 'text-cyan-500' },
                                                            { key: 'OP:FINANCE_PAY_CURRENT_ACCOUNT', label: 'Cari hesap ödemesi', icon: 'fa-money-bill-wave', color: 'text-orange-500' },
                                                            { key: 'OP:FINANCE_CLOSE_TO_CURRENT_ACCOUNT', label: 'Cariye hesap kapatabilir', icon: 'fa-building-columns', color: 'text-purple-500' },
                                                            { key: 'OP:START_FISCAL', label: 'Mali İşlem Başlatabilir', icon: 'fa-play', color: 'text-rose-500' },
                                                            { key: 'OP:FISCAL_TRANSACTIONS', label: 'Yazar Kasa İşlemleri', icon: 'fa-receipt', color: 'text-blue-600' },
                                                        ].map((item, i) => {
                                                            const isFromRole = rolePerms.some(rp => rp.toUpperCase() === item.key.toUpperCase());
                                                            const isFromExtra = extraPerms.some(ep => ep.toUpperCase() === item.key.toUpperCase());
                                                            const isActive = isFromRole || isFromExtra;
                                                            const isSuper = isSuperAdmin(permUser);
                                                            
                                                            return (
                                                                <button
                                                                    key={item.key}
                                                                    type="button"
                                                                    onClick={() => !isSuper && !isFromRole && toggleExtraPerm(item.key)}
                                                                    disabled={isSuper}
                                                                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border-2 transition-all duration-300 ${isSuper ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed' : isFromRole ? 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400 shadow-sm cursor-not-allowed ring-1 ring-purple-500/20' : isFromExtra ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md'}`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isFromRole ? 'bg-purple-500 text-white' : isFromExtra ? 'bg-white text-emerald-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'}`}>
                                                                            <i className={`fat ${item.icon} text-sm`}></i>
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-tight truncate leading-tight">{item.label}</span>
                                                                    </div>
                                                                    {!isSuper && (
                                                                        <i className={`fat ${isFromRole ? 'fa-shield-check text-purple-500' : isFromExtra ? 'fa-check-circle text-white' : 'fa-circle text-slate-200 dark:text-slate-700'} text-xs`}></i>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rapor / Kapanış Yetkileri */}
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[100px] animate-in slide-in-from-bottom-5 duration-500 mt-4">
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                                    <h4 className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <i className="fat fa-chart-line"></i> Rapor / Kapanış Yetkileri
                                                    </h4>
                                                </div>

                                                <div className="p-4 relative">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300">
                                                        {[
                                                            { key: 'OP:REPORT_VIEW', label: 'Rapor Görüntüleyebilir', icon: 'fa-eye', color: 'text-blue-500' },
                                                            { key: 'OP:REPORT_SALES_ANALYSIS', label: 'Satış Analiz Raporu', icon: 'fa-chart-pie', color: 'text-indigo-500' },
                                                            { key: 'OP:REPORT_X', label: 'X Raporu Alabilir', icon: 'fa-file-invoice', color: 'text-amber-500' },
                                                            { key: 'OP:REPORT_Z', label: 'Z Raporu Oluşturabilir', icon: 'fa-file-invoice-dollar', color: 'text-rose-500' },
                                                            { key: 'OP:END_OF_DAY', label: 'Gün Kapanış Yapabilir', icon: 'fa-calendar-check', color: 'text-emerald-500' },
                                                            { key: 'OP:REPORT_CASH_REGISTER', label: 'Kasa Raporu Alabilir', icon: 'fa-cash-register', color: 'text-teal-500' },
                                                            { key: 'OP:VIEW_LOGS', label: 'İşlem Loglarını Görebilir', icon: 'fa-list-ul', color: 'text-slate-500' },
                                                        ].map((item, i) => {
                                                            const isFromRole = rolePerms.some(rp => rp.toUpperCase() === item.key.toUpperCase());
                                                            const isFromExtra = extraPerms.some(ep => ep.toUpperCase() === item.key.toUpperCase());
                                                            const isActive = isFromRole || isFromExtra;
                                                            const isSuper = isSuperAdmin(permUser);
                                                            
                                                            return (
                                                                <button
                                                                    key={item.key}
                                                                    type="button"
                                                                    onClick={() => !isSuper && !isFromRole && toggleExtraPerm(item.key)}
                                                                    disabled={isSuper}
                                                                    className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border-2 transition-all duration-300 ${isSuper ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed' : isFromRole ? 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400 shadow-sm cursor-not-allowed ring-1 ring-purple-500/20' : isFromExtra ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md'}`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isFromRole ? 'bg-purple-500 text-white' : isFromExtra ? 'bg-white text-emerald-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'}`}>
                                                                            <i className={`fat ${item.icon} text-sm`}></i>
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-tight truncate leading-tight">{item.label}</span>
                                                                    </div>
                                                                    {!isSuper && (
                                                                        <i className={`fat ${isFromRole ? 'fa-shield-check text-purple-500' : isFromExtra ? 'fa-check-circle text-white' : 'fa-circle text-slate-200 dark:text-slate-700'} text-xs`}></i>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Assigned Tables (Conditional) */}
                                            {getTableAccessType() === 'ASSIGNED' && (
                                                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-top duration-400 mt-2">
                                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-purple-500/5">
                                                        <h4 className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <i className="fat fa-table-list"></i> Görevli Olduğu Masalar
                                                        </h4>
                                                        <span className="text-[10px] font-black text-purple-600 bg-purple-100 dark:bg-purple-900/40 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
                                                            {[...new Set([...extraPerms, ...rolePerms])].filter(p => p.startsWith('TABLE:')).length} Seçili
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                        {zones.filter(z => {
                                                            const key = `ZONE:${z.id}`;
                                                            return rolePerms.includes(key) || extraPerms.includes(key);
                                                        }).map(zone => {
                                                            const zoneTables = tables.filter(t => t.zone?.id === zone.id);
                                                            if (zoneTables.length === 0) return null;
                                                            return (
                                                                <div key={`table-zone-final-${zone.id}`} className="p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                        <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{zone.name}</h5>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                        {zoneTables.map(table => {
                                                                            const isSelected = extraPerms.includes(`TABLE:${table.id}`);
                                                                            const isSuper = isSuperAdmin(permUser);
                                                                            return (
                                                                                <button
                                                                                    key={`table-btn-${table.id}`}
                                                                                    type="button"
                                                                                    onClick={() => !isSuper && toggleTablePerm(table.id)}
                                                                                    disabled={isSuper}
                                                                                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-purple-300 text-slate-600 dark:text-slate-400'}`}
                                                                                >
                                                                                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-none">{table.name}</span>
                                                                                    {isSelected && (
                                                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-lg border border-purple-100">
                                                                                            <i className="fat fa-check text-[7px] text-purple-600 font-black"></i>
                                                                                        </div>
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
