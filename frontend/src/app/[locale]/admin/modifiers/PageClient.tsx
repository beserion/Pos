'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Modifier {
    id: number;
    name: string;
    groupName?: string;
    modifierGroupId?: number;
    group?: ModifierGroup;
}

interface ModifierGroup {
    id: number;
    name: string;
}

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const tc = useTranslations('Common');

    // Note: Reusing Admin translations where possible; otherwise using hardcoded Turkish for this feature per specific context
    const [modifiers, setModifiers] = useState<Modifier[]>([]);
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', groupName: '', modifierGroupId: 0 });
    const [groupFormData, setGroupFormData] = useState({ id: 0, name: '' });

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const baseUrl = process.env.NEXT_PUBLIC_API_URL;
            
            const [modifiersRes, groupsRes] = await Promise.all([
                axios.get(`${baseUrl}/modifiers`, config),
                axios.get(`${baseUrl}/modifier-groups`, config)
            ]);
            
            setModifiers(modifiersRes.data);
            setModifierGroups(groupsRes.data);
        } catch (error) {
            console.error('Error fetching data', error);
            showSwal({ title: tc('error'), text: tc('loadingError'), icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const baseUrl = process.env.NEXT_PUBLIC_API_URL;
            
            const selectedGroup = modifierGroups.find(g => g.id === Number(formData.modifierGroupId));
            const payload = {
                name: formData.name,
                modifierGroupId: formData.modifierGroupId ? Number(formData.modifierGroupId) : null,
                groupName: selectedGroup ? selectedGroup.name : (formData.groupName || null),
            };

            if (formData.id === 0) {
                await axios.post(`${baseUrl}/modifiers`, payload, config);
                toastSwal({ title: tc('success'), text: 'Özellik başarıyla eklendi.', icon: 'success' });
            } else {
                await axios.put(`${baseUrl}/modifiers/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: 'Özellik başarıyla güncellendi.', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving modifier', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const baseUrl = process.env.NEXT_PUBLIC_API_URL;
            
            if (groupFormData.id === 0) {
                await axios.post(`${baseUrl}/modifier-groups`, { name: groupFormData.name }, config);
                toastSwal({ title: tc('success'), text: 'Grup başarıyla oluşturuldu.', icon: 'success' });
            } else {
                await axios.put(`${baseUrl}/modifier-groups/${groupFormData.id}`, { name: groupFormData.name }, config);
                toastSwal({ title: tc('success'), text: 'Grup başarıyla güncellendi.', icon: 'success' });
            }
            setIsGroupModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving group', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDeleteGroup = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: 'Bu grubu silmek istediğinize emin misiniz? Gruba bağlı özellikler grupsuz kalacaktır.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const baseUrl = process.env.NEXT_PUBLIC_API_URL;
                await axios.delete(`${baseUrl}/modifier-groups/${id}`, config);
                toastSwal({ title: tc('success'), text: 'Grup silindi.', icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting group', error);
                showSwal({ title: tc('error'), text: 'Grup silinirken bir hata oluştu.', icon: 'error' });
            }
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: 'Bu özelliği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/modifiers/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: 'Silme işlemi başarılı', icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting modifier', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    const openModal = (modifier?: Modifier) => {
        if (modifier) setFormData({ id: modifier.id, name: modifier.name, groupName: modifier.groupName || '', modifierGroupId: modifier.modifierGroupId || 0 });
        else setFormData({ id: 0, name: '', groupName: '', modifierGroupId: 0 });
        setIsModalOpen(true);
    };

    const openGroupModal = (group?: ModifierGroup) => {
        if (group) setGroupFormData({ id: group.id, name: group.name });
        else setGroupFormData({ id: 0, name: '' });
        setIsGroupModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-tags me-3 text-amber-600 dark:text-amber-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-amber-600 dark:text-amber-400 leading-none uppercase tracking-[0.25em]">Ürün Özellikleri</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-amber-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Siparişlerde kullanılacak ek özellikler</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openGroupModal()} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-layer-group"></i> GRUPLARI YÖNET
                        </button>
                        <button onClick={() => openModal()} className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> YENİ ÖZELLİK
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Özellik</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{modifiers.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="fat fa-list text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Grup</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{modifierGroups.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <i className="fat fa-layer-group text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{tc('loading')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>ID</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grup Adı</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Özellik Adı</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {modifiers.map(m => (
                                        <tr key={m.id} className="hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{m.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    {m.group?.name || m.groupName || 'Grupsuz'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-tag"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{m.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(m)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(m.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {modifiers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-tags text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Hiç özellik bulunamadı</p>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-lg overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-amber-600`}></i>
                                    {formData.id === 0 ? 'YENİ ÖZELLİK EKLİYORSUNUZ' : 'ÖZELLİĞİ DÜZENLİYORSUNUZ'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">ÖZELLİK DETAYLARINI GİRİNİZ</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ÖZELLİK GRUBU</label>
                                            <div className="relative">
                                                <i className="fat fa-layer-group absolute left-4 top-3.5 text-amber-500/50"></i>
                                                <select value={formData.modifierGroupId} onChange={(e) => setFormData({ ...formData, modifierGroupId: Number(e.target.value) })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow appearance-none">
                                                    <option value={0}>Grup Seçiniz...</option>
                                                    {modifierGroups.map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
                                                    <i className="fat fa-chevron-down"></i>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => openGroupModal()} className="mt-2 text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                                <i className="fat fa-plus-circle"></i> YENİ GRUP OLUŞTUR
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ÖZELLİK ADI (ÖRN: SOĞANLI)</label>
                                            <div className="relative">
                                                <i className="fat fa-tag absolute left-4 top-3.5 text-amber-500/50"></i>
                                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-shadow" placeholder="Özellik adını giriniz..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" className="w-[200px] py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <i className="fat fa-check text-lg"></i> KAYDET
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Management Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-2xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-layer-group text-blue-600"></i>
                                    GRUP YÖNETİMİ
                                </h2>
                            </div>
                            <button onClick={() => setIsGroupModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleSaveGroup} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">GRUP ADI</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <i className="fat fa-pencil absolute left-4 top-3.5 text-blue-500/50"></i>
                                            <input type="text" required value={groupFormData.name} onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-shadow" placeholder="Grup adı giriniz..." />
                                        </div>
                                        <button type="submit" className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                            {groupFormData.id === 0 ? 'EKLE' : 'GÜNCELLE'}
                                        </button>
                                        {groupFormData.id !== 0 && (
                                            <button type="button" onClick={() => setGroupFormData({ id: 0, name: '' })} className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                                İPTAL
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>

                            <div className="mt-8">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">MEVCUT GRUPLAR</label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {modifierGroups.map(g => (
                                        <div key={g.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 transition-all group">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => setGroupFormData({ id: g.id, name: g.name })} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-pencil text-sm"></i>
                                                </button>
                                                <button onClick={() => handleDeleteGroup(g.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {modifierGroups.length === 0 && (
                                        <p className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest opacity-50">Henüz grup oluşturulmadı</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
