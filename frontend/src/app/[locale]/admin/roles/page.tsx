'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Role {
    id: number;
    name: string;
    description: string;
}

export default function RolesManagement() {
    const t = useTranslations('Roles');
    const tc = useTranslations('Common');
    const { user, loading } = useAuth();
    const router = useRouter();
    const locale = useLocale();

    const [roles, setRoles] = useState<Role[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isStatusFilter, setIsStatusFilter] = useState('All');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const API_URL = 'http://localhost:3050';

    useEffect(() => {
        if (!loading && !user) router.push(`/${locale}/login`);
        if (user) fetchRoles();
    }, [user, loading, router]);

    const fetchRoles = async () => {
        try {
            const token = Cookies.get('token');
            const res = await axios.get(`${API_URL}/roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoles(res.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
            showSwal({
                title: tc('error'),
                text: tc('loadingError'),
                icon: 'error'
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (editingRole) {
                await axios.put(`${API_URL}/roles/${editingRole.id}`, formData, { headers });
                toastSwal({ icon: 'success', title: tc('success') });
            } else {
                await axios.post(`${API_URL}/roles`, formData, { headers });
                toastSwal({ icon: 'success', title: tc('success') });
            }

            setIsModalOpen(false);
            setEditingRole(null);
            setFormData({ name: '', description: '' });
            fetchRoles();
        } catch (error) {
            console.error('Save error', error);
            showSwal({
                title: tc('error'),
                text: tc('error'),
                icon: 'error'
            });
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
                } catch (error) {
                    console.error('Delete error', error);
                    showSwal({
                        title: tc('error'),
                        text: t('deleteError'),
                        icon: 'error'
                    });
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

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header Section - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-user-tag me-3 text-pink-600 dark:text-pink-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-pink-600 dark:text-pink-400 leading-none uppercase tracking-[0.25em]" id="title">{t('title')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-pink-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => openModal()}
                            className="px-6 py-3 bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-pink-600 dark:text-pink-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <i className="fat fa-plus text-lg"></i> {t('newRole')}
                        </button>
                        <button
                            onClick={() => router.push(`/${locale}/admin`)}
                            className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* Filters */}
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

                {/* Data Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden shadow-sm">
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableRoleName')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableDescription')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {filteredRoles.map((role) => (
                                    <tr key={role.id} className="hover:bg-pink-500/5 dark:hover:bg-pink-500/10 transition-all group">
                                        <td className="px-8 py-3">
                                            <span className="text-sm font-black text-slate-400">#{role.id}</span>
                                        </td>
                                        <td className="px-8 py-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                                                    <i className="fat fa-user-tag text-xl"></i>
                                                </div>
                                                <span className="font-black text-slate-800 dark:text-white tracking-tight text-lg uppercase">
                                                    {role.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-3">
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {role.description || '-'}
                                            </p>
                                        </td>
                                        <td className="px-8 py-3 text-right">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button onClick={() => openModal(role)} className="w-10 h-10 bg-white dark:bg-slate-800 text-amber-600 hover:text-white hover:bg-amber-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                    <i className="fat fa-pen-to-square text-lg"></i>
                                                </button>
                                                <button onClick={() => handleDelete(role.id, role.name)} className="w-10 h-10 bg-white dark:bg-slate-800 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                    <i className="fat fa-trash-can text-lg"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRoles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                                            <div className="text-4xl mb-4 opacity-30">📁</div>
                                            {tc('notFound')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Upsert Modal overlay */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                        <i className={`fat ${editingRole ? 'fa-user-pen' : 'fa-user-plus'} text-pink-600`}></i>
                                        {editingRole ? t('modalEdit') : t('modalNew')}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                            </div>

                            <div className="flex-1 overflow-hidden w-full flex flex-col">
                                <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                            <div className="relative">
                                                <i className="fat fa-user-tag absolute left-4 top-4 text-pink-500/50"></i>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-pink-500/10 outline-none transition-shadow"
                                                    placeholder={t('placeholderName')}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelDesc')}</label>
                                            <div className="relative">
                                                <i className="fat fa-align-left absolute left-4 top-4 text-pink-500/50"></i>
                                                <textarea
                                                    rows={3}
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-pink-500/10 outline-none transition-shadow"
                                                    placeholder={t('placeholderDesc')}
                                                />
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

            </div>
        </div>
    );
}
