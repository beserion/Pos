'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useLocale } from 'next-intl';
import SearchableSelect from '@/components/SearchableSelect';
import { useParameters } from '../../utils/useParameters';
import { API_URL } from '@/lib/apiConfig';

interface Printer { id: number; name: string; }

interface OutputProfile {
    id: number;
    name: string;
    profileType: 'STANDARD' | 'Z_REPORT';
    mainPrinterId: number;
    mainPrinter?: Printer | null;
    kdsEnabled: boolean;
    kdsTarget: string;
    infoPrinterId: number;
    infoPrinter?: Printer | null;
    copyCount: number;
    warnIfNoPrinter: boolean;
    infoOnly: boolean;
    noOutput: boolean;
    isActive: boolean;
    soundAlert: boolean;
    textSize: string;
    fontFamily: string;
    showPrice: boolean;
    showTable: boolean;
    showWaiter: boolean;
    showPortion: boolean;
    showTitle: boolean;
    showLogo: boolean;
    showExchangeRates: boolean;
    showWaiterSales: boolean;
    groupByCategory: boolean;
    customTitle?: string;
    showProductSummary: boolean;
    showTransactionAnalysis: boolean;
    logoPath?: string;
    showCurrencyDetails: boolean;
    showVatSummary: boolean;
    showDiscountDetails: boolean;
    showGuestStats: boolean;
    showDepartmentSales: boolean;
}

const EMPTY: OutputProfile = {
    id: 0, name: '', profileType: 'STANDARD', mainPrinterId: 0, kdsEnabled: false, kdsTarget: '', infoPrinterId: 0, copyCount: 1,
    warnIfNoPrinter: true, infoOnly: false, noOutput: false, isActive: true,
    soundAlert: false, textSize: 'NORMAL', fontFamily: 'A', showPrice: false, showTable: true,
    showWaiter: true, showPortion: true, showTitle: true, showLogo: false,
    showExchangeRates: true, showWaiterSales: true, groupByCategory: true, customTitle: '',
    showProductSummary: true, showTransactionAnalysis: true, logoPath: '',
    showCurrencyDetails: true, showVatSummary: true, showDiscountDetails: true, showGuestStats: true, showDepartmentSales: true
};

