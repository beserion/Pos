'use client';
import React, { useState, useEffect, Fragment } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';
import { API_URL } from '@/lib/apiConfig';

interface Location {
    id: number;
    name: string;
}

interface Zone {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    location: Location;
}

interface Table {
    id: number;
    name: string;
    capacity: number;
    status: string;
    isActive: boolean;
    zoneId?: number;
    zone?: { id: number };
}

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const t = useTranslations('Zones');
    const tc = useTranslations('Common');
    const [zones, setZones] = useState<Zone[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: 0, name: '', description: '', locationId: 0, isActive: true });

    // Table Management States
    const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [allTables, setAllTables] = useState<Table[]>([]);
    const [newTableData, setNewTableData] = useState({ name: '', capacity: 4 });

    // Mappings States
    const [expandedZoneId, setExpandedZoneId] = useState<number | null>(null);
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [outputProfiles, setOutputProfiles] = useState<any[]>([]);
    const [zoneMappings, setZoneMappings] = useState<any[]>([]);
    const [loadingMappings, setLoadingMappings] = useState(false);

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [zonesRes, locsRes, tablesRes, ptRes, whRes, prRes] = await Promise.all([
                axios.get(`${API_URL}/zones`, config),
                axios.get(`${API_URL}/locations`, config),
                axios.get(`${API_URL}/tables`, config),
                axios.get(`${API_URL}/product-types`, config),
                axios.get(`${API_URL}/warehouses`, config),
                axios.get(`${API_URL}/output-profiles`, config)
            ]);
            setZones(zonesRes.data);
            setLocations(locsRes.data);
            setAllTables(tablesRes.data);
            setProductTypes(ptRes.data || []);
            setWarehouses(whRes.data || []);
            setOutputProfiles(prRes.data || []);
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
            const payload = {
                name: formData.name,
                description: formData.description,
                isActive: formData.isActive,
                location: { id: formData.locationId }
            };

            if (formData.id === 0) {
                await axios.post(API_URL + '/zones', payload, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess').replace('silindi', 'eklendi'), icon: 'success' });
            } else {
                await axios.put(`${API_URL}/zones/${formData.id}`, payload, config);
                toastSwal({ title: tc('success'), text: t('deleteSuccess').replace('silindi', 'güncellendi'), icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving zone', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({
            title: t('deleteConfirmTitle'),
            text: t('deleteConfirmText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tc('confirmDelete'),
            cancelButtonText: tc('cancel')
        });

        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`${API_URL}/zones/${id}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                toastSwal({ title: tc('success'), text: t('deleteSuccess'), icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting zone', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    const openModal = (zone?: Zone) => {
        if (zone) setFormData({ id: zone.id, name: zone.name, description: zone.description, locationId: zone.location?.id || 0, isActive: zone.isActive });
        else setFormData({ id: 0, name: '', description: '', locationId: locations[0]?.id || 0, isActive: true });
        setIsModalOpen(true);
    };

    const handleManageTables = (zone: Zone) => {
        setSelectedZone(zone);
        setNewTableData({ name: '', capacity: 4 });
        setIsTablesModalOpen(true);
    };

    const handleManageMappings = async (zone: Zone) => {
        if (expandedZoneId === zone.id) {
            setExpandedZoneId(null);
            return;
        }
        
        setExpandedZoneId(zone.id);
        setLoadingMappings(true);
        if (!user?.token) return;
        
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await axios.get(`${API_URL}/zones/${zone.id}/mappings`, config);
            
            // Veriyi productType'lara göre eşleştir
            const currentMappings = res.data || [];
            
            const formMappings = productTypes.map(pt => {
                const existing = currentMappings.find((m: any) => m.productTypeId === pt.id);
                return {
                    productTypeId: pt.id,
                    warehouseId: existing?.warehouse?.id || existing?.warehouseId || 0,
                    outputProfileId: existing?.outputProfile?.id || existing?.outputProfileId || 0,
                };
            });
            
            setZoneMappings(formMappings);
        } catch (error) {
            console.error('Error fetching mappings', error);
            showSwal({ title: tc('error'), text: 'Eşleşmeler yüklenemedi', icon: 'error' });
        } finally {
            setLoadingMappings(false);
        }
    };

    const handleMappingChange = (productTypeId: number, field: string, value: number) => {
        setZoneMappings(prev => prev.map(m => 
            m.productTypeId === productTypeId ? { ...m, [field]: value } : m
        ));
    };

    const handleSaveMappings = async (zoneId: number) => {
        if (!user?.token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            
            // Yalnızca geçerli değerleri (0 olmayan) yolla
            const payload = zoneMappings.map(m => ({
                productTypeId: m.productTypeId,
                warehouseId: m.warehouseId === 0 ? null : m.warehouseId,
                outputProfileId: m.outputProfileId === 0 ? null : m.outputProfileId,
            }));

            await axios.put(`${API_URL}/zones/${zoneId}/mappings`, payload, config);
            toastSwal({ title: tc('success'), text: 'Eşleşmeler başarıyla kaydedildi.', icon: 'success' });
            setExpandedZoneId(null);
        } catch (error) {
            console.error('Error saving mappings', error);
            showSwal({ title: tc('error'), text: 'Eşleşmeler kaydedilemedi.', icon: 'error' });
        }
    };

    const handleAddTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token || !selectedZone) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = {
                name: newTableData.name,
                capacity: newTableData.capacity,
                status: 'BOŞ',
                isActive: true,
                zone: { id: selectedZone.id }
            };
            await axios.post(API_URL + '/tables', payload, config);
            toastSwal({ title: tc('success'), text: tc('saved'), icon: 'success' });
            setNewTableData({ name: '', capacity: 4 });
            fetchData(); // Refresh both zones and tables
        } catch (error: any) {
            console.error('Error adding table', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || tc('error'), icon: 'error' });
        }
    };

    const handleDeleteTable = async (id: number) => {
        if (!user?.token) return;
        const result = await showSwal({
            title: tc('confirmDelete'),
            text: 'Masa silinecek, emin misiniz?',
            icon: 'warning',
            showCancelButton: true
        });
        if (result.isConfirmed) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.delete(`${API_URL}/tables/${id}`, config);
                toastSwal({ title: tc('success'), text: tc('success'), icon: 'success' });
                fetchData();
            } catch (error) {
                console.error('Error deleting table', error);
                showSwal({ title: tc('error'), text: tc('error'), icon: 'error' });
            }
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-layer-group me-3 text-indigo-600 dark:text-indigo-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-indigo-600 dark:text-indigo-400 leading-none uppercase tracking-[0.25em]">{t('title')}</h3>
                            <div className="h-1 w-1/2 bg-gradient-to-r from-indigo-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">{t('subtitle')}</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> {t('newZone')}
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> {tc('back')}
                        </button>
                    </div>
                </div>

                {/* KPI Bar - cardrighticon */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-[0_8px_30px_-5px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <i className="fat fa-shop text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('activeBranchCount')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{locations.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <i className="fat fa-grid-2 text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalZones')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{zones.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-[0_8px_30px_-5px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="fat fa-table-cells text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalTables')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{allTables.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-[32px] border border-white dark:border-slate-700 flex items-center justify-between transition-all hover:border-rose-300 dark:hover:border-rose-500/40 hover:shadow-[0_8px_30px_-5px_rgba(244,63,94,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <i className="fat fa-users-rays text-3xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('tableCapacity')}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{allTables.reduce((a, b) => a + (b.capacity || 0), 0)}</h3>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{tc('loading')}</p>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '40px' }}>{t('tableId')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableBranch')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableName')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tableDesc')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tableTableCount')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('tableCapacity')}</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('tableActions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {zones.map(z => (
                                        <Fragment key={z.id}>
                                        <tr className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all group">
                                            <td className="px-8 py-3">
                                                <span className="text-sm font-black text-slate-400">#{z.id}</span>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <i className="fat fa-building text-slate-400 text-xs"></i>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{z.location?.name || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <i className="fat fa-border-all"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white tracking-tight leading-none text-lg capitalize">{z.name}</p>
                                                        <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${z.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {z.isActive ? t('activeStatus') : tc('passive')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-3">
                                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xs">
                                                    {z.description || t('noDescription')}
                                                </p>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-sm border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                                                    {allTables.filter(tbl => (tbl.zoneId === z.id || tbl.zone?.id === z.id)).length}
                                                </span>
                                            </td>
                                            <td className="px-8 py-3 text-center">
                                                <span className="px-4 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-black text-sm border border-rose-100 dark:border-rose-500/20 shadow-sm">
                                                    {allTables.filter(tbl => (tbl.zoneId === z.id || tbl.zone?.id === z.id)).reduce((a, b) => a + (b.capacity || 0), 0)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex gap-2 justify-end transition-all">
                                                    <button onClick={() => handleManageMappings(z)} className={`w-10 h-10 ${expandedZoneId === z.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'} hover:text-white hover:bg-indigo-600 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-500/20 transition-all flex items-center justify-center`} title="Hedef Eşleşmeleri">
                                                        <i className="fat fa-network-wired text-lg"></i>
                                                    </button>
                                                    <button onClick={() => openModal(z)} className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-500/20 transition-all flex items-center justify-center">
                                                        <i className="fat fa-pen-field text-lg"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(z.id)} className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-600 hover:text-white hover:bg-red-600 rounded-xl shadow-sm border border-red-100 dark:border-red-500/20 transition-all flex items-center justify-center">
                                                        <i className="fat fa-trash-can text-lg"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedZoneId === z.id && (
                                            <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700/50">
                                                <td colSpan={7} className="p-6">
                                                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                                                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                                            <div>
                                                                <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                                    <i className="fat fa-network-wired text-indigo-500"></i> Zone - Hedef Eşleşmeleri
                                                                </h4>
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                                    {z.name} alanından verilen siparişlerin ürün cinsine göre gideceği hedefler.
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setExpandedZoneId(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all">
                                                                    Kapat
                                                                </button>
                                                                <button onClick={() => handleSaveMappings(z.id)} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2">
                                                                    <i className="fat fa-floppy-disk"></i> Kaydet
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {loadingMappings ? (
                                                            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead>
                                                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                                                            <th className="pb-3 pl-2">Ürün Cinsi</th>
                                                                            <th className="pb-3 px-2">Kaynak Depo</th>
                                                                            <th className="pb-3 pr-2 text-indigo-500">Çıktı Profili</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                                        {productTypes.map(pt => {
                                                                            const mapRow = zoneMappings.find(m => m.productTypeId === pt.id) || {};
                                                                            return (
                                                                                <tr key={pt.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all">
                                                                                    <td className="py-3 pl-2">
                                                                                        <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{pt.name}</div>
                                                                                    </td>
                                                                                    <td className="py-3 px-2">
                                                                                        <select 
                                                                                            value={mapRow.warehouseId || 0}
                                                                                            onChange={(e) => handleMappingChange(pt.id, 'warehouseId', parseInt(e.target.value))}
                                                                                            className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 dark:text-slate-300"
                                                                                        >
                                                                                            <option value={0}>Varsayılan Depo</option>
                                                                                            {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                                                                        </select>
                                                                                    </td>
                                                                                    <td className="py-3 pr-2">
                                                                                        <select 
                                                                                            value={mapRow.outputProfileId || 0}
                                                                                            onChange={(e) => handleMappingChange(pt.id, 'outputProfileId', parseInt(e.target.value))}
                                                                                            className="w-full text-xs font-bold bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20 outline-none text-indigo-700 dark:text-indigo-300"
                                                                                        >
                                                                                            <option value={0}>Yok (Varsayılan Profil)</option>
                                                                                            {outputProfiles.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                                                                                        </select>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </Fragment>
                                    ))}
                                    {zones.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-40">
                                                    <i className="fat fa-clone text-6xl mb-4 text-slate-300"></i>
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">{t('notFound')}</p>
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

            {/* Tables Management Modal */}
            {isTablesModalOpen && selectedZone && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[48px] w-full max-w-5xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col md:flex-row h-[85vh]">
                        {/* Left Side: Table List */}
                        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100 dark:border-slate-700/50 overflow-hidden">
                            <div className="p-10 shrink-0">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                        <i className="fat fa-table-cells text-2xl"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-none uppercase tracking-tighter mb-1">{selectedZone.name} Masaları</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedZone.location?.name} | Mevcut Masalar Listesi</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {allTables.filter(t => (t.zoneId === selectedZone.id || t.zone?.id === selectedZone.id)).length > 0 ? (
                                        allTables.filter(t => (t.zoneId === selectedZone.id || t.zone?.id === selectedZone.id)).map(tbl => (
                                            <div key={tbl.id} className="group bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 font-black shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        <i className="fat fa-table"></i>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white leading-none mb-1 uppercase tracking-tight">{tbl.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tbl.capacity} Kişilik</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteTable(tbl.id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100 dark:border-rose-900/30 transition-all opacity-0 group-hover:opacity-100">
                                                    <i className="fat fa-trash-can text-sm"></i>
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 italic">
                                            <i className="fat fa-table-slash text-5xl mb-4"></i>
                                            <p className="text-sm font-black uppercase tracking-widest">Henüz masa tanımlanmamış</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Quick Add */}
                        <div className="w-full md:w-[380px] bg-slate-50/50 dark:bg-slate-900/30 p-10 flex flex-col shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-10">
                                    <h4 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Hızlı Masa Ekle</h4>
                                    <button onClick={() => setIsTablesModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                                        <i className="fat fa-xmark text-lg"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleAddTable} className="space-y-6 flex-1">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Masa Adı / No</label>
                                        <div className="relative">
                                            <i className="fat fa-tag absolute left-5 top-4 text-indigo-500/50"></i>
                                            <input type="text" required value={newTableData.name} onChange={(e) => setNewTableData({ ...newTableData, name: e.target.value })} className="w-full pl-14 pr-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl text-slate-800 dark:text-white font-black text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" placeholder="Örn: M-101" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kapasite (Kişi)</label>
                                        <div className="relative">
                                            <i className="fat fa-users absolute left-5 top-4 text-indigo-500/50"></i>
                                            <input type="number" required min="1" value={newTableData.capacity} onChange={(e) => setNewTableData({ ...newTableData, capacity: parseInt(e.target.value) })} className="w-full pl-14 pr-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl text-slate-800 dark:text-white font-black text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button type="submit" className="w-full py-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3">
                                            <i className="fat fa-plus-circle text-lg"></i> Listeye Ekle
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700/50">
                                    <p className="text-[10px] text-slate-400 font-black uppercase leading-relaxed text-center italic">
                                        Eklediğiniz masalar anında bu şubedeki {selectedZone.name} bölümüne tanımlanacaktır.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-4xl shadow-lg overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0 h-[100px]">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-indigo-600`}></i>
                                    {formData.id === 0 ? t('modalNew') : t('modalEdit')}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-0">{t('modalSubtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>
                        <div className="flex-1 overflow-hidden w-full flex flex-col">
                            <form onSubmit={handleSave} className="flex flex-col h-full w-full">
                                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelBranch')}</label>
                                        <div className="relative">
                                            <i className="fat fa-building absolute left-4 top-4 text-indigo-500/50"></i>
                                            <div className="-m-2 w-full">
                                                <SearchableSelect
                                                    value={formData.locationId}
                                                    onChange={(val) => setFormData({ ...formData, locationId: parseInt(val.toString()) || 0 })}
                                                    options={[
                                                        { value: 0, label: t('selectBranch') },
                                                        ...locations.map(loc => ({ value: loc.id, label: loc.name }))
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelName')}</label>
                                        <div className="relative">
                                            <i className="fat fa-tag absolute left-4 top-3.5 text-indigo-500/50"></i>
                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" placeholder={t('placeholderName')} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelDesc')}</label>
                                        <div className="relative">
                                            <i className="fat fa-sticky-note absolute left-4 top-4 text-indigo-500/50"></i>
                                            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-shadow" rows={3} placeholder={t('placeholderDesc')}></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                                    </button>
                                    <button type="submit" disabled={formData.locationId === 0} className="w-[200px] py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        <i className="fat fa-check text-lg"></i> {t('saveButton')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
