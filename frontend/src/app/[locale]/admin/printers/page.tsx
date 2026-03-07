'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Printer {
    id: number;
    name: string;
    location?: string;
    printerName?: string;
    ipAddress: string;
    isActive: boolean;
}

export default function PrintersAdminPage() {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', location: '', printerName: '', ipAddress: '', isActive: true });

    useEffect(() => {
        if (user?.token) {
            fetchPrinters();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user]);

    const fetchPrinters = async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get('http://localhost:3050/printers', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setPrinters(res.data);
        } catch (error) {
            console.error('Error fetching printers', error);
            showSwal({ title: 'Hata', text: 'Yazıcılar yüklenirken bir sorun oluştu.', icon: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (formData.id === 0) {
                const { id, ...postData } = formData;
                await axios.post('http://localhost:3050/printers', postData, config);
                toastSwal({ title: 'Başarılı!', text: 'Yazıcı eklendi.', icon: 'success' });
            } else {
                const { id, ...putData } = formData;
                await axios.put(`http://localhost:3050/printers/${id}`, putData, config);
                toastSwal({ title: 'Başarılı!', text: 'Yazıcı güncellendi.', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchPrinters();
        } catch (error: any) {
            console.error('Error saving printer', error);
            showSwal({ title: 'Hata', text: error?.response?.data?.message || 'Yazıcı kaydedilemedi.', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: 'Emin misiniz?',
            text: "Bu yazıcıyı silmek istediğinize emin misiniz? Bağlı ürünlerin yazıcı atamaları sıfırlanacaktır.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal'
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`http://localhost:3050/printers/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: 'Silindi!', text: 'Yazıcı başarıyla silindi.', icon: 'success' });
                fetchPrinters();
            } catch (error) {
                console.error('Error deleting printer', error);
                showSwal({ title: 'Hata', text: 'Yazıcı silinirken bir sorun oluştu.', icon: 'error' });
            }
        }
    };

    const openModal = (printer?: Printer) => {
        if (printer) setFormData({ ...printer, location: printer.location || '', printerName: printer.printerName || '' });
        else setFormData({ id: 0, name: '', location: '', printerName: '', ipAddress: '', isActive: true });
        setIsModalOpen(true);
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="d-flex align-items-center">
                        <i className="fat fa-print me-3 text-sky-600 dark:text-sky-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 fw-bold text-sky-600 dark:text-sky-400 uppercase tracking-[0.25em]" id="title">{t('printers')}</h3>
                            <h5 className="text-muted mb-0 font-medium text-slate-400 dark:text-slate-500">{t('printersDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Yazıcı
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar - cardrighticon */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-sky-300 dark:hover:border-sky-500/40 hover:shadow-[0_8px_30px_-5px_rgba(14,165,233,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Yazıcı</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{printers.length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                            <i className="fat fa-print text-3xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Aktif Yazıcılar</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{printers.filter(p => p.isActive).length}</h3>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-circle-check text-3xl"></i>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Veriler Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>ID</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Yazıcı Bilgisi</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem Adı (Windows)</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bağlantı (IP)</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {printers.map(printer => (
                                        <tr key={printer.id} className="hover:bg-sky-500/5 dark:hover:bg-sky-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{printer.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-print"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{printer.name}</p>
                                                        <p className="text-xs font-bold text-slate-500 mt-1">{printer.location || 'Konum Belirtilmemiş'}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${printer.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {printer.isActive ? 'AKTİF YAZICI' : 'PASİF'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {printer.printerName || '-'}
                                            </td>
                                            <td className="px-8 py-3">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    <i className="fat fa-network-wired text-slate-300"></i>
                                                    {printer.ipAddress || 'USB/Local'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={() => openModal(printer)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(printer.id)} className="w-10 h-10 bg-white dark:bg-slate-800 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {printers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-print text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Kayıtlı Yazıcı Bulunamadı</p>
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-xl shadow-lg overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-sky-600`}></i>
                                {formData.id === 0 ? 'YENİ YAZICI' : 'YAZICI DÜZENLE'}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">Yazıcı ağ bilgilerini doldurun</p>
                        </div>

                        <form onSubmit={handleSave} className="p-8">
                            <div className="text-start w-100">
                                <div className="row mp-0 g-2">
                                    <div className="col-12 mb-2">
                                        <div className="input-group">
                                            <div className="input-group-text wd-130 font-bold"><span>Yazıcı Adı <span className="text-danger">*</span></span></div>
                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-control" placeholder="Örn: Mutfak Yazıcısı, Adisyon vb." />
                                            <div className="input-group-text wd-50"><i className="fat fa-tag"></i></div>
                                        </div>
                                    </div>
                                    <div className="col-12 mb-2">
                                        <div className="input-group">
                                            <div className="input-group-text wd-130 font-bold"><span>Lokasyon</span></div>
                                            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-control" placeholder="Örn: Mutfak Sıcak, Bar, Kasa..." />
                                            <div className="input-group-text wd-50"><i className="fat fa-map-pin"></i></div>
                                        </div>
                                    </div>
                                    <div className="col-12 mb-2">
                                        <div className="input-group">
                                            <div className="input-group-text wd-130 font-bold"><span>Sistem Adı</span></div>
                                            <input type="text" value={formData.printerName} onChange={(e) => setFormData({ ...formData, printerName: e.target.value })} className="form-control" placeholder="Örn: EPSON TM-T20II Receipt" />
                                            <div className="input-group-text wd-50"><i className="fat fa-desktop"></i></div>
                                        </div>
                                    </div>
                                    <div className="col-12 mb-2">
                                        <div className="input-group">
                                            <div className="input-group-text wd-130 font-bold"><span>Bağlantı (IP)</span></div>
                                            <input type="text" value={formData.ipAddress} onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })} className="form-control" placeholder="Örn: 192.168.1.100 veya LPT1" />
                                            <div className="input-group-text wd-50"><i className="fat fa-network-wired"></i></div>
                                        </div>
                                    </div>
                                    <div className="col-12 mb-2">
                                        <div className="input-group">
                                            <div className="input-group-text wd-130 font-bold"><span>Durum</span></div>
                                            <div className="form-control d-flex align-items-center">
                                                <div className="form-check form-switch mb-0">
                                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="form-check-input" />
                                                </div>
                                            </div>
                                            <div className="input-group-text wd-50"><i className="fat fa-power-off"></i></div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-2" />
                                <div className="d-flex justify-content-between align-items-center">
                                    <button type="button" className="btn btn-soft-danger btn-label border" onClick={() => setIsModalOpen(false)}>
                                        <i className="fas fa-times label-icon"></i> İptal
                                    </button>
                                    <button type="submit" className="btn btn-soft-success btn-label border">
                                        <i className="fas fa-save label-icon"></i> Kaydet
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
