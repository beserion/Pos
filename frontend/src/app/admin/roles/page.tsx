'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/AuthContext';
import { showSwal, toastSwal } from '@/app/utils/swal';

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
}

const PERMISSION_MODULES = [
    { key: 'USERS', name: 'Kullanıcı Yönetimi', icon: 'fa-users-gear' },
    { key: 'ROLES', name: 'Rol ve Yetkiler', icon: 'fa-user-shield' },
    { key: 'EMPLOYEES', name: 'Personeller & Kuryeler', icon: 'fa-user-helmet-safety' },
    { key: 'PRODUCTS', name: 'Ürün & Stok Yönetimi', icon: 'fa-box-open' },
    { key: 'ORDERS', name: 'Siparişler & Satışlar', icon: 'fa-receipt' },
    { key: 'FINANCE', name: 'Finans & Kasa', icon: 'fa-wallet' },
    { key: 'LOCATIONS', name: 'Şube & Masalar', icon: 'fa-shop' }
];

const ACTIONS = [
    { key: 'VIEW', name: 'Görüntüleme', color: 'indigo' },
    { key: 'ADD', name: 'Ekleme', color: 'emerald' },
    { key: 'EDIT', name: 'Düzenleme', color: 'amber' },
    { key: 'DELETE', name: 'Silme', color: 'rose' }
];

