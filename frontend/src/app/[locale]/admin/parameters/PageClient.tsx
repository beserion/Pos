'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { showSwal } from '../../utils/swal';
import { useAuth } from '@/app/[locale]/AuthContext';
import { useParameters, invalidateParameterCache } from '../../utils/useParameters';
import SearchableSelect from '@/components/SearchableSelect';
import { API_URL } from '@/lib/apiConfig';

// ─── Parametre tipleri ────────────────────────────────────────────
type ParamType = 'text' | 'number' | 'boolean' | 'select' | 'color' | 'date';

interface Param {
    key: string;
    label: string;
    description?: string;
    type: ParamType;
    value: any;
    options?: string[];      // select için
    optionLabels?: Record<string, string>; // select için Türkçe etiketler
    unit?: string;           // number için (örn. "dk", "₺", "%")
    compact?: boolean;       // text alanı dar/inline kalacaksa true
}

interface Module {
    id: string;
    icon: string;
    color: string;
    bgGradient: string;
    borderColor: string;
    title: string;
    subtitle: string;
    params: Param[];
}

// ─── Varsayılan modüller ve parametreler ─────────────────────────
const defaultModules: Module[] = [
    {
        id: 'pos', icon: 'fa-cash-register', color: 'text-indigo-500', bgGradient: 'from-indigo-500/10 to-indigo-500/0',
        borderColor: 'border-indigo-500/30', title: 'POS & Satış', subtitle: 'Kasa ve sipariş ayarları',
        params: [
            { key: 'default_payment_method', label: 'Varsayılan Ödeme Yöntemi', type: 'select', value: 'KASA', options: ['KASA', 'KREDI_KARTI', 'HAVALE'] },
            { key: 'service_fee_rate', label: 'Servis Ücreti (%)', description: 'Toplam tutara eklenen servis bedeli', type: 'number', value: 10, unit: '%' },
            { key: 'available_tax_rates', label: 'Geçerli KDV Oranları', description: 'Virgülle ayırarak giriniz (Örn: 0,1,10,20)', type: 'text', value: '0,1,10,20' },
            { key: 'allow_discount', label: 'İndirime İzin Ver', type: 'boolean', value: true },
            { key: 'max_discount_rate', label: 'Maksimum İndirim (%)', type: 'number', value: 20, unit: '%' },
            { key: 'receipt_footer', label: 'Fiş Alt Yazısı', type: 'text', value: 'Teşekkür ederiz! Tekrar bekleriz.' },
            { key: 'screen_timeout', label: 'Ekran Zaman Aşımı', description: 'Belirlenen süre hareketsizlik sonrası şifre ekranına döner. 0 = kapalı', type: 'number', value: 180, unit: 'sn' },
            // ── İş Günü Yönetimi ──
            { key: 'active_business_date', label: 'Program Tarihi (İş Günü)', description: 'Mevcut iş günü. DİKKAT: Sadece istisnai durumlarda değiştirin, gün bütünlüğünü ve Z-Raporunu etkileyebilir!', type: 'date', value: '' },
            { key: 'shift_system_enabled', label: 'Vardiyalı Kasiyer Sistemi', description: 'Vardiya açma/kapama zorunluluğu. Kapatılırsa vardiya uyarıları devre dışı kalır.', type: 'boolean', value: true },
            { key: 'shift_closure_mode', label: 'Gün Sonu Vardiya Kontrol Modu', description: 'Gün sonu öncesi açık vardiya kontrolü', type: 'select', value: 'warn_only', options: ['warn_only', 'authorized_approval', 'mandatory_close'], optionLabels: { 'warn_only': 'Sadece Uyarı Ver', 'authorized_approval': 'Yetkili Onayıyla Devam', 'mandatory_close': 'Zorunlu Vardiya Kapatma' } },
            { key: 'z_report_print_mode', label: 'Z Raporu Yazdırma Modu', description: 'Gün sonu sonrası Z raporu otomatik yazdırılsın mı?', type: 'select', value: 'auto_print', options: ['auto_print', 'manual_print', 'disabled'], optionLabels: { 'auto_print': 'Otomatik Yazdır', 'manual_print': 'Manuel Yazdır', 'disabled': 'Yazdırma Kapalı' } },
            { key: 'end_of_day_min_hours', label: 'Gün Sonu Min. Saat Aralığı', description: 'İki gün sonu arasında minimum geçmesi gereken saat', type: 'number', value: 6, unit: 'saat' },
            { key: 'block_eod_if_tables_open', label: 'Açık Masa Varken Gün Sonunu Engelle', description: 'Eğer açık (ödenmemiş) masa varsa gün sonu alınmasını engeller.', type: 'boolean', value: false },
            { key: 'auto_close_shifts_on_eod', label: 'Gün Sonunda Vardiyaları Otomatik Kapat', description: 'Gün sonu alındığında hala açık olan vardiyalar otomatik olarak beklenen tutar ile kapatılsın mı?', type: 'boolean', value: true },
            { key: 'cancel_stock_reverse', label: 'İptal Stoğa Geri Eklensin', description: 'İptal edilen ürünler stoğa geri döner', type: 'boolean', value: true },
            { key: 'refund_stock_reverse', label: 'İade Stoğa Geri Eklensin', description: 'İade edilen ürünler stoğa geri döner', type: 'boolean', value: true },
        ]
    },
    {
        id: 'half_double', icon: 'fa-glass-half', color: 'text-orange-500', bgGradient: 'from-orange-500/10 to-orange-500/0',
        borderColor: 'border-orange-500/30', title: 'Ürün', subtitle: 'Ürün parametre ve ayarları',
        params: [
            { key: 'half_price_multiplier', label: 'Yarım Fiyat Katsayısı', description: 'Ürün fiyatı bu katsayı ile çarpılır (örn: 0.50 = yarı fiyat)', type: 'number', value: 0.50 },
            { key: 'double_price_multiplier', label: 'Duble Fiyat Katsayısı', description: 'Ürün fiyatı bu katsayı ile çarpılır (örn: 1.70)', type: 'number', value: 1.70 },
            { key: 'half_recipe_multiplier', label: 'Yarım Reçete Katsayısı', description: 'Stok düşümü bu katsayı ile çarpılır', type: 'number', value: 0.50 },
            { key: 'double_recipe_multiplier', label: 'Duble Reçete Katsayısı', description: 'Stok düşümü bu katsayı ile çarpılır', type: 'number', value: 2.00 },
            { key: 'variant_system_enabled', label: 'Varyant Sistemi', description: 'Ürünlerde varyant ekleme sekmesini aktif veya pasif yapar.', type: 'boolean', value: true },
        ]
    },
    {
        id: 'kitchen', icon: 'fa-fire-burner', color: 'text-amber-500', bgGradient: 'from-amber-500/10 to-amber-500/0',
        borderColor: 'border-amber-500/30', title: 'Mutfak (KDS)', subtitle: 'Mutfak ekranı, hazırlık ve modül ayarları',
        params: [
            { key: 'kitchen_display_enabled', label: 'Görsel Mutfak Ekranı Aktif', description: 'Kapatıldığında KDS sayfası devre dışı olur, siparişler yazıcıya iletilir.', type: 'boolean', value: true },
            { key: 'kitchen_item_selection_enabled', label: 'Mutfak Ürün Seçimi', description: 'Aktif olduğunda mutfak ekranında ürünler tek tek seçilebilir.', type: 'boolean', value: true },
            { key: 'warning_time', label: 'Uyarı Süresi', description: 'Bu süreyi aşan siparişler turuncu olur', type: 'number', value: 10, unit: 'dk' },
            { key: 'critical_time', label: 'Kritik Süre', description: 'Bu süreyi aşan siparişler kırmızı olur', type: 'number', value: 20, unit: 'dk' },
            { key: 'auto_refresh_interval', label: 'Otomatik Yenileme', type: 'number', value: 10, unit: 'sn' },
            { key: 'auto_open_product_options', label: 'Ürün Seçince Detay Ekranını Otomatik Aç', description: 'Ürün seçildiğinde ekstra ve mutfak notu ekranının otomatik açılıp açılmayacağını belirler.', type: 'boolean', value: true },
            { key: 'kitchen_finished_screen_timeout', label: 'Bitenleri Gösterme Süresi', description: 'Bitenler sekmesinde işlem yapılmadığında belirtilen saniye sonra aktif ekrana döner. (0 = Sürekli kalır)', type: 'number', value: 30, unit: 'sn' },
            { key: 'beep_on_new_order', label: 'Yeni Siparişte Sesli Uyarı', type: 'boolean', value: true },
            { key: 'show_waiter_name', label: 'Garson Adını Göster', type: 'boolean', value: true },
        ]
    },
    {
        id: 'printer', icon: 'fa-print', color: 'text-sky-500', bgGradient: 'from-sky-500/10 to-sky-500/0',
        borderColor: 'border-sky-500/30', title: 'Yazıcı', subtitle: 'Fiş ve mutfak yazıcı ayarları',
        params: [
            { key: 'receipt_copies', label: 'Fiş Kopya Adedi', type: 'number', value: 1 },
            { key: 'kitchen_copies', label: 'Mutfak Fişi Kopya Adedi', type: 'number', value: 1 },
            { key: 'print_logo', label: 'Logolu Fiş Bas', type: 'boolean', value: false },
            { key: 'paper_width', label: 'Kağıt Genişliği', type: 'select', value: '80mm', options: ['58mm', '80mm'] },
            { key: 'company_name', label: 'İşletme Adı', type: 'text', value: '' },
            { key: 'company_address', label: 'İşletme Adresi', type: 'text', value: '' },
            { key: 'company_phone', label: 'İşletme Telefonu', type: 'text', value: '' },
            { key: 'print_on_refund', label: 'İade de fiş yazdır', description: 'Bir ürün iade edildiğinde mutfak yazıcısından iade fişi çıkartılsın mı?', type: 'boolean', value: true },
            { key: 'print_on_cancel', label: 'İptal de fiş yazdır', description: 'Bir ürün iptal edildiğinde mutfak yazıcısından iptal fişi çıkartılsın mı?', type: 'boolean', value: true },
            { key: 'print_receipt_on_payment', label: 'Ödeme Alındığında Fiş Yazdır', description: 'Kasa POS ekranında ödeme tamamlandığında otomatik müşteri fişi çıkartılsın mı?', type: 'boolean', value: true },
        ]
    },
    {
        id: 'mars', icon: 'fa-fire-flame-curved', color: 'text-rose-500', bgGradient: 'from-rose-500/10 to-rose-500/0',
        borderColor: 'border-rose-500/30', title: 'Marş Sistemi', subtitle: 'Beklet ve marş ver ayarları',
        params: [
            { key: 'mars_enabled', label: 'Marş Sistemi Aktif', type: 'boolean', value: true },
            { key: 'mars_default_items', label: 'Varsayılan Olarak Beklet', description: 'Yeni ürünler otomatik beklet modunda açılsın', type: 'boolean', value: false },
            { key: 'mars_sound', label: 'Marş Geldiğinde Sesli Uyarı', type: 'boolean', value: true },
        ]
    },
    {
        id: 'table', icon: 'fa-chair-office', color: 'text-purple-500', bgGradient: 'from-purple-500/10 to-purple-500/0',
        borderColor: 'border-purple-500/30', title: 'Masa Yönetimi', subtitle: 'Masa ve oturma planı ayarları',
        params: [
            { key: 'auto_close_table', label: 'Ödeme Sonrası Masayı Otomatik Kapat', type: 'boolean', value: true },
            { key: 'show_table_total', label: 'Masa Kartında Toplam Göster', type: 'boolean', value: true },
            { key: 'show_waiter_on_table', label: 'Masa Kartında Garson Göster', type: 'boolean', value: true },
            { key: 'order_start_alert', label: 'Sipariş Başlangıç Süresi Uyarısı', type: 'number', value: 30, unit: 'dk' },
        ]
    },
    {
        id: 'finance', icon: 'fa-building-columns', color: 'text-emerald-500', bgGradient: 'from-emerald-500/10 to-emerald-500/0',
        borderColor: 'border-emerald-500/30', title: 'Finans', subtitle: 'Muhasebe ve ödeme ayarları',
        params: [
            { key: 'currency', label: 'Para Birimi', type: 'select', value: 'TRY', options: ['TRY', 'USD', 'EUR'] },
            { key: 'currency_symbol', label: 'Para Birimi Sembolü', type: 'text', value: '₺', compact: true },
            { key: 'fiscal_year_start', label: 'Mali Yıl Başlangıcı', type: 'select', value: 'Ocak', options: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] },
            { key: 'auto_invoice', label: 'Satışta Otomatik Fatura Oluştur', type: 'boolean', value: false },
            { key: 'exchange_rate_eur', label: 'EUR Kuru', type: 'number', value: 37.50, unit: '₺' },
            { key: 'exchange_rate_usd', label: 'USD Kuru', type: 'number', value: 35.20, unit: '₺' },
            { key: 'exchange_rate_gbp', label: 'GBP Kuru', type: 'number', value: 44.10, unit: '₺' },
        ]
    },
    {
        id: 'partners', icon: 'fa-address-book', color: 'text-cyan-500', bgGradient: 'from-cyan-500/10 to-cyan-500/0',
        borderColor: 'border-cyan-500/30', title: 'Cariler', subtitle: 'Müşteri ve tedarikçi ayarları',
        params: [
            { key: 'partner_default_type', label: 'Varsayılan Cari Türü', type: 'select', value: 'MÜŞTERİ', options: ['MÜŞTERİ', 'TEDARKİÇİ', 'HEMÇİ'] },
            { key: 'partner_credit_limit_enabled', label: 'Kredi Limiti Kullan', description: 'Carilere kredi limiti tanımlanabilsin', type: 'boolean', value: false },
            { key: 'partner_default_credit_limit', label: 'Varsayılan Kredi Limiti', type: 'number', value: 0, unit: '₺' },
            { key: 'partner_show_balance', label: 'Cari Kartında Bakiye Göster', type: 'boolean', value: true },
            { key: 'partner_auto_code', label: 'Otomatik Cari Kodu Üret', type: 'boolean', value: true },
            { key: 'partner_code_prefix', label: 'Cari Kod Öneki', description: 'Örn: C, MUS, CLI', type: 'text', value: 'C', compact: true },
            { key: 'partner_payment_terms', label: 'Varsayılan Ödeme Vadesi', type: 'number', value: 30, unit: 'gün' },
        ]
    },
    {
        id: 'invoices', icon: 'fa-file-invoice', color: 'text-teal-500', bgGradient: 'from-teal-500/10 to-teal-500/0',
        borderColor: 'border-teal-500/30', title: 'Faturalar', subtitle: 'Fatura kural ve numaralandırma ayarları',
        params: [
            { key: 'invoice_auto_number', label: 'Otomatik Fatura Numarası', type: 'boolean', value: true },
            { key: 'invoice_prefix', label: 'Fatura Öneki', description: 'Örn: FTR, INV', type: 'text', value: 'FTR', compact: true },
            { key: 'invoice_start_number', label: 'Başlangıç Numarası', type: 'number', value: 1 },
            { key: 'invoice_default_due_days', label: 'Varsayılan Vade Günü', type: 'number', value: 30, unit: 'gün' },
            { key: 'invoice_show_tax_detail', label: 'KDV Detayını Göster', type: 'boolean', value: true },
            { key: 'invoice_footer_note', label: 'Fatura Alt Notu', type: 'text', value: '' },
            { key: 'invoice_require_waybill', label: 'İrsaliye Zorunlu', description: 'Fatura oluşturulmadan önce irsaliye istenir', type: 'boolean', value: false },
            { key: 'invoice_e_invoice_enabled', label: 'e-Fatura Entegrasyonu Aktif', type: 'boolean', value: false },
        ]
    },
    {
        id: 'stocks', icon: 'fa-boxes-stacked', color: 'text-lime-600', bgGradient: 'from-lime-500/10 to-lime-500/0',
        borderColor: 'border-lime-500/30', title: 'Stoklar', subtitle: 'Stok kontrol ve uyarı ayarları',
        params: [
            { key: 'stock_tracking_enabled', label: 'Stok Takibi Aktif', description: 'Satışlarda stok düşülüsün', type: 'boolean', value: true },
            { key: 'stock_negative_allowed', label: 'Negatif Stoğa İzin Ver', description: 'Stok 0’ın altına düşülebilir', type: 'boolean', value: false },
            { key: 'stock_low_alert_threshold', label: 'Düşük Stok Uyarı Eşiği', description: 'Bu sayının altına düşünce uyarı ver', type: 'number', value: 5, unit: 'adet' },
            { key: 'stock_unit_default', label: 'Varsayılan Stok Birimi', type: 'select', value: 'Adet', options: ['Adet', 'Kg', 'Lt', 'Paket', 'Kutu', 'Müze'] },
            { key: 'stock_auto_reorder', label: 'Otomatik Sipariş Hatırlatıcısı', description: 'Düşük stokta satın alma talebi oluştur', type: 'boolean', value: false },
            { key: 'stock_valuation_method', label: 'Stok Değerleme Yöntemi', type: 'select', value: 'FIFO', options: ['FIFO', 'LIFO', 'Ortalama Maliyet'] },
            { key: 'stock_warehouse_required', label: 'Depo Seçimi Zorunlu', type: 'boolean', value: false },
        ]
    },
];

