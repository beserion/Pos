'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import { API_URL } from '@/lib/apiConfig';

export function PageClient() {
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    
    const [importingProduct, setImportingProduct] = useState(false);
    const [importingStock, setImportingStock] = useState(false);
    
    const productFileRef = useRef<HTMLInputElement>(null);
    const stockFileRef = useRef<HTMLInputElement>(null);

    const handleImport = async (type: 'product' | 'stock', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.token) return;

        const setImporting = type === 'product' ? setImportingProduct : setImportingStock;
        const endpoint = type === 'product' ? '/products/import' : '/stock-cards/import';
        const label = type === 'product' ? 'Ürün' : 'Stok kartı';

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${API_URL}${endpoint}`, formData, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { addedCount, updatedCount } = res.data;
            showSwal({
                title: tc('success'),
                text: `${addedCount} ${label} eklendi, ${updatedCount} ${label} güncellendi.`,
                icon: 'success'
            });
        } catch (error: any) {
            console.error('Import error', error);
            showSwal({
                title: tc('error'),
                text: error?.response?.data?.message || 'İçe aktarma sırasında bir hata oluştu.',
                icon: 'error'
            });
        } finally {
            setImporting(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                    <div className="flex items-center">
                        <i className="fat fa-file-import me-3 text-amber-600 dark:text-amber-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-amber-600 dark:text-amber-400 leading-none uppercase tracking-[0.25em]">VERİ İÇE AKTAR</h3>
                            <div className="h-1 w-1/1 bg-gradient-to-r from-amber-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Excel Dosyasından Toplu Aktarım</h5>
                        </div>
                    </div>
                    <button 
                        onClick={() => router.push(`/${locale}/admin`)} 
                        className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <i className="fat fa-reply"></i> {tc('back')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Product Import Card */}
                    <div className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-10 rounded-[48px] border border-white dark:border-slate-700 flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-500/10">
                        <div className="w-24 h-24 rounded-3xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 transition-transform group-hover:rotate-12">
                            <i className="fat fa-mug-hot text-5xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">ÜRÜN LİSTESİ</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                            Satış ürünlerinizi, fiyatlarını ve kategorilerini <br/> Excel dosyasından toplu olarak yükleyin.
                        </p>
                        
                        <button
                            onClick={() => productFileRef.current?.click()}
                            disabled={importingProduct}
                            className="w-full py-4 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <i className={`fat ${importingProduct ? 'fa-spinner-third fa-spin' : 'fa-upload'}`}></i>
                            {importingProduct ? 'YÜKLENİYOR...' : 'DOSYA SEÇİN'}
                        </button>
                        <input 
                            type="file" 
                            ref={productFileRef} 
                            onChange={(e) => handleImport('product', e)} 
                            accept=".xls,.xlsx" 
                            className="hidden" 
                        />
                    </div>

                    {/* Stock Card Import Card */}
                    <div className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-10 rounded-[48px] border border-white dark:border-slate-700 flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/10">
                        <div className="w-24 h-24 rounded-3xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 transition-transform group-hover:-rotate-12">
                            <i className="fat fa-boxes-stacked text-5xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">STOK KARTLARI</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                            Envanter öğelerinizi, birim dönüşümlerini ve <br/> maliyetlerini Excel dosyasından toplu olarak yükleyin.
                        </p>
                        
                        <button
                            onClick={() => stockFileRef.current?.click()}
                            disabled={importingStock}
                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <i className={`fat ${importingStock ? 'fa-spinner-third fa-spin' : 'fa-upload'}`}></i>
                            {importingStock ? 'YÜKLENİYOR...' : 'DOSYA SEÇİN'}
                        </button>
                        <input 
                            type="file" 
                            ref={stockFileRef} 
                            onChange={(e) => handleImport('stock', e)} 
                            accept=".xls,.xlsx" 
                            className="hidden" 
                        />
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-12 max-w-5xl mx-auto bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-[32px] p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <i className="fat fa-info"></i>
                    </div>
                    <div>
                        <h4 className="text-blue-900 dark:text-blue-300 font-bold text-sm mb-1 uppercase tracking-wider">Önemli Bilgilendirme</h4>
                        <p className="text-blue-800/70 dark:text-blue-300/60 text-xs font-medium leading-relaxed">
                            Yükleyeceğiniz Excel dosyasındaki kolon başlıklarının sistem ile uyumlu olduğundan emin olun. 
                            Mevcut veriler <strong>SKU / Kod</strong> bazlı eşleştirilir; eşleşen kayıtlar güncellenir, bulunamayanlar yeni kayıt olarak eklenir.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