export default function RolesPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', description: '', permissions: [] as string[] });

    useEffect(() => {
        if (user?.token) fetchRoles();
    }, [user]);

    const fetchRoles = async () => {
        try {
            const res = await axios.get('http://localhost:3050/roles', { headers: { Authorization: `Bearer ${user?.token}` } });
            setRoles(res.data);
        } catch (e) {
            console.error(e);
            toastSwal({ icon: 'error', title: 'Roller yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                permissions: formData.permissions
            };

            if (formData.id) {
                await axios.put(`http://localhost:3050/roles/${formData.id}`, payload, { headers: { Authorization: `Bearer ${user?.token}` } });
                toastSwal({ icon: 'success', title: 'Rol güncellendi' });
            } else {
                await axios.post('http://localhost:3050/roles', payload, { headers: { Authorization: `Bearer ${user?.token}` } });
                toastSwal({ icon: 'success', title: 'Rol eklendi' });
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (error: any) {
            console.error(error);
            showSwal({ title: 'Hata', text: error.response?.data?.message || 'Rol kaydedilemedi', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        if (id === 1 || id === 2) {
            return showSwal({ title: 'Uyarı', text: 'Sistem rolleri silinemez.', icon: 'warning' });
        }

        const result = await showSwal({
            title: 'Emin misiniz?',
            text: 'Bu rolü silmek istediğinize emin misiniz? (Bu role sahip kullanıcılar varsa işlem başarısız olabilir.)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`http://localhost:3050/roles/${id}`, { headers: { Authorization: `Bearer ${user?.token}` } });
                toastSwal({ icon: 'success', title: 'Rol silindi' });
                fetchRoles();
            } catch (err: any) {
                showSwal({ title: 'Hata', text: err.response?.data?.message || 'Silinemedi', icon: 'error' });
            }
        }
    };

    const togglePermission = (perm: string) => {
        setFormData(prev => {
            const hasPerm = prev.permissions.includes(perm);
            if (hasPerm) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== perm) };
            } else {
                return { ...prev, permissions: [...prev.permissions, perm] };
            }
        });
    };

    const openModal = (role?: Role) => {
        if (role) {
            setFormData({
                id: role.id,
                name: role.name,
                description: role.description || '',
                permissions: role.permissions || []
            });
        } else {
            setFormData({
                id: 0,
                name: '',
                description: '',
                permissions: []
            });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-x-hidden overflow-y-auto relative">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="d-flex align-items-center">
                        <i className="fat fa-user-shield me-3" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 fw-bold" id="title">ROL VE YETKİLER</h3>
                            <h5 className="text-muted mb-0">Kullanıcı gruplarını ve modül bazlı yetkilerini yapılandırın.</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="btn btn-soft-indigo btn-label border">
                            <i className="fat fa-plus label-icon"></i> Yeni Rol
                        </button>
                        <button onClick={() => router.push('/admin/users')} className="btn btn-soft-secondary btn-label border">
                            <i className="fat fa-users-gear label-icon"></i> Kullanıcılara Git
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Roller Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full shadow-sm border border-slate-200 dark:border-slate-700 my-auto flex flex-col max-h-[85vh]">
                        <div className="overflow-auto rounded-[40px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900">Rol Adı</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900">Açıklama</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 text-center">Yetki Sayısı</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50 dark:bg-slate-900">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {roles.map(role => (
                                        <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-xl group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-shield-halved"></i>
                                                    </div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 capitalize text-lg tracking-tight leading-none">{role.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{role.description || '-'}</p>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                                    <i className="fat fa-key"></i>
                                                    <span className="font-black text-xs tracking-widest">{role.permissions ? role.permissions.length : 0} YETKİ</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openModal(role)} className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:scale-105 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-to-square"></i>
                                                    </button>
                                                    {role.id !== 1 && role.id !== 2 && (
                                                        <button onClick={() => handleDelete(role.id)} className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:scale-105 transition-all flex items-center justify-center">
                                                            <i className="fat fa-trash"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {roles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-slate-500">Henüz rol bulunmuyor.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Role Upsert Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-3 shadow-lg border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <h4 className="mb-0 fw-bold">{formData.id ? 'Rolü Düzenle' : 'Yeni Rol'}</h4>
                            <button onClick={() => setIsModalOpen(false)} className="btn-close"></button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="text-start w-100">
                                <form id="roleForm" onSubmit={handleSave}>
                                    <input type="hidden" name="id" value={formData.id} />

                                    <div className="row mp-0 g-2">
                                        <div className="col-md-6 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>Rol Adı <span className="text-danger">*</span></span></div>
                                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control" placeholder="Örn: Personel" />
                                                <div className="input-group-text wd-50"><i className="fat fa-tag"></i></div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <div className="input-group">
                                                <div className="input-group-text wd-130 font-bold"><span>Açıklama</span></div>
                                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="form-control" placeholder="Açıklama..." />
                                                <div className="input-group-text wd-50"><i className="fat fa-circle-info"></i></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h6 className="fw-bold border-b pb-2 mb-3 tracking-widest uppercase text-muted" style={{ fontSize: '11px' }}>
                                            <i className="fat fa-list-check me-1"></i> Yetkiler
                                        </h6>
                                        <div className="row g-2">
                                            {PERMISSION_MODULES.map(mod => (
                                                <div key={mod.key} className="col-md-4">
                                                    <div className="card border shadow-none mb-0">
                                                        <div className="card-header bg-light py-2 px-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className={`fat ${mod.icon} text-indigo-500`}></i>
                                                                <span className="fw-bold small">{mod.name}</span>
                                                            </div>
                                                        </div>
                                                        <div className="card-body p-2">
                                                            {ACTIONS.map(act => {
                                                                const permKey = `${act.key}_${mod.key}`;
                                                                const isChecked = formData.permissions.includes(permKey);
                                                                return (
                                                                    <div key={permKey} className="d-flex align-items-center justify-between p-1 hover:bg-light rounded cursor-pointer" onClick={() => togglePermission(permKey)}>
                                                                        <span className={`small fw-bold ${isChecked ? 'text-dark' : 'text-muted'}`}>{act.name}</span>
                                                                        <div className="form-check form-switch mb-0">
                                                                            <input className="form-check-input" type="checkbox" checked={isChecked} readOnly />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <hr className="my-2" />
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <button type="button" className="btn btn-soft-danger btn-label border" onClick={() => setIsModalOpen(false)}>
                                            <i className="fas fa-times label-icon"></i> İptal
                                        </button>
                                        <button type="submit" className="btn btn-soft-success btn-label border">
                                            <i className="fas fa-save label-icon"></i> Kaydet
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