// ─── Ana bileşen ──────────────────────────────────────────────────
export function PageClient() {
    const router = useRouter();
    const locale = useLocale();
    const tAdmin = useTranslations('Admin');
    const { user, loading: authLoading, hasPermission } = useAuth();

    const [activeModule, setActiveModule] = useState<string>('pos');
    const [searchQuery, setSearchQuery] = useState('');
    const [modules, setModules] = useState<Module[]>(defaultModules);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true); // Başlangıçta true
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const currentModule = modules.find(m => m.id === activeModule) || modules[0] || defaultModules[0];


    // Yetki Kontrolü
    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/${locale}/login`);
        } else if (!authLoading && !hasPermission('SYSTEM:VIEW')) {
            router.push(`/${locale}/dashboard`);
        }
    }, [user, authLoading, hasPermission, router, locale]);

    // Sayfa açılışında tüm parametreleri çek
    useEffect(() => {
        const fetchAll = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/parameters`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    setLoading(false);
                    return;
                }
                const data: any[] = await res.json();
                if (data.length === 0) {
                    setLoading(false);
                    return;
                }

                setModules(prev => prev.map(mod => ({
                    ...mod,
                    params: mod.params.map(p => {
                        const found = data.find(d => d.module === mod.id && d.key === p.key);
                        if (!found) return p;
                        let val: any = found.value;
                        if (p.type === 'boolean') val = found.value === 'true' || found.value === true;
                        if (p.type === 'number') val = Number(found.value);
                        return { ...p, value: val };
                    })
                })));
            } catch (err) {
                console.error("[Parameters] Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        if (!authLoading && user) {
            fetchAll();
        }
    }, [authLoading, user, API_URL]);

    const updateParam = (moduleId: string, key: string, value: any) => {
        setIsDirty(true);
        setModules(prev => prev.map(mod =>
            mod.id === moduleId
                ? { ...mod, params: mod.params.map(p => p.key === key ? { ...p, value } : p) }
                : mod
        ));
    };

    // Tarayıcı kapatma/yenileme koruyucusu
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const handleSave = async () => {
        if (isSaving) return;
        const token = localStorage.getItem('token');
        setIsSaving(true);

        try {
            // Tüm modüllerdeki tüm parametreleri tek bir dizide topla
            const allItems = modules.flatMap(mod =>
                mod.params.map(p => ({
                    module: mod.id,
                    key: p.key,
                    value: String(p.value),
                    label: p.label,
                    type: p.type,
                    description: p.description,
                }))
            );

            // Tek bir toplu (bulk) istek gönder
            const res = await fetch(`${API_URL}/parameters/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ items: allItems }),
            });

            if (!res.ok) throw new Error('Parametreler kaydedilemedi');

            invalidateParameterCache();
            setIsDirty(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            showSwal({
                icon: 'success',
                title: 'Parametreler Kaydedildi',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err: any) {
            showSwal({ icon: 'error', title: 'Hata', text: err?.message || 'Parametreler kaydedilemedi.' });
        } finally {
            setIsSaving(false);
        }
    };

    // Kaydedilmemiş değişiklik varsa SweetAlert ile sor
    const handleNavigateAway = async (destination: string) => {
        if (!isDirty) { router.push(destination); return; }

        const result = await showSwal({
            icon: 'warning',
            title: 'Kaydedilmemiş Değişiklikler',
            html: 'Bazı parametreler henüz kaydedilmedi.<br><b>Kaydetmek ister misiniz?</b>',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="fas fa-save"></i> Kaydet ve Çık',
            denyButtonText: '<i class="fas fa-times"></i> Kaydetme, Çık',
            cancelButtonText: 'İptal',
        });

        if (result.isConfirmed) {
            await handleSave();
            router.push(destination);
        } else if (result.isDenied) {
            setIsDirty(false);
            router.push(destination);
        }
    };

    const renderInput = (mod: Module, param: Param) => {
        const baseClass = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition w-full";

        switch (param.type) {
            case 'text':
                return <input type="text" value={param.value} onChange={e => updateParam(mod.id, param.key, e.target.value)} className={`${baseClass} w-full`} placeholder={param.label} />;
            case 'date':
                return <input type="date" value={param.value || ''} onChange={e => updateParam(mod.id, param.key, e.target.value)} className={`${baseClass} w-48`} />;
            case 'number':
                return (
                    <div className="flex items-center gap-2">
                        <input type="number" value={param.value} onChange={e => updateParam(mod.id, param.key, Number(e.target.value))} className={`${baseClass} text-right w-32`} />
                        {param.unit && <span className="text-xs font-bold text-slate-400 w-6">{param.unit}</span>}
                    </div>
                );
            case 'boolean':
                return (
                    <button
                        onClick={() => updateParam(mod.id, param.key, !param.value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${param.value ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${param.value ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                );
            case 'select':
                return (
                    <div className="w-52">
                        <SearchableSelect
                            value={String(param.value)}
                            onChange={(val) => updateParam(mod.id, param.key, val)}
                            options={param.options?.map(opt => ({
                                value: opt,
                                label: param.optionLabels?.[opt] || opt
                            })) || []}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    // ─── Arama Filtreleme Mantığı ──────────────────────────────
    const filteredResults = searchQuery.trim() !== ''
        ? modules.flatMap(mod =>
            mod.params
                .filter(p =>
                    (p.label?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (p.key?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map(p => ({ ...p, moduleTitle: mod.title, moduleIcon: mod.icon, moduleColor: mod.color, moduleId: mod.id }))
        )
        : [];

    if (authLoading || (loading && modules === defaultModules && !user)) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <i className="fat fa-spinner-third animate-spin text-4xl text-violet-500"></i>
                    <p className="text-slate-400 font-bold text-sm">Parametreler Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">

            {/* Kaydetme overlay spinner */}
            {isSaving && (
                <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 border border-slate-200 dark:border-slate-700">
                        <i className="fat fa-spinner-third animate-spin text-5xl text-violet-500"></i>
                        <div className="text-center">
                            <p className="font-black text-slate-800 dark:text-white text-lg">Kaydediliyor</p>
                            <p className="text-sm text-slate-400 mt-1">Tüm parametreler güvenli bir şekilde tek seferde veritabanına yazılıyor...</p>
                        </div>
                        <div className="flex gap-1 mt-1">
                            {modules.map((m, i) => (
                                <div key={m.id} className={`w-2 h-2 rounded-full ${m.color.replace('text-', 'bg-')} animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Ambient background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-violet-500/5 dark:bg-violet-600/10 blur-[120px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[120px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* Sol: Başlık */}
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <i className="fat fa-sliders text-violet-500"></i> Parametre Yönetimi
                        </h1>
                        <p className="text-xs text-slate-400">Modül bazlı sistem ayarları</p>
                    </div>
                    {/* Sağ: Kaydet + Geri */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 border
                                ${isSaving
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                    : saved
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
                                        : isDirty
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-500/60 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm'
                                            : 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-500/40 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                                }`}
                        >
                            <i className={`fat ${isSaving ? 'fa-spinner-third animate-spin' : saved ? 'fa-check' : 'fa-floppy-disk'}`}></i>
                            {isSaving ? 'Kaydediliyor...' : saved ? 'Kaydedildi!' : 'Kaydet'}
                        </button>
                        <button
                            onClick={() => handleNavigateAway(`/${locale}/admin`)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 border bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <i className="fat fa-reply"></i>
                            Geri Dön
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex gap-6">
                {/* Sol sidebar – Modüller */}
                <aside className="w-64 shrink-0">
                    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 space-y-3">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Arama</p>
                            <div className="relative group">
                                <i className={`fat fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs transition-colors duration-200 ${searchQuery ? 'text-indigo-500' : 'text-slate-400'}`}></i>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Parametre ara..."
                                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400 dark:text-white"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        <i className="fat fa-times-circle"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Modüller</p>
                            {searchQuery && (
                                <span className="text-[10px] font-bold text-indigo-500 animate-pulse">Arama Modu</span>
                            )}
                        </div>
                        <nav className="p-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1">
                            {modules.map(mod => (
                                <button
                                    key={mod.id}
                                    disabled={!!searchQuery}
                                    onClick={() => setActiveModule(mod.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group 
                                        ${searchQuery ? 'opacity-50 grayscale pointer-events-none' : ''}
                                        ${activeModule === mod.id && !searchQuery ? `bg-gradient-to-r ${mod.bgGradient} border ${mod.borderColor}` : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-transparent'}`}
                                >
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeModule === mod.id ? 'bg-white dark:bg-slate-900 shadow' : 'bg-slate-100 dark:bg-slate-700'} transition`}>
                                        <i className={`fat ${mod.icon} ${mod.color} text-lg`}></i>
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold leading-none ${activeModule === mod.id ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{mod.title}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{mod.params.length} parametre</p>
                                    </div>
                                    {activeModule === mod.id && <i className="fat fa-chevron-right ml-auto text-xs text-slate-400"></i>}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Sağ içerik – Parametreler */}
                <main className="flex-1">
                    {searchQuery.trim() === '' ? (
                        <>
                            {/* Modül başlığı */}
                            <div className={`bg-gradient-to-r ${currentModule.bgGradient} border ${currentModule.borderColor} rounded-2xl p-5 mb-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300`}>
                                <div className="w-14 h-14 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl shadow">
                                    <i className={`fat ${currentModule.icon} ${currentModule.color} text-2xl`}></i>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white">{currentModule.title}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{currentModule.subtitle}</p>
                                </div>
                                <span className="ml-auto text-xs font-bold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
                                    {currentModule.params.length} parametre
                                </span>
                            </div>

                            {/* Parametre listesi */}
                            <div className="relative bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                            <i className="fat fa-spinner-third animate-spin text-xl text-violet-500"></i>
                                            <span className="text-sm font-bold">Yükleniyor...</span>
                                        </div>
                                    </div>
                                )}
                                {currentModule.params.map((param) => (
                                    param.type === 'text' && !param.compact ? (
                                        /* Text alanları tam genişlik – dikey düzen */
                                        <div key={param.key} className="flex flex-col p-5 gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{param.label}</span>
                                                <code className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-mono">{param.key}</code>
                                            </div>
                                            {param.description && <p className="text-xs text-slate-400">{param.description}</p>}
                                            {renderInput(currentModule, param)}
                                        </div>
                                    ) : (
                                        /* Diğer tipler – yatay düzen */
                                        <div key={param.key} className="flex items-center justify-between p-5 gap-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition group">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white">{param.label}</span>
                                                    <code className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-mono">{param.key}</code>
                                                </div>
                                                {param.description && <p className="text-xs text-slate-400 mt-0.5">{param.description}</p>}
                                            </div>
                                            <div className="shrink-0">
                                                {renderInput(currentModule, param)}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Arama Başlığı */}
                            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 mb-5 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                        <i className="fat fa-magnifying-glass text-indigo-500 text-xl"></i>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Arama Sonuçları</h2>
                                        <p className="text-xs text-slate-400">"{searchQuery}" için bulunan parametreler</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-1.5 rounded-full">
                                    {filteredResults.length} sonuç bulundu
                                </span>
                            </div>

                            {/* Arama Sonuçları Listesi */}
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50 min-h-[400px]">
                                {filteredResults.length > 0 ? (
                                    filteredResults.map((param) => {
                                        const mod = modules.find(m => m.id === param.moduleId)!;
                                        return (
                                            <div key={`${param.moduleId}-${param.key}`} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition group">
                                                <div className="flex items-center justify-between gap-6 mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{param.label}</span>
                                                            <code className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-mono">{param.key}</code>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${param.moduleColor.replace('text-', 'bg-').replace('text-', 'border-')}/20 ${param.moduleColor} bg-opacity-10 ml-2`}>
                                                                <i className={`fat ${param.moduleIcon} mr-1`}></i>
                                                                {param.moduleTitle}
                                                            </span>
                                                        </div>
                                                        {param.description && <p className="text-xs text-slate-400">{param.description}</p>}
                                                    </div>
                                                    <div className="shrink-0">
                                                        {renderInput(mod, param)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600">
                                            <i className="fat fa-search text-4xl"></i>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 dark:text-white">Sonuç Bulunamadı</h3>
                                        <p className="text-sm text-slate-400 mt-2 max-w-xs">Aradığınız kriterlere uygun herhangi bir parametre mevcut değil. Lütfen başka bir anahtar kelime deneyin.</p>
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="mt-6 text-indigo-500 font-bold text-sm hover:underline"
                                        >
                                            Aramayı Temizle
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Alt bilgi */}
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 px-1">
                        <i className="fat fa-circle-info"></i>
                        <span>Değişiklikler <strong>"Kaydet"</strong> butonuna tıklandığında uygulanır. Bazı ayarlar yeniden başlatma gerektirebilir.</span>
                    </div>
                </main>
            </div>
        </div>
    );
}
