'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Role {
    id: number;
    name: string;
}

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    role?: Role;
}

export default function UsersAdminPage() {
    const t = useTranslations('Users');
    const tc = useTranslations('Common');
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const locale = useLocale();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: 0,
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        roleId: 0,
        isActive: true
    });

    useEffect(() => {
        if (currentUser?.token) {
            fetchData();
        }
    }, [currentUser]);

    const fetchData = async () => {
        if (!currentUser?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
            const [usersRes, rolesRes] = await Promise.all([
                axios.get('http://localhost:3050/users', config),
                axios.get('http://localhost:3050/roles', config)
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
        } catch (error) {
            console.error('Error fetching data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                isActive: formData.isActive,
                passwordHash: formData.password, // Backend uses passwordHash in create/update
                role: formData.roleId !== 0 ? { id: formData.roleId } : null
            };

            if (formData.id === 0) {
                await axios.post('http://localhost:3050/users', payload, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            } else {
                // Remove password if not changing
                if (!formData.password) delete (payload as any).passwordHash;
                await axios.put(`http://localhost:3050/users/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving user', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        if (id === currentUser?.id) {
            showSwal({ title: tc('error'), text: t('selfDeleteWarning'), icon: 'warning' });
            return;
        }

        const result = await showSwal({
            title: t('deleteConfirmTitle'),
            text: t('deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('delete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && currentUser?.token) {
            try {
                await axios.delete(`http://localhost:3050/users/${id}`, {
                    headers: { Authorization: `Bearer ${currentUser.token}` }
                });
                toastSwal({ title: tc('delete'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting user', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    const openModal = (usr?: User) => {
        if (usr) {
            setFormData({
                id: usr.id,
                firstName: usr.firstName,
                lastName: usr.lastName,
                email: usr.email,
                password: '',
                roleId: usr.role?.id || 0,
                isActive: usr.isActive
            });
        } else {
            setFormData({
                id: 0,
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                roleId: roles[0]?.id || 0,
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header Section - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-user-shield me-3 text-cyan-600 dark:text-cyan-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-cyan-600 dark:text-cyan-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-cyan-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-user-plus text-lg"></i> {t('newUser')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:shadow-[0_8px_30px_-5px_rgba(6,182,212,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalUsers')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{users.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                            <i className="fat fa-user-group text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('activeAdmins')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{users.filter(u => u.role?.name?.toLowerCase() === 'admin').length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-shield-check text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loading')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableUser')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableEmail')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableRole')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {users.map(usr => (
                                        <tr key={usr.id} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{usr.id}</span>
                                            </td>
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
                                                    <i className="fat fa-envelope text-slate-300"></i>
                                                    {usr.email}
                                                </p>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-shield-halved text-slate-400 text-xs"></i>
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{usr.role?.name || t('notSpecified')}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(usr)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-user-pen text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(usr.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center disabled:opacity-30" disabled={usr.id === currentUser?.id}>
                                                        <i className="fat fa-user-xmark text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-users-slash text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{tc('notFound')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-user-plus' : 'fa-user-pen'} text-cyan-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto w-full p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelFirstName')}</label>
                                    <div className="relative">
                                        <i className="fat fa-user absolute left-4 top-4 text-cyan-500/50"></i>
                                        <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder={t('labelFirstName')} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelLastName')}</label>
                                    <div className="relative">
                                        <i className="fat fa-user absolute left-4 top-4 text-cyan-500/50"></i>
                                        <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder={t('labelLastName')} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelEmail')}</label>
                                    <div className="relative">
                                        <i className="fat fa-envelope absolute left-4 top-4 text-cyan-500/50"></i>
                                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="ornek@domain.com" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelPassword')} {formData.id === 0 && <span className="text-red-500">*</span>}</label>
                                    <div className="relative">
                                        <i className="fat fa-key absolute left-4 top-4 text-cyan-500/50"></i>
                                        <input type="password" required={formData.id === 0} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder={formData.id === 0 ? "••••••••" : t('passwordPlaceholder')} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelRole')}</label>
                                    <div className="relative">
                                        <i className="fat fa-shield-halved absolute left-4 top-4 text-cyan-500/50"></i>
                                        <select required value={formData.roleId} onChange={(e) => setFormData({ ...formData, roleId: parseInt(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow appearance-none cursor-pointer">
                                            <option value={0} disabled>{t('selectRole')}</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{tc('active')}</label>
                                    <div className="relative flex items-center pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl w-full">
                                        <i className="fat fa-toggle-on absolute left-4 top-4 text-cyan-500/50"></i>
                                        <div className="form-check form-switch mb-0 flex-1 d-flex justify-content-end pr-2">
                                            <input className="form-check-input cursor-pointer" type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                    <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                </button>
                                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <i className="fat fa-check text-lg"></i> {tc('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