export function PageClient() {
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();
    const { params } = useParameters();
    const [items, setItems] = useState<OutputProfile[]>([]);
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<OutputProfile>({ ...EMPTY });
    const [activeTab, setActiveTab] = useState<'general' | 'design'>('general');

    useEffect(() => { if (user?.token) fetchData(); else if (user === null) setLoading(false); }, [user]);

    const fetchData = async () => {
        if (!user?.token) return;
        try {
            const h = { headers: { Authorization: `Bearer ${user.token}` } };
            const [res, pRes] = await Promise.all([
                axios.get(`${API_URL}/output-profiles`, h),
                axios.get(`${API_URL}/printers`, h),
            ]);
            setItems(res.data);
            setPrinters(pRes.data);
        } catch { showSwal({ title: 'Hata', text: 'Veri yüklenemedi', icon: 'error' }); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.token) return;
        try {
            const h = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = { ...formData };
            if (payload.id === 0) {
                const { id, mainPrinter, infoPrinter, ...data } = payload as any;
                await axios.post(`${API_URL}/output-profiles`, data, h);
                toastSwal({ title: 'Başarılı', text: 'Kaydedildi', icon: 'success' });
            } else {
                const { mainPrinter, infoPrinter, ...data } = payload as any;
                await axios.put(`${API_URL}/output-profiles/${payload.id}`, data, h);
                toastSwal({ title: 'Başarılı', text: 'Güncellendi', icon: 'success' });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            showSwal({ title: 'Hata', text: err?.response?.data?.message || 'Kayıt hatası', icon: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showSwal({ title: 'Emin misiniz?', text: 'Bu çıktı profili silinecek.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sil', cancelButtonText: 'İptal' });
        if (result.isConfirmed && user?.token) {
            try {
                await axios.delete(`${API_URL}/output-profiles/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
                toastSwal({ title: 'Silindi', text: 'Profil silindi', icon: 'success' });
                fetchData();
            } catch { showSwal({ title: 'Hata', text: 'Silme hatası', icon: 'error' }); }
        }
    };

    const openModal = (item?: OutputProfile) => {
        setFormData(item ? {
            ...item,
            profileType: item.profileType || 'STANDARD',
            soundAlert: item.soundAlert ?? false,
            textSize: item.textSize || 'NORMAL',
            fontFamily: item.fontFamily || 'A',
            showPrice: item.showPrice ?? false,
            showTable: item.showTable ?? true,
            showWaiter: item.showWaiter ?? true,
            showPortion: item.showPortion ?? true,
            showTitle: item.showTitle ?? true,
            showLogo: item.showLogo ?? false,
            showExchangeRates: item.showExchangeRates ?? true,
            showWaiterSales: item.showWaiterSales ?? true,
            groupByCategory: item.groupByCategory ?? true,
            customTitle: item.customTitle || '',
            showProductSummary: item.showProductSummary ?? true,
            showTransactionAnalysis: item.showTransactionAnalysis ?? true,
            logoPath: item.logoPath || '',
            showCurrencyDetails: item.showCurrencyDetails ?? true,
            showVatSummary: item.showVatSummary ?? true,
            showDiscountDetails: item.showDiscountDetails ?? true,
            showGuestStats: item.showGuestStats ?? true,
            showDepartmentSales: item.showDepartmentSales ?? true
        } : { ...EMPTY });
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const applyTemplate = (type: 'kitchen' | 'customer' | 'bar' | 'kds' | 'z-report') => {
        const base = { ...formData };
        if (type === 'kitchen') {
            setFormData({ ...base, profileType: 'STANDARD', showPrice: false, showTable: true, showWaiter: true, showPortion: true, soundAlert: true, textSize: 'LARGE', kdsEnabled: true, infoOnly: false, noOutput: false });
        } else if (type === 'customer') {
            setFormData({ ...base, profileType: 'STANDARD', showPrice: true, showTable: true, showWaiter: true, showPortion: true, soundAlert: false, textSize: 'NORMAL', kdsEnabled: false, infoOnly: true, noOutput: false });
        } else if (type === 'bar') {
            setFormData({ ...base, profileType: 'STANDARD', showPrice: false, showTable: true, showWaiter: false, showPortion: false, soundAlert: true, textSize: 'NORMAL', kdsEnabled: false, infoOnly: false, noOutput: false });
        } else if (type === 'kds') {
            setFormData({ ...base, profileType: 'STANDARD', showPrice: false, showTable: true, showWaiter: true, showPortion: true, soundAlert: true, textSize: 'NORMAL', kdsEnabled: true, infoOnly: false, noOutput: true, mainPrinterId: 0, infoPrinterId: 0 });
        } else if (type === 'z-report') {
            setFormData({ ...base, name: 'GÜN SONU RAPORU', profileType: 'Z_REPORT', showPrice: true, showTable: false, showWaiter: true, showPortion: false, soundAlert: false, textSize: 'NORMAL', kdsEnabled: false, infoOnly: true, noOutput: false, showLogo: true, showExchangeRates: true, showWaiterSales: true, groupByCategory: true, showProductSummary: true, showTransactionAnalysis: true, logoPath: '', showCurrencyDetails: true, showVatSummary: true, showDiscountDetails: true, showGuestStats: true, showDepartmentSales: true });
        }
    };

    const Toggle = ({ label, value, onChange, color = 'teal', icon }: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string; icon?: string }) => (
        <div onClick={() => onChange(!value)} className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${value ? `bg-${color}-50 border-${color}-500 dark:bg-${color}-500/10` : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
            <div className="flex items-center gap-3">
                {icon && <i className={`fat ${icon} ${value ? `text-${color}-500` : 'text-slate-400'}`}></i>}
                <span className={`text-sm font-black ${value ? `text-${color}-700 dark:text-${color}-400` : 'text-slate-500'}`}>{label}</span>
            </div>
            <div className={`w-10 h-6 rounded-full border-2 flex items-center transition-all px-0.5 ${value ? `border-${color}-600 bg-${color}-600 justify-end` : 'border-slate-300 bg-slate-200 justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
            </div>
        </div>
    );

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toastSwal({ title: 'Hata', text: 'Logo boyutu 2MB\'dan küçük olmalıdır.', icon: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setFormData({ ...formData, logoPath: base64 });
            toastSwal({ title: 'Başarılı', text: 'Logo yüklendi.', icon: 'success' });
        };
        reader.readAsDataURL(file);
    };

    const renderPreview = () => {
        const eurRate = parseFloat(params.exchange_rate_eur?.toString() || '37.50');
        const usdRate = parseFloat(params.exchange_rate_usd?.toString() || '35.20');
        const gbpRate = parseFloat(params.exchange_rate_gbp?.toString() || '44.10');

        if (formData.noOutput) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-70">
                    <i className="fat fa-print-slash text-6xl text-red-400 mb-6 drop-shadow-md"></i>
                    <h3 className="text-red-600 font-black text-2xl mb-2">FİZİKSEL ÇIKTI YOK</h3>
                    <p className="text-slate-500 font-bold text-center">Bu profil yazdırma işlemi yapmaz.</p>
                    {formData.kdsEnabled && <div className="mt-6 px-6 py-2 bg-emerald-100 text-emerald-600 rounded-full font-black text-sm"><i className="fat fa-tv me-2"></i>Sadece KDS'ye Düşer</div>}
                </div>
            );
        }

        const textSizeClass = formData.textSize === 'LARGE' ? 'text-base' : formData.textSize === 'XLARGE' ? 'text-lg' : 'text-xs';
        const titleClass = formData.textSize === 'LARGE' ? 'text-xl' : formData.textSize === 'XLARGE' ? 'text-2xl' : 'text-lg';

        const isZReport = formData.profileType === 'Z_REPORT';

        if (formData.profileType === 'Z_REPORT') {
            const row = (label: string, value: string, percent?: string) => (
                <div className="flex justify-between items-baseline gap-1 leading-tight">
                    <span className="shrink-0">{label}</span>
                    <div className="flex-1 border-b border-dotted border-black/20 translate-y-[-4px]"></div>
                    <div className="shrink-0 flex gap-4">
                        <span className="font-bold">{value}</span>
                        {percent !== undefined && <span className="w-10 text-right">{percent}</span>}
                    </div>
                </div>
            );

            const sep = (char = '-') => <div className="py-1 overflow-hidden whitespace-nowrap text-[10px] leading-none opacity-50">{char.repeat(60)}</div>;

            return (
                <div className="w-full max-w-[340px] bg-white mx-auto shadow-[0_20px_100px_rgba(0,0,0,0.3)] relative flex flex-col mt-8 mb-20 border-t-[12px] border-slate-200" style={{ fontSize: formData.textSize === 'LARGE' ? '12px' : formData.textSize === 'XLARGE' ? '14px' : '10px', fontFamily: 'monospace', color: 'black' }}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-black/5"></div>

                    {/* Header Info */}
                    <div className="p-4 space-y-1 text-black font-bold uppercase">
                        <div className="flex justify-between"><span>GÜN SONU</span><span>TARİH : 06.08.2024</span></div>
                        <div className="flex justify-between"><span>KASA PEŞİN</span><span>P.TARİH : 05.08.2024</span></div>
                        <div className="flex justify-between"><span></span><span>SAAT  : 17:30:12</span></div>
                        <div className="text-right mt-2">0 ~ 112</div>
                    </div>

                    {sep('=')}

                    {/* Main Title */}
                    <div className="text-center my-6 space-y-4 px-4">
                        {formData.showLogo && (
                            <div className="flex justify-center mb-4">
                                {formData.logoPath ? (
                                    <img src={formData.logoPath} alt="Logo" className="max-w-[120px] max-h-[120px] object-contain grayscale" />
                                ) : (
                                    <div className="w-24 h-24 border-4 border-black flex items-center justify-center mx-auto font-black text-2xl rotate-[-2deg]">LOGO</div>
                                )}
                            </div>
                        )}
                        <h2 className="font-black text-2xl uppercase tracking-tighter scale-y-110">{formData.customTitle || 'KAPANIŞ RAPORU'}</h2>
                    </div>

                    {sep('=')}

                    <div className="px-4 space-y-6 text-black">
                        {/* Tahsilat Toplamları */}
                        <div className="space-y-1">
                            <div className="flex justify-between font-black text-xs">
                                <span>TAHSİLAT TOPLAMLARI</span>
                                <span>ORAN%</span>
                            </div>
                            {sep()}
                            <div className="space-y-1">
                                {row('TRL', '72.305,00', '35,49')}
                                {row('KREDİ', '131.425,00', '64,51')}
                                {row('CARİ', '0,00', '0')}
                            </div>
                            {sep()}
                            <div className="flex justify-between font-black text-sm pt-1">
                                <span>TOPLAM</span>
                                <div className="flex gap-4"><span>203.730,00</span><span className="w-10 text-right">100</span></div>
                            </div>
                        </div>

                        {/* İşlem Toplamları */}
                        {formData.showTransactionAnalysis && (
                            <div className="space-y-1">
                                <div className="flex justify-between font-black text-xs">
                                    <span>İŞLEM TOPLAMLARI</span>
                                    <span>ORAN%</span>
                                </div>
                                {sep()}
                                <div className="space-y-1">
                                    {row('SATIŞ', '203.730,00', '100')}
                                    {row('İKRAM', '0,00', '0')}
                                    {row('İADE', '38.895,00', '19,09')}
                                    {row('SİLİNEN', '0,00', '0')}
                                </div>
                                {sep()}
                                <div className="flex justify-between font-black text-sm pt-1">
                                    <span>TOPLAM</span>
                                    <div className="flex gap-4"><span>203.730,00</span><span className="w-10 text-right">100</span></div>
                                </div>
                            </div>
                        )}

                        {/* Ürün Satış Özeti */}
                        {formData.showProductSummary && (
                            <div className="space-y-8">
                                <div className="font-black text-sm text-center border-y-2 border-black py-1">ÜRÜN SATIŞ ÖZETİ</div>

                                {/* Category Example 1 */}
                                <div className="space-y-2">
                                    <div className="font-black text-[13px] underline decoration-double">BİRALAR</div>
                                    <div className="flex justify-between text-[10px] font-black italic">
                                        <span>ÜRÜN ADI</span>
                                        <div className="flex gap-10"><span>MİK</span><span>TUTAR</span></div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-baseline gap-1">
                                            <span className="truncate">EFES 50CL</span>
                                            <div className="flex-1 border-b border-dotted border-black/20 translate-y-[-4px]"></div>
                                            <div className="flex gap-10 font-bold shrink-0"><span>140</span><span className="w-20 text-right">40.987,50</span></div>
                                        </div>
                                        <div className="flex justify-between items-baseline gap-1">
                                            <span className="truncate">CORONA EXTRA</span>
                                            <div className="flex-1 border-b border-dotted border-black/20 translate-y-[-4px]"></div>
                                            <div className="flex gap-10 font-bold shrink-0"><span>8</span><span className="w-20 text-right">3.186,51</span></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between border-t border-black font-black pt-1">
                                        <span>TOPLAM</span>
                                        <span>60.228,04</span>
                                    </div>
                                </div>

                                {/* Category Example 2 */}
                                <div className="space-y-2">
                                    <div className="font-black text-[13px] underline decoration-double">İÇECEK</div>
                                    <div className="flex justify-between text-[10px] font-black italic">
                                        <span>ÜRÜN ADI</span>
                                        <div className="flex gap-10"><span>MİK</span><span>TUTAR</span></div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-baseline gap-1">
                                            <span className="truncate">BEEFEATER 70CL</span>
                                            <div className="flex-1 border-b border-dotted border-black/20 translate-y-[-4px]"></div>
                                            <div className="flex gap-10 font-bold shrink-0"><span>5</span><span className="w-20 text-right">26.342,11</span></div>
                                        </div>
                                        <div className="flex justify-between items-baseline gap-1">
                                            <span className="truncate">VOTKA ENERJİ</span>
                                            <div className="flex-1 border-b border-dotted border-black/20 translate-y-[-4px]"></div>
                                            <div className="flex gap-10 font-bold shrink-0"><span>22</span><span className="w-20 text-right">6.341,18</span></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between border-t border-black font-black pt-1">
                                        <span>TOPLAM</span>
                                        <span>103.028,41</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Departman Bazlı Satışlar */}
                        {formData.showDepartmentSales && (
                            <div className="space-y-1">
                                <div className="font-black text-xs border-b-2 border-black pb-1">DEPARTMAN BAZLI SATIŞLAR</div>
                                <div className="space-y-1 text-[11px]">
                                    {row('SALON (ANA)', '142.300,00', '70')}
                                    {row('TERAS', '40.230,00', '20')}
                                    {row('BAHÇE', '21.200,00', '10')}
                                </div>
                                {sep()}
                            </div>
                        )}

                        {/* Müşteri ve Masa İstatistikleri */}
                        {formData.showGuestStats && (
                            <div className="space-y-2">
                                <div className="font-black text-xs border-b-2 border-black pb-1">MÜŞTERİ İSTATİSTİKLERİ</div>
                                <div className="space-y-1">
                                    {row('TOPLAM MASA', '42')}
                                    {row('TOPLAM KİŞİ', '124')}
                                    {row('MASA ORTALAMA', '4.850,71')}
                                    {row('KİŞİ ORTALAMA', '1.642,98')}
                                </div>
                                {sep()}
                            </div>
                        )}

                        {/* KDV Özeti */}
                        {formData.showVatSummary && (
                            <div className="space-y-1">
                                <div className="font-black text-xs border-b-2 border-black pb-1">KDV ÖZETİ</div>
                                <div className="flex justify-between font-black text-[10px] italic">
                                    <span>ORAN</span>
                                    <div className="flex gap-10"><span>MATRAH</span><span>KDV</span></div>
                                </div>
                                {sep()}
                                <div className="space-y-1 text-[11px]">
                                    <div className="flex justify-between">
                                        <span>%1</span>
                                        <div className="flex gap-10"><span>12.300,00</span><span className="w-20 text-right">123,00</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>%10</span>
                                        <div className="flex gap-10"><span>85.000,00</span><span className="w-20 text-right">8.500,00</span></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>%20</span>
                                        <div className="flex gap-10"><span>88.522,50</span><span className="w-20 text-right">17.704,50</span></div>
                                    </div>
                                </div>
                                {sep()}
                                <div className="flex justify-between font-black text-[11px]">
                                    <span>TOPLAM KDV</span>
                                    <span>26.327,50</span>
                                </div>
                                {sep()}
                            </div>
                        )}

                        {/* İndirim ve İkram Detayları */}
                        {formData.showDiscountDetails && (
                            <div className="space-y-1">
                                <div className="font-black text-xs border-b-2 border-black pb-1">İNDİRİM / İKRAM ANALİZİ</div>
                                <div className="space-y-1">
                                    {row('TOPLAM İNDİRİM', '1.250,00')}
                                    {row('TOPLAM İKRAM', '3.400,00')}
                                    {row('TOPLAM TENZİLAT', '4.650,00')}
                                </div>
                                {sep()}
                            </div>
                        )}

                        {/* Döviz Tahsilat Analizi */}
                        {formData.showCurrencyDetails && (
                            <div className="space-y-1">
                                <div className="font-black text-xs border-b-2 border-black pb-1">DÖVİZ TAHSİLAT ANALİZİ</div>
                                <div className="space-y-1 text-[10px] font-bold">
                                    <div className="flex justify-between">
                                        <span>EURO ({eurRate.toFixed(2)})</span>
                                        <span>120.00 EUR</span>
                                    </div>
                                    <div className="text-right text-[9px] opacity-70">≈ {(120 * eurRate).toFixed(2)} TL</div>
                                    
                                    <div className="flex justify-between">
                                        <span>DOLAR ({usdRate.toFixed(2)})</span>
                                        <span>85.50 USD</span>
                                    </div>
                                    <div className="text-right text-[9px] opacity-70">≈ {(85.5 * usdRate).toFixed(2)} TL</div>
                                </div>
                                {sep()}
                            </div>
                        )}

                        {formData.showWaiterSales && (
                            <div className="space-y-2">
                                <div className="font-black text-xs border-b-2 border-black pb-1">GARSON SATIŞ TOPLAMLARI</div>
                                <div className="space-y-1">
                                    {row('GÜRKAN GÜL (303)', '38.090,00')}
                                    {row('AHMET YOLCU (4848)', '23.980,00')}
                                    {row('MEHMET K. (102)', '14.500,00')}
                                </div>
                                {sep()}
                                <div className="flex justify-between font-black text-sm">
                                    <span>TOPLAM</span>
                                    <span>203.730,00</span>
                                </div>
                            </div>
                        )}

                        {/* Brand Footer */}
                        <div className="text-center pt-16 pb-8 space-y-2">
                            {sep('*')}
                            <div className="font-black text-[12px] tracking-[0.2em]">
                                {params.company_name || 'PosNetX - Yeni Nesil Pos'}
                            </div>
                            {sep('*')}
                        </div>
                    </div>

                    <div className="w-full h-10 shrink-0 mt-8" style={{ backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x', backgroundImage: 'radial-gradient(circle at 10px 15px, transparent 12px, white 13px)' }}></div>
                </div>
            );
        }

        const eurTotal = (765.00 / eurRate).toFixed(2);
        const usdTotal = (765.00 / usdRate).toFixed(2);
        const gbpTotal = (765.00 / gbpRate).toFixed(2);

        return (
            <div className="w-full max-w-[340px] bg-white mx-auto shadow-2xl relative pb-10 flex flex-col mt-8" style={{ fontFamily: formData.fontFamily === 'B' ? 'monospace' : '"Courier New", Courier, monospace', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' }}>
                <div className="absolute top-[-4px] left-0 right-0 h-2 bg-gradient-to-b from-black/5 to-transparent"></div>
                <div className="p-6">
                    {/* Header */}
                    {formData.showLogo && (
                        <div className="flex justify-center mb-4 opacity-80">
                            <div className="w-16 h-16 border-2 border-slate-300 flex items-center justify-center text-slate-300 rounded-lg">LOGO</div>
                        </div>
                    )}
                    {formData.showTitle && (
                        <div className={`text-center font-black ${titleClass} border-b-2 border-dashed border-slate-300 pb-3 mb-3 text-slate-800`}>
                            {formData.customTitle || (formData.infoOnly && formData.showPrice ? 'ADİSYON' : formData.infoOnly ? 'BİLGİ FİŞİ' : 'MUTFAK SİPARİŞİ')}
                        </div>
                    )}

                    {/* Info */}
                    <div className="mb-4">
                        {formData.showTable && <div className={`text-center font-black text-slate-800 ${formData.textSize === 'NORMAL' ? 'text-lg' : 'text-2xl'} border-b-2 border-dashed border-slate-300 pb-2 mb-2`}>MASA 14</div>}
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                            <span>Tarih: 14:30</span>
                            <span>No: 00142</span>
                        </div>
                        {formData.showWaiter && <div className="text-xs font-bold text-slate-800 mt-1">Garson: Ahmet Y.</div>}
                    </div>

                    <div className="border-t-2 border-dashed border-slate-300 pt-3 border-b-2 pb-3 mb-4 space-y-3">
                        {/* Item 1 */}
                        <div>
                            <div className={`flex justify-between font-black text-slate-900 ${textSizeClass}`}>
                                <span>2x Adana Kebap</span>
                                {formData.showPrice && <span>450.00 TL</span>}
                            </div>
                            {formData.showPortion && <div className="text-xs font-bold text-slate-600 ps-4">+ Duble Porsiyon</div>}
                            {formData.showPortion && <div className="text-xs font-bold text-slate-600 ps-4">Not: Acısız olsun</div>}
                        </div>
                        {/* Item 2 */}
                        <div>
                            <div className={`flex justify-between font-black text-slate-900 ${textSizeClass}`}>
                                <span>1x Mevsim Salata</span>
                                {formData.showPrice && <span>90.00 TL</span>}
                            </div>
                            {formData.showPortion && <div className="text-xs font-bold text-slate-600 ps-4">Not: Nar ekşili</div>}
                        </div>
                        {/* Item 3 */}
                        <div>
                            <div className={`flex justify-between font-black text-slate-900 ${textSizeClass}`}>
                                <span>3x Ayran</span>
                                {formData.showPrice && <span>105.00 TL</span>}
                            </div>
                        </div>
                    </div>

                    {/* Waiting Items - Sadece Müşteri Fişi (Adisyon) Değilse Göster */}
                    {(!formData.infoOnly || !formData.showPrice) && (
                        <>
                            <div className="text-center font-black text-slate-800 text-sm mb-2">--- BEKLEYENLER ---</div>
                            <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4 space-y-2">
                                <div>
                                    <div className={`flex justify-between font-bold text-slate-800 ${textSizeClass}`}>
                                        <span>1x Künefe</span>
                                        {formData.showPrice && <span>120.00 TL</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Cancelled Item */}
                            <div className="text-center font-black text-slate-800 text-sm mb-2">!!! İPTAL EDİLENLER !!!</div>
                            <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4">
                                <div className={`flex justify-between font-bold text-slate-800 ${textSizeClass}`}>
                                    <span>1x IPTAL Çorba</span>
                                    {formData.showPrice && <span>0.00 TL</span>}
                                </div>
                                {formData.showPortion && <div className="text-xs font-bold text-slate-600 ps-4">Sebep: Müşteri vazgeçti</div>}
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    {formData.showPrice && (
                        <>
                            <div className={`flex justify-between font-black text-slate-900 text-lg ${formData.infoOnly ? 'pb-3 mb-3' : 'border-b-2 border-dashed border-slate-300 pb-3 mb-3'}`}>
                                <span>TOPLAM</span>
                                <span>765.00 TL</span>
                            </div>
                            {formData.infoOnly && formData.showExchangeRates && (
                                <div className="border-t-2 border-dashed border-slate-300 pt-3 text-xs font-bold text-slate-600 space-y-1">
                                    <div className="flex justify-between"><span>EUR ({eurRate.toFixed(2)})</span><span>€ {eurTotal}</span></div>
                                    <div className="flex justify-between"><span>USD ({usdRate.toFixed(2)})</span><span>$ {usdTotal}</span></div>
                                    <div className="flex justify-between"><span>GBP ({gbpRate.toFixed(2)})</span><span>£ {gbpTotal}</span></div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Copies shadow effect */}
                {formData.copyCount > 1 && (
                    <div className="absolute top-2 -right-2 bottom-2 w-full bg-white shadow-xl -z-10 border border-slate-100" style={{ transform: 'rotate(2deg)' }}></div>
                )}
                {formData.copyCount > 2 && (
                    <div className="absolute top-4 -right-4 bottom-4 w-full bg-white shadow-xl -z-20 border border-slate-100" style={{ transform: 'rotate(4deg)' }}></div>
                )}

                {/* KDS Badge */}
                {formData.kdsEnabled && (
                    <div className="absolute -right-4 top-10 bg-emerald-500 text-white font-black text-[10px] px-3 py-1 rounded-l-full shadow-md uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div> KDS İLETİMİ
                    </div>
                )}

                {/* Sound Badge */}
                {formData.soundAlert && (
                    <div className="absolute -left-4 top-20 bg-amber-500 text-white font-black text-[10px] px-3 py-1 rounded-r-full shadow-md uppercase tracking-widest flex items-center gap-1">
                        <i className="fat fa-volume-high"></i> SESLİ UYARI
                    </div>
                )}

                {/* Copies Badge */}
                {formData.copyCount > 1 && (
                    <div className="absolute -left-4 bottom-20 bg-blue-500 text-white font-black text-[10px] px-3 py-1 rounded-r-full shadow-md uppercase tracking-widest flex items-center gap-1">
                        <i className="fat fa-copy"></i> {formData.copyCount} KOPYA
                    </div>
                )}

                <div className="absolute bottom-[-10px] left-0 w-full h-5" style={{ backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x', backgroundImage: 'radial-gradient(circle at 10px 15px, transparent 12px, white 13px)' }}></div>
            </div>
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

            <div className="w-full px-[50px] py-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center">
                        <i className="fat fa-route me-3 text-cyan-600 dark:text-cyan-400" style={{ fontSize: '50px' }}></i>
                        <div>
                            <h3 className="mb-0 text-3xl font-extralight text-cyan-600 dark:text-cyan-400 leading-none uppercase tracking-[0.25em]">ÇIKTI PROFİLLERİ</h3>
                            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent rounded-full mt-2 mb-1"></div>
                            <h5 className="text-muted mb-0 text-lg font-medium text-slate-400 dark:text-slate-500 mt-0.5">Yazıcı, KDS ve bilgi fişi yönlendirme profilleri</h5>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => openModal()} className="px-6 py-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95">
                            <i className="fat fa-plus-circle text-lg"></i> Yeni Profil
                        </button>
                        <button onClick={() => router.push(`/${locale}/admin`)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                            <i className="fat fa-reply"></i> Geri
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[40px] border border-white dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest" style={{ width: '50px' }}>ID</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">PROFİL ADI</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">YAZICILAR</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ÖZELLİKLER</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İŞLEMLER</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10 transition-all group">
                                            <td className="px-6 py-4"><span className="text-sm font-black text-slate-400">#{item.id}</span></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.noOutput ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500'}`}>
                                                        <i className={`fat ${item.noOutput ? 'fa-ban' : 'fa-route'} text-lg`}></i>
                                                    </div>
                                                    <span className="font-black text-slate-800 dark:text-white text-lg">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <i className="fat fa-print text-slate-400 text-xs"></i>
                                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.mainPrinter?.name || printers.find(p => p.id === item.mainPrinterId)?.name || 'Yok'}</span>
                                                    </div>
                                                    {item.infoPrinterId > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <i className="fat fa-file-invoice text-slate-400 text-xs"></i>
                                                            <span className="text-xs font-bold text-slate-500">{item.infoPrinter?.name || printers.find(p => p.id === item.infoPrinterId)?.name || 'Yok'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5 flex-wrap max-w-[300px]">
                                                    {item.kdsEnabled && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase rounded-md">KDS</span>}
                                                    {item.soundAlert && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-black uppercase rounded-md">SESLİ</span>}
                                                    {item.showPrice && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black uppercase rounded-md">FİYATLI</span>}
                                                    {item.noOutput && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black uppercase rounded-md">YAZDIRMA YOK</span>}
                                                    {item.textSize !== 'NORMAL' && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md">FONT {item.textSize}</span>}
                                                    {item.copyCount > 1 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md">{item.copyCount} KOPYA</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end opacity-100 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => openModal(item)} className="w-10 h-10 bg-white dark:bg-slate-800 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center"><i className="fat fa-pen-field text-lg"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr><td colSpan={5} className="p-20 text-center"><div className="flex flex-col items-center opacity-40"><i className="fat fa-inbox-out text-6xl mb-4 text-slate-300"></i><p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Henüz çıktı profili tanımlanmamış</p></div></td></tr>
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
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-[1200px] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col max-h-[95vh] min-h-[80vh]">

                        <div className="p-6 lg:px-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className={`fat ${formData.id === 0 ? 'fa-plus-circle' : 'fa-pen-to-square'} text-cyan-600`}></i>
                                    {formData.id === 0 ? 'Yeni Çıktı Profili' : 'Profil Düzenle'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 dark:hover:text-white shadow-sm transition-all">&times;</button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Left Side: Form */}
                            <div className="w-full lg:w-[60%] overflow-y-auto p-6 lg:p-8 flex flex-col border-r border-slate-100 dark:border-slate-700/50">
                                {/* Quick Templates */}
                                <div className="mb-6">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">HIZLI ŞABLONLAR</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        <button onClick={() => applyTemplate('kitchen')} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:hover:border-cyan-500 transition-all text-slate-600 dark:text-slate-300">
                                            <i className="fat fa-fire-burner text-xl mb-1 text-orange-500"></i>
                                            <span className="text-[10px] font-black uppercase">Mutfak</span>
                                        </button>
                                        <button onClick={() => applyTemplate('customer')} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:hover:border-cyan-500 transition-all text-slate-600 dark:text-slate-300">
                                            <i className="fat fa-receipt text-xl mb-1 text-blue-500"></i>
                                            <span className="text-[10px] font-black uppercase">Müşteri</span>
                                        </button>
                                        <button onClick={() => applyTemplate('bar')} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:hover:border-cyan-500 transition-all text-slate-600 dark:text-slate-300">
                                            <i className="fat fa-martini-glass text-xl mb-1 text-purple-500"></i>
                                            <span className="text-[10px] font-black uppercase">İçecek/Bar</span>
                                        </button>
                                        <button onClick={() => applyTemplate('kds')} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:hover:border-cyan-500 transition-all text-slate-600 dark:text-slate-300">
                                            <i className="fat fa-tv text-xl mb-1 text-emerald-500"></i>
                                            <span className="text-[10px] font-black uppercase">Sadece KDS</span>
                                        </button>
                                        <button onClick={() => applyTemplate('z-report')} className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:hover:border-cyan-500 transition-all text-slate-600 dark:text-slate-300">
                                            <i className="fat fa-file-chart-pie text-xl mb-1 text-rose-500"></i>
                                            <span className="text-[10px] font-black uppercase">Gün Sonu</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
                                    <button type="button" onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'general' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Genel Yönlendirme</button>
                                    <button type="button" onClick={() => setActiveTab('design')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'design' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tasarım & İçerik</button>
                                </div>

                                <form id="profileForm" onSubmit={handleSave} className="flex-1 space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">PROFİL ADI</label>
                                        <div className="relative">
                                            <i className="fat fa-route absolute left-4 top-4 text-cyan-500/50"></i>
                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="ör: Mutfak Yazıcısı, Soğuk İçecekler..." />
                                        </div>
                                    </div>

                                    {activeTab === 'general' && (
                                        <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">PROFİL TİPİ</label>
                                                    <select value={formData.profileType} onChange={(e) => setFormData({ ...formData, profileType: e.target.value as any })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none appearance-none">
                                                        <option value="STANDARD">Standart Sipariş / Bilgi</option>
                                                        <option value="Z_REPORT">Gün Sonu (Z-Raporu)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KOPYA SAYISI</label>
                                                    <input type="number" min="1" max="10" value={formData.copyCount} onChange={(e) => setFormData({ ...formData, copyCount: parseInt(e.target.value) || 1 })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow text-center" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ANA YAZICI</label>
                                                    <SearchableSelect
                                                        value={formData.mainPrinterId ? formData.mainPrinterId.toString() : ''}
                                                        onChange={(val) => setFormData({ ...formData, mainPrinterId: val ? parseInt(val) : 0 })}
                                                        options={[{ value: '', label: 'Yazıcı yok' }, ...printers.map(p => ({ value: p.id.toString(), label: p.name }))]}
                                                        icon="fat fa-print"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">BİLGİ YAZICISI</label>
                                                    <SearchableSelect
                                                        value={formData.infoPrinterId ? formData.infoPrinterId.toString() : ''}
                                                        onChange={(val) => setFormData({ ...formData, infoPrinterId: val ? parseInt(val) : 0 })}
                                                        options={[{ value: '', label: 'Yazıcı yok' }, ...printers.map(p => ({ value: p.id.toString(), label: p.name }))]}
                                                        icon="fat fa-file-invoice"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">KDS HEDEFİ</label>
                                                <input type="text" value={formData.kdsTarget || ''} onChange={(e) => setFormData({ ...formData, kdsTarget: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="Örn: Mutfak Ekranı 1" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Toggle label="KDS Aktif" value={formData.kdsEnabled} onChange={(v) => setFormData({ ...formData, kdsEnabled: v })} color="emerald" icon="fa-tv" />
                                                <Toggle label="Sadece Bilgi Fişi" value={formData.infoOnly} onChange={(v) => setFormData({ ...formData, infoOnly: v })} color="blue" icon="fa-receipt" />
                                                <Toggle label="Fiziksel Çıktı Yok" value={formData.noOutput} onChange={(v) => setFormData({ ...formData, noOutput: v })} color="red" icon="fa-print-slash" />
                                                <Toggle label="Yazıcı Yoksa Uyar" value={formData.warnIfNoPrinter} onChange={(v) => setFormData({ ...formData, warnIfNoPrinter: v })} color="amber" icon="fa-triangle-exclamation" />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'design' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">YAZI BOYUTU (TERMİNAL)</label>
                                                    <select value={formData.textSize} onChange={(e) => setFormData({ ...formData, textSize: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none appearance-none">
                                                        <option value="NORMAL">Normal Boyut</option>
                                                        <option value="LARGE">Büyük (Geniş)</option>
                                                        <option value="XLARGE">Ekstra Büyük</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ÖZEL BAŞLIK</label>
                                                    <input type="text" value={formData.customTitle || ''} onChange={(e) => setFormData({ ...formData, customTitle: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 outline-none transition-shadow" placeholder="Varsayılan başlığı değiştir..." />
                                                </div>
                                            </div>

                                            <div className="bg-orange-500/5 dark:bg-orange-500/10 p-5 rounded-[30px] border border-orange-500/20">
                                                <label className="block text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-4">LOGO AYARLARI</label>
                                                <div className="flex items-center gap-6">
                                                    <div onClick={() => document.getElementById('logoUpload')?.click()} className={`w-20 h-20 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-orange-500/10 ${formData.showLogo ? 'border-orange-400 bg-white dark:bg-slate-800' : 'border-slate-300 opacity-50'}`}>
                                                        <i className="fat fa-cloud-arrow-up text-2xl text-orange-500 mb-1"></i>
                                                        <span className="text-[8px] font-black uppercase text-slate-400">YÜKLE</span>
                                                        <input type="file" id="logoUpload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <Toggle label="Logoyu Fişte Göster" value={formData.showLogo} onChange={(v) => setFormData({ ...formData, showLogo: v })} color="orange" icon="fa-image" />
                                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">Logo yüksekliği otomatik ayarlanır. Siyah-beyaz termal yazıcı uyumlu logolar önerilir.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">ALAN GÖRÜNÜRLÜK AYARLARI</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Toggle label="Logo Göster" value={formData.showLogo} onChange={(v) => setFormData({ ...formData, showLogo: v })} color="orange" icon="fa-image" />
                                                    <Toggle label="Başlık Göster" value={formData.showTitle} onChange={(v) => setFormData({ ...formData, showTitle: v })} color="cyan" icon="fa-heading" />
                                                    <Toggle label="Fiyatları Göster" value={formData.showPrice} onChange={(v) => setFormData({ ...formData, showPrice: v })} color="indigo" icon="fa-tag" />
                                                    <Toggle label="Porsiyon & Not Göster" value={formData.showPortion} onChange={(v) => setFormData({ ...formData, showPortion: v })} color="teal" icon="fa-list" />
                                                    <Toggle label="Masa Bilgisi Göster" value={formData.showTable} onChange={(v) => setFormData({ ...formData, showTable: v })} color="purple" icon="fa-chair" />
                                                    <Toggle label="Garson Bilgisi Göster" value={formData.showWaiter} onChange={(v) => setFormData({ ...formData, showWaiter: v })} color="pink" icon="fa-user-tie" />
                                                    <Toggle label="Döviz Kurlarını Göster" value={formData.showExchangeRates} onChange={(v) => setFormData({ ...formData, showExchangeRates: v })} color="emerald" icon="fa-money-bill-transfer" />
                                                </div>
                                            </div>

                                            {formData.profileType === 'Z_REPORT' && (
                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">GÜN SONU (Z) ÖZEL AYARLARI</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Toggle label="Garson Satışlarını Göster" value={formData.showWaiterSales} onChange={(v) => setFormData({ ...formData, showWaiterSales: v })} color="blue" icon="fa-users-viewfinder" />
                                                        <Toggle label="Kategoriye Göre Grupla" value={formData.groupByCategory} onChange={(v) => setFormData({ ...formData, groupByCategory: v })} color="amber" icon="fa-layer-group" />
                                                        <Toggle label="İşlem Analizini Göster" value={formData.showTransactionAnalysis} onChange={(v) => setFormData({ ...formData, showTransactionAnalysis: v })} color="rose" icon="fa-chart-simple" />
                                                        <Toggle label="Ürün Özetini Göster" value={formData.showProductSummary} onChange={(v) => setFormData({ ...formData, showProductSummary: v })} color="emerald" icon="fa-list-check" />
                                                        <Toggle label="Döviz Analizini Göster" value={formData.showCurrencyDetails} onChange={(v) => setFormData({ ...formData, showCurrencyDetails: v })} color="indigo" icon="fa-coins" />
                                                        <Toggle label="KDV Özetini Göster" value={formData.showVatSummary} onChange={(v) => setFormData({ ...formData, showVatSummary: v })} color="cyan" icon="fa-percent" />
                                                        <Toggle label="İndirim/İkram Göster" value={formData.showDiscountDetails} onChange={(v) => setFormData({ ...formData, showDiscountDetails: v })} color="orange" icon="fa-tag" />
                                                        <Toggle label="İstatistikleri Göster" value={formData.showGuestStats} onChange={(v) => setFormData({ ...formData, showGuestStats: v })} color="purple" icon="fa-calculator" />
                                                        <Toggle label="Departman Satışlarını Göster" value={formData.showDepartmentSales} onChange={(v) => setFormData({ ...formData, showDepartmentSales: v })} color="pink" icon="fa-building-user" />
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">DONANIM AYARLARI</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Toggle label="Sesli Uyarı (Buzzer)" value={formData.soundAlert} onChange={(v) => setFormData({ ...formData, soundAlert: v })} color="amber" icon="fa-volume-high" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                <div className="flex justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-700/50">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-[160px] py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <i className="fat fa-xmark text-lg"></i> İptal
                                    </button>
                                    <button form="profileForm" type="submit" className="w-[160px] py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <i className="fat fa-check text-lg"></i> Kaydet
                                    </button>
                                </div>
                            </div>

                            {/* Right Side: Live Preview */}
                            <div className="hidden lg:flex w-[40%] bg-slate-100/50 dark:bg-slate-900 flex-col relative overflow-y-auto items-center justify-start py-10 px-4" style={{ minHeight: '600px' }}>
                                <div className="absolute top-4 left-4 right-4 text-center z-10">
                                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full"><i className="fat fa-eye me-2"></i> Canlı Önizleme</span>
                                </div>
                                {renderPreview()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
