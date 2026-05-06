import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import axios from 'axios';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/apiConfig';

interface StockCard {
    id: number;
    name: string;
    sku: string;
}

interface StockUpsertProps {
    formData: any;
    setFormData: (data: any) => void;
    onSave: (e: React.FormEvent) => void;
    onClose: () => void;
}

export default function StockUpsert({ formData, setFormData, onSave, onClose }: StockUpsertProps) {
    const t = useTranslations('Admin');
    const tc = useTranslations('Common');
    const [stockCards, setStockCards] = useState<StockCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStockCards = async () => {
            try {
                const token = Cookies.get('token');
                const res = await axios.get(API_URL + '/stock-cards?limit=1000', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStockCards(res.data.data || []);
            } catch (error) {
                console.error('Error fetching stock cards:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStockCards();
    }, []);

    return (
        <div className="w-full flex-1 flex flex-col h-full overflow-hidden">
            <form onSubmit={onSave} className="flex flex-col h-full w-full">
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Stock Card Selection */}
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Stok Kartı</label>
                            <div className="relative">
                                <i className="fat fa-tag absolute left-4 top-4 text-emerald-500/50"></i>
                                <select 
                                    required 
                                    disabled={formData.id !== 0}
                                    value={formData.stockCardId || ''} 
                                    onChange={(e) => setFormData({ ...formData, stockCardId: parseInt(e.target.value) })} 
                                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <option value="">Stok Kartı Seçiniz...</option>
                                    {stockCards.map((sc) => (
                                        <option key={sc.id} value={sc.id}>{sc.name} ({sc.sku || sc.id})</option>
                                    ))}
                                </select>
                                <i className="fat fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Miktar</label>
                            <div className="relative">
                                <i className="fat fa-number-1 absolute left-4 top-4 text-emerald-500/50"></i>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required 
                                    value={formData.quantity || 0} 
                                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" 
                                    placeholder="Miktar" 
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Depo Konumu</label>
                            <div className="relative">
                                <i className="fat fa-map-location-dot absolute left-4 top-4 text-emerald-500/50"></i>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.location || ''} 
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" 
                                    placeholder="Konum (Raf, Dolap vb.)" 
                                />
                            </div>
                        </div>

                        {/* Lot Number */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lot / Parti No</label>
                            <div className="relative">
                                <i className="fat fa-barcode-read absolute left-4 top-4 text-emerald-500/50"></i>
                                <input 
                                    type="text" 
                                    value={formData.lotNumber || ''} 
                                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })} 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" 
                                    placeholder="Opsiyonel" 
                                />
                            </div>
                        </div>

                        {/* Barcode */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelBarcode')}</label>
                            <div className="relative">
                                <i className="fat fa-barcode absolute left-4 top-4 text-emerald-500/50"></i>
                                <input 
                                    type="text" 
                                    value={formData.barcode || ''} 
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" 
                                    placeholder={t('labelBarcode')} 
                                />
                            </div>
                        </div>

                        {/* Expiration Date */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">SKT</label>
                            <div className="relative">
                                <i className="fat fa-calendar-clock absolute left-4 top-4 text-emerald-500/50"></i>
                                <input 
                                    type="date" 
                                    value={formData.expirationDate || ''} 
                                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })} 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" 
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('labelDescription')}</label>
                            <div className="relative">
                                <i className="fat fa-file-lines absolute left-4 top-4 text-emerald-500/50"></i>
                                <textarea 
                                    rows={3}
                                    value={formData.description || ''} 
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-shadow" 
                                    placeholder="..." 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 shrink-0 flex justify-between h-[100px] items-center">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="w-[200px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <i className="fat fa-xmark text-lg"></i> {tc('cancel')}
                    </button>
                    <button 
                        type="submit" 
                        className="w-[200px] py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fat fa-check text-lg"></i> {tc('save')}
                    </button>
                </div>
            </form>
        </div>
    );
}
