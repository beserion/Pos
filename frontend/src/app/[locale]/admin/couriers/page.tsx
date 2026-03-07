'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';

interface Courier {
    id: number;
    firstName: string;
    lastName: string;
    roleTitle: string;
    phone: string;
    vehicleType: string;
    licensePlate: string;
    courierStatus: string;
    isActive: boolean;
    photo?: string;
    document?: string;
}

interface DeliveryHistory {
    id: number;
    saleId: number;
    status: string;
    deliveryAddress: string;
    createdAt: string;
}

interface EmployeeDocument {
    id: number;
    employeeId: number;
    documentType: string;
    documentData: string;
    createdAt: string;
}

export default function CourierManagementPage() {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
    const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);

    const [activeTab, setActiveTab] = useState<'general' | 'documents'>('general');
    const [employeeDocuments, setEmployeeDocuments] = useState<EmployeeDocument[]>([]);
    const [newDocType, setNewDocType] = useState('');
    const [newDocData, setNewDocData] = useState('');
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    const [formData, setFormData] = useState({
        id: 0,
        firstName: '',
        lastName: '',
        roleTitle: 'Kurye',
        phone: '',
        vehicleType: '',
        licensePlate: '',
        courierStatus: 'AVAILABLE',
        photo: '',
        document: ''
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'document' | 'newDocData') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (field === 'newDocData') {
                    setNewDocData(reader.result as string);
                } else {
                    setFormData(prev => ({ ...prev, [field]: reader.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchCouriers();
        }
    }, [user]);

    const fetchCouriers = async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get('http://localhost:3050/employees', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            // Filter only couriers
            const allEmployees = res.data;
            const courierList = allEmployees.filter((e: any) =>
                e.roleTitle.toLowerCase().includes('kurye') ||
                e.roleTitle.toLowerCase().includes('motor')
            );
            setCouriers(courierList);
        } catch (error) {
            console.error('Error fetching couriers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedCourier(null);
        setFormData({
            id: 0,
            firstName: '',
            lastName: '',
            roleTitle: 'Kurye',
            phone: '',
            vehicleType: '',
            licensePlate: '',
            courierStatus: 'AVAILABLE',
            photo: '',
            document: ''
        });
        setActiveTab('general');
        setEmployeeDocuments([]);
        setIsModalOpen(true);
    };

    const handleEdit = async (courier: Courier) => {
        setSelectedCourier(courier);
        setFormData({
            id: courier.id,
            firstName: courier.firstName || '',
            lastName: courier.lastName || '',
            roleTitle: courier.roleTitle || 'Kurye',
            phone: courier.phone || '',
            vehicleType: courier.vehicleType || '',
            licensePlate: courier.licensePlate || '',
            courierStatus: courier.courierStatus || 'AVAILABLE',
            photo: courier.photo || '',
            document: courier.document || ''
        });
        setActiveTab('general');
        setIsModalOpen(true);
        if (user?.token) {
            try {
                const docRes = await axios.get(`http://localhost:3050/employees/${courier.id}/documents`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setEmployeeDocuments(docRes.data);
            } catch (err) {
                console.error("Dokümanlar alınamadı");
            }
        }
    };

    const handleAddDocument = async () => {
        if (!newDocType || !newDocData) {
            toastSwal({ title: tc('warning'), text: t('typeAndFileRequired') || 'Tip ve Dosya zorunludur.', icon: 'warning' });
            return;
        }
        setIsUploadingDoc(true);
        try {
            const res = await axios.post(`http://localhost:3050/employees/${formData.id}/documents`, {
                documentType: newDocType,
                documentData: newDocData
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setEmployeeDocuments([res.data, ...employeeDocuments]);
            setNewDocType('');
            setNewDocData('');
            toastSwal({ title: tc('success'), text: t('documentAdded') || 'Doküman eklendi.', icon: 'success' });
        } catch (error) {
            showSwal({ title: 'Hata', text: 'Doküman yüklenemedi.', icon: 'error' });
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleRemoveDocument = async (docId: number) => {
        try {
            await axios.delete(`http://localhost:3050/employees/${formData.id}/documents/${docId}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setEmployeeDocuments(employeeDocuments.filter(d => d.id !== docId));
            toastSwal({ title: tc('success'), text: t('documentDeleted') || 'Doküman başarıyla silindi.', icon: 'success' });
        } catch (error) {
            showSwal({ title: 'Hata', text: 'Kaldırılamadı.', icon: 'error' });
        }
    };

    const viewHistory = async (courier: Courier) => {
        setSelectedCourier(courier);
        try {
            const res = await axios.get(`http://localhost:3050/deliveries/courier/${courier.id}/history`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setDeliveryHistory(res.data);
            setIsHistoryModalOpen(true);
        } catch (error) {
            console.error('Error fetching history', error);
            showSwal({ title: 'Hata', text: 'Geçmiş alınamadı.', icon: 'error' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;

        try {
            if (formData.id === 0) {
                // Create
                const payload = { ...formData, isActive: true };
                delete (payload as any).id;
                await axios.post('http://localhost:3050/employees', payload, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: t('courierAdded') || 'Yeni kurye eklendi.', icon: 'success' });
            } else {
                // Update
                await axios.patch(`http://localhost:3050/employees/${formData.id}`, formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: t('courierUpdated') || 'Kurye bilgileri güncellendi.', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchCouriers();
        } catch (error: any) {
            showSwal({ title: tc('error'), text: error.response?.data?.message || t('saveError') || 'Kayıt yapılamadı.', icon: 'error' });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'AVAILABLE':
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black ring-1 ring-emerald-200">MÜSAİT</span>;
            case 'BUSY':
                return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-black ring-1 ring-amber-200">MEŞGUL</span>;
            case 'OFF_DUTY':
                return <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-black ring-1 ring-slate-200">{t('statusOffDuty') || 'MESAİ DIŞI'}</span>;
            default:
                return <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-black">{status}</span>;
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 dark:bg-orange-600/10 blur-[120px]"></div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/5 dark:bg-amber-600/10 blur-[120px]"></div>
            </div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header - formtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-user-helmet-safety me-3 text-orange-600 dark:text-orange-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-orange-600 dark:text-orange-400 leading-none uppercase tracking-[0.25em]" id="title">{t('couriers')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-orange-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('couriersDesc')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCreate} className="px-6 py-3 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all flex items-center gap-2">
                            <i className="fat fa-plus"></i> {t('newCourier') || 'Yeni Kurye'}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar - cardrighticon */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Müsait Kurye</p>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{couriers.filter(c => c.courierStatus === 'AVAILABLE').length}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <i className="fat fa-user-check text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Teslimatta</p>
                            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400">{couriers.filter(c => c.courierStatus === 'BUSY').length}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <i className="fat fa-moped text-2xl"></i>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-[0_8px_30px_-5px_rgba(249,115,22,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Kurye</p>
                            <h3 className="text-xl font-black text-orange-600 dark:text-orange-400">{couriers.length}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                            <i className="fat fa-users-gear text-2xl"></i>
                        </div>
                    </div>
                </div>

                {/* Courier Table */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('courierInfo') || 'Kurye Bilgisi'}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('vehiclePlate') || 'Araç & Plaka'}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{tc('status')}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('contact') || 'İletişim'}</th>
                                    <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{tc('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-bold">Yükleniyor...</td></tr>
                                ) : couriers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-bold">{t('notFound') || 'Kurye kaydı bulunamadı.'}</td></tr>
                                ) : (
                                    couriers.map(c => (
                                        <tr key={c.id} className="hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-colors group">
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-3">
                                                    {c.photo ? (
                                                        <img src={c.photo} alt={`${c.firstName} ${c.lastName}`} className="w-10 h-10 rounded-xl object-cover bg-orange-100 dark:bg-orange-900/30" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center font-bold text-orange-600">
                                                            {c.firstName?.[0]}{c.lastName?.[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{c.firstName} {c.lastName}</p>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{c.roleTitle}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{c.vehicleType || 'Belirtilmemiş'}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.licensePlate || 'PLAKA YOK'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                {getStatusBadge(c.courierStatus)}
                                            </td>
                                            <td className="px-8 py-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                {c.phone || '-'}
                                            </td>
                                            <td className="px-8 py-3 text-right">
                                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 gap-2">
                                                    <button onClick={() => viewHistory(c)} className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 rounded-lg transition-all" title={t('deliveryHistory') || "Teslimat Geçmişi"}>
                                                        <i className="fat fa-map-location-dot"></i>
                                                    </button>
                                                    <button onClick={() => handleEdit(c)} className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-slate-400 hover:text-orange-600 rounded-lg transition-all" title={tc('edit')}>
                                                        <i className="fat fa-pen-field"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit/Create Modal (Tabbed Version) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-lg border border-slate-200 dark:border-slate-700 my-auto flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 shrink-0 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-extralight text-orange-600 dark:text-orange-400 flex items-center gap-3 tracking-tighter uppercase">
                                    <i className="fat fa-user-helmet-safety text-orange-600 dark:text-orange-400"></i> {formData.id === 0 ? (t('newCourier') || 'Yeni Kurye Ekle') : (t('courierManagement') || 'Kurye Yönetimi')}
                                </h2>
                                {formData.id !== 0 && selectedCourier && (
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedCourier.firstName} {selectedCourier.lastName}</p>
                                )}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
                        </div>

                        {/* Tabs */}
                        <div className="px-8 border-b border-slate-100 dark:border-slate-700 shrink-0 flex gap-6 bg-slate-50/20 dark:bg-slate-900/10">
                            <button onClick={() => setActiveTab('general')} className={`py-4 font-black uppercase tracking-widest text-xs border-b-2 transition-colors ${activeTab === 'general' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                <i className="fat fa-id-card me-2"></i> {t('generalInfo') || 'Genel Bilgiler'}
                            </button>
                            <button onClick={() => setActiveTab('documents')} className={`py-4 font-black uppercase tracking-widest text-xs border-b-2 transition-colors ${activeTab === 'documents' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                <i className="fat fa-folders me-2"></i> {t('documents') || 'Dokümanlar'} {employeeDocuments.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-500/20 text-[9px]">{employeeDocuments.length}</span>}
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-8 overflow-y-auto min-h-[400px]">
                            {activeTab === 'general' ? (
                                <form id="courierGeneralForm" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Left Form */}
                                    <div className="md:col-span-2 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ad</label>
                                                <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow" placeholder="Ahmet" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Soyad</label>
                                                <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow" placeholder="Yılmaz" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Telefon</label>
                                            <div className="relative">
                                                <i className="fat fa-phone absolute left-4 top-3.5 text-orange-600/50"></i>
                                                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow" placeholder="0555 123 4567" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Araç Tipi</label>
                                                <div className="relative">
                                                    <i className="fat fa-truck-pickup absolute left-4 top-3.5 text-orange-600/50"></i>
                                                    <select value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none">
                                                        <option value="">Araç Seçin</option>
                                                        <option value="Motosiklet">Motosiklet</option>
                                                        <option value="Bisiklet">Bisiklet</option>
                                                        <option value="Araba">Araba</option>
                                                        <option value="Yaya">Yaya</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Plaka</label>
                                                <div className="relative">
                                                    <i className="fat fa-rectangle-columns absolute left-4 top-3.5 text-orange-600/50"></i>
                                                    <input type="text" value={formData.licensePlate} onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow uppercase" placeholder="34 ABC 123" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Çalışma Durumu</label>
                                            <div className="relative">
                                                <i className="fat fa-traffic-light absolute left-4 top-3.5 text-orange-600/50"></i>
                                                <select value={formData.courierStatus} onChange={(e) => setFormData({ ...formData, courierStatus: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-shadow appearance-none">
                                                    <option value="AVAILABLE">MÜSAİT</option>
                                                    <option value="BUSY">MEŞGUL</option>
                                                    <option value="OFF_DUTY">MESAİ DIŞI</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Photo Upload */}
                                    <div className="flex flex-col">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Profil Fotoğrafı</label>
                                        <div className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors h-full min-h-[250px]">
                                            {formData.photo ? (
                                                <div className="relative w-full aspect-square max-w-[200px] mb-4 rounded-[2em] overflow-hidden shadow-lg border-4 border-white dark:border-slate-700">
                                                    <img src={formData.photo} alt="Profil" className="object-cover w-full h-full" />
                                                    <button type="button" onClick={() => setFormData({ ...formData, photo: '' })} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-xl shadow-md hover:scale-105 transition-all backdrop-blur z-10" title="Fotoğrafı Sil">
                                                        <i className="fat fa-trash text-sm"></i>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-32 h-32 rounded-[2em] bg-slate-200/50 dark:bg-slate-700/50 flex items-center justify-center mb-6">
                                                    <i className="fat fa-user-astronaut text-5xl text-slate-300 dark:text-slate-600"></i>
                                                </div>
                                            )}
                                            <label className="w-full cursor-pointer group text-center z-0">
                                                <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-100 dark:border-orange-800/30 hover:bg-orange-100 transition-colors inline-block text-xs uppercase tracking-widest shadow-sm">
                                                    <i className="fat fa-upload me-2"></i> Fotoğraf Seç
                                                </div>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="hidden" />
                                                <p className="text-[10px] text-slate-400 mt-2">Maks. 5MB, format: JPG, PNG</p>
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    {formData.id === 0 ? (
                                        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <i className="fat fa-save text-5xl text-slate-300 dark:text-slate-600 mb-4 block"></i>
                                            <h3 className="font-black text-slate-600 dark:text-slate-300 text-lg mb-2">Önce Kuryeyi Kaydedin</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">Doküman yükleyebilmek için lütfen Genel Bilgiler sekmesindeki zorunlu alanları doldurup "Değişiklikleri Kaydet" butonuna basınız.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {/* Document Upload Form */}
                                            <div className="md:col-span-1 border-r border-slate-100 dark:border-slate-700 pr-8">
                                                <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs mb-4">Yeni Doküman Ekle</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Doküman Tipi</label>
                                                        <select value={newDocType} onChange={e => setNewDocType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow text-sm">
                                                            <option value="">Seçiniz...</option>
                                                            <option value="Sürücü Belgesi (Ehliyet)">Sürücü Belgesi (Ehliyet)</option>
                                                            <option value="Kimlik Fotokopisi">Kimlik Fotokopisi</option>
                                                            <option value="İş Sözleşmesi">İş Sözleşmesi</option>
                                                            <option value="Sabıka Kaydı (Adli Sicil)">Sabıka Kaydı (Adli Sicil)</option>
                                                            <option value="İkametgah">İkametgah</option>
                                                            <option value="Diğer">Diğer</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Dosya / Görsel</label>
                                                        {newDocData ? (
                                                            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-100">
                                                                {newDocData.startsWith('data:application/pdf') ? (
                                                                    <i className="fat fa-file-pdf text-4xl text-red-500"></i>
                                                                ) : (
                                                                    <img src={newDocData} alt="Önizleme" className="object-cover w-full h-full opacity-80" />
                                                                )}
                                                                <button onClick={() => setNewDocData('')} className="absolute inset-0 w-full h-full bg-slate-900/50 flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity font-bold text-xs uppercase tracking-widest">
                                                                    <i className="fat fa-trash mb-1 text-lg"></i> Sil ve Yeniden Seç
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="relative w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                                <i className="fat fa-file-arrow-up text-3xl text-emerald-500/60 mb-2"></i>
                                                                <p className="text-xs font-bold text-slate-500">PDF veya Görsel Yükle</p>
                                                                <label className="absolute inset-0 w-full h-full cursor-pointer">
                                                                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, 'newDocData')} className="hidden" />
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button onClick={handleAddDocument} disabled={isUploadingDoc || !newDocType || !newDocData} className="w-full py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex items-center justify-center gap-2">
                                                        {isUploadingDoc ? <i className="fat fa-spinner-third animate-spin"></i> : <i className="fat fa-upload"></i>} Dokümanı Ekle
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Document List */}
                                            <div className="md:col-span-2">
                                                <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs mb-4">Mevcut Dokümanlar ({employeeDocuments.length})</h3>
                                                {employeeDocuments.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 h-full max-h-[250px]">
                                                        <i className="fat fa-folder-open text-3xl text-slate-300 dark:text-slate-600 mb-2"></i>
                                                        <p className="text-sm font-bold text-slate-400">Kayıtlı doküman bulunamadı.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {employeeDocuments.map(doc => (
                                                            <div key={doc.id} className="relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                                                    {doc.documentData && doc.documentData.startsWith('data:application/pdf') ? (
                                                                        <i className="fat fa-file-pdf text-2xl text-red-500 outline outline-1 outline-red-200/50 p-2 rounded-lg bg-red-50 shadow-sm"></i>
                                                                    ) : (
                                                                        <img src={doc.documentData} alt={doc.documentType} className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={doc.documentType}>{doc.documentType}</p>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                                                </div>
                                                                <button onClick={() => handleRemoveDocument(doc.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-sm border border-red-100" title="Sil">
                                                                    <i className="fat fa-trash text-xs"></i>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 flex justify-end gap-3 shrink-0 rounded-b-[40px]">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                {activeTab === 'documents' ? tc('close') || 'Kapat' : tc('cancel')}
                            </button>
                            {activeTab === 'general' && (
                                <button type="submit" form="courierGeneralForm" className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                    {tc('save')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && selectedCourier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-2xl shadow-lg border border-slate-200 dark:border-slate-700 my-auto flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 shrink-0 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <div>
                                <h2 className="text-2xl font-extralight text-emerald-600 dark:text-emerald-400 flex items-center gap-3 tracking-tighter uppercase">
                                    <i className="fat fa-map-location-dot text-emerald-600 dark:text-emerald-400"></i> {t('deliveryHistory') || 'Teslimat Geçmişi'}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedCourier.firstName} {selectedCourier.lastName}</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
                        </div>
                        <div className="p-8 overflow-y-auto min-h-[300px]">
                            {deliveryHistory.length === 0 ? (
                                <div className="text-center text-slate-400 italic font-bold py-10">
                                    <i className="fat fa-folder-open text-4xl mb-4 block opacity-50"></i>
                                    Bu kurye için henüz bir teslimat kaydı bulunmamaktadır.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {deliveryHistory.map(history => (
                                        <div key={history.id} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-black px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded uppercase tracking-widest">
                                                        Sipariş #{history.saleId}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {new Date(history.createdAt).toLocaleString('tr-TR')}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                    <i className="fat fa-location-dot text-emerald-500 mt-1"></i>
                                                    <span className="text-sm">{history.deliveryAddress || 'Adres belirtilmemiş'}</span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0">
                                                {history.status === 'DELIVERED' ? (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black border border-emerald-200">
                                                        TESLİM EDİLDİ
                                                    </span>
                                                ) : history.status === 'CANCELLED' ? (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black border border-red-200">
                                                        İPTAL
                                                    </span>
                                                ) : history.status === 'IN_TRANSIT' ? (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-black border border-amber-200">
                                                        YOLDA
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-black border border-slate-200">
                                                        {history.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
