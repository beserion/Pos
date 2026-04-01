'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/[locale]/AuthContext';
import { showSwal, toastSwal } from '@/app/[locale]/utils/swal';
import { useTranslations, useLocale } from 'next-intl';
import { fetchAllParameters } from '@/app/[locale]/utils/useParameters';

interface PageClientProps {
    sessionId: number;
}

export function PageClient({ sessionId }: PageClientProps) {
    const t = useTranslations('InventoryCount');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { user } = useAuth();

    const [session, setSession] = useState<any>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, COUNTED, UNCOUNTED, HAS_DIFF
    const [categories, setCategories] = useState<string[]>([]);

    // Auto-save timer
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [pendingChanges, setPendingChanges] = useState<{ [id: number]: any }>({});

    // Bar helper modal
    const [helperModalOpen, setHelperModalOpen] = useState(false);
    const [activeLineForHelper, setActiveLineForHelper] = useState<any>(null);
    const [helperClosedQty, setHelperClosedQty] = useState(0);
    const [helperOpenQty, setHelperOpenQty] = useState(0);

    // Print report
    const [printDropdownOpen, setPrintDropdownOpen] = useState(false);

    // Print form modal
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formConfig, setFormConfig] = useState({
        businessName: '',
        branchName: '',
        counterPerson: '',
        showTheoretical: !session?.isBlindCount,
    });

    // Parametrelerden şirket adını otomatik çek
    useEffect(() => {
        fetchAllParameters(user?.token).then(params => {
            if (params.company_name) {
                setFormConfig(c => ({ ...c, businessName: c.businessName || params.company_name }));
            }
        });
    }, [user?.token]);

    useEffect(() => {
        if (user?.token) {
            fetchSession();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user, sessionId]);

    const fetchSession = async () => {
        if (!user?.token || !sessionId) return;
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
            const res = await axios.get(`${API_URL}/inventory-sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setSession(res.data);
            setLines(res.data.lines || []);

            // Extract categories
            const cats = new Set<string>();
            res.data.lines?.forEach((l: any) => {
                if (l.stockCard?.category) cats.add(l.stockCard.category);
            });
            setCategories(Array.from(cats));

        } catch (error: any) {
            console.error('Error fetching session', error);
            showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Sayım fişi bulunamadı.', icon: 'error' });
            router.push(`/${locale}/inventory/count`);
        } finally {
            setLoading(false);
        }
    };

    const triggerAutoSave = () => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(async () => {
            await saveDraft(true); // true = silent background map
        }, 3000);
    };

    const handleLineChange = (lineId: number, field: string, value: any) => {
        if (session?.status !== 'DRAFT' && session?.status !== 'IN_PROGRESS') return;

        const updatedLines = lines.map(line => {
            if (line.id === lineId) {
                const updated = { ...line, [field]: value };

                // If they changing countedQty, automatically mark as counted
                if (field === 'countedQty' && value !== null && value !== '') {
                    updated.isCounted = true;
                    // Note: Difference calculation is usually done in backend, but we can optimistically calculate for UI
                    const parsedVal = parseFloat(value) || 0;
                    updated.differenceQty = parsedVal - parseFloat(updated.theoreticalQty || 0);
                    updated.differenceCost = updated.differenceQty * parseFloat(updated.unitCost || 0);
                }

                // Mark for pending save
                setPendingChanges(prev => ({
                    ...prev,
                    [lineId]: {
                        countedQty: field === 'countedQty' ? (value === '' ? null : parseFloat(value)) : line.countedQty,
                        description: field === 'description' ? value : line.description,
                        isCounted: field === 'isCounted' ? value : (field === 'countedQty' ? true : line.isCounted)
                    }
                }));

                return updated;
            }
            return line;
        });

        setLines(updatedLines);
        triggerAutoSave();
    };

    const saveDraft = async (silent = false) => {
        if (!user?.token || Object.keys(pendingChanges).length === 0) return;

        try {
            if (!silent) setSaving(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';

            const promises = Object.entries(pendingChanges).map(([lineId, data]) =>
                axios.patch(`${API_URL}/inventory-sessions/lines/${lineId}`, data, {
                    headers: { Authorization: `Bearer ${user.token}` }
                })
            );

            await Promise.all(promises);
            setPendingChanges({}); // Clear pending changes

            if (!silent) {
                toastSwal({ title: 'Kaydedildi', text: 'Taslak başarıyla güncellendi.', icon: 'success' });
                // Re-fetch to get accurate calculations from backend
                await fetchSession();
            }
        } catch (error) {
            console.error('Error saving draft', error);
            if (!silent) showSwal({ title: tc('error'), text: 'Kaydetme sırasında bir hata oluştu.', icon: 'error' });
        } finally {
            if (!silent) setSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!user?.token || !session) return;

        // Check if there are uncounted lines
        const uncountedCount = lines.filter(l => !l.isCounted).length;

        // Force save any pending changes first
        if (Object.keys(pendingChanges).length > 0) {
            await saveDraft(false);
        }

        const result = await showSwal({
            title: 'Sayımı Onayla',
            html: `
                Sayımı onaylamak üzeresiniz. Bu işlem sonucunda stokların seviyeleri güncellenecek ve gerekli sayım fazlası/eksiği hareketleri oluşturulacaktır.<br/><br/>
                ${uncountedCount > 0 ? `<div class="bg-amber-100 text-amber-800 p-3 rounded-lg border border-amber-200"><strong>${uncountedCount} adet sayılmamış stok kartı var.</strong> Bunlar için fark oluşturulmayacak ve mevcut stok seviyeleri korunacaktır.</div>` : ''}
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Onayla ve Uygula',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#10b981'
        });

        if (result.isConfirmed) {
            try {
                setSaving(true);
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.post(`${API_URL}/inventory-sessions/${session.id}/approve`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });

                await showSwal({ title: 'Başarılı', text: 'Sayım onaylandı ve stok hareketleri oluşturuldu.', icon: 'success' });
                fetchSession();
            } catch (error: any) {
                console.error('Error approving session', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || 'Onaylama başarısız.', icon: 'error' });
            } finally {
                setSaving(false);
            }
        }
    };

    const handleCancelSession = async () => {
        if (!user?.token || !session) return;

        const result = await showSwal({
            title: 'Sayımı İptal Et',
            text: 'Bu sayım fişini iptal etmek istediğinize emin misiniz? Yapılan tüm girişler silinmez ancak fiş devre dışı kalır.',
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Evet, İptal Et',
            cancelButtonText: 'Vazgeç',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                setSaving(true);
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';
                await axios.post(`${API_URL}/inventory-sessions/${session.id}/cancel`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });

                toastSwal({ title: 'İptal Edildi', text: 'Sayım iptal edildi.', icon: 'success' });
                fetchSession();
            } catch (error: any) {
                console.error('Error cancelling session', error);
                showSwal({ title: tc('error'), text: error?.response?.data?.message || 'İptal işlemi başarısız.', icon: 'error' });
            } finally {
                setSaving(false);
            }
        }
    };

    // Open Bar Helper Modal
    const openHelperModal = (line: any) => {
        vibrate();
        setActiveLineForHelper(line);
        // Try to guess empty values
        const currentQty = parseFloat(line.countedQty) || 0;
        const convRate = parseFloat(line.stockCard?.conversionRate) || 1;

        if (currentQty > 0 && convRate > 1 && line.stockCard?.purchaseUnit && line.stockCard?.baseUnit) {
            const closed = Math.floor(currentQty / convRate);
            const open = currentQty % convRate;
            setHelperClosedQty(closed);
            setHelperOpenQty(parseFloat(open.toFixed(2)));
        } else {
            setHelperClosedQty(0);
            setHelperOpenQty(0);
        }
        setHelperModalOpen(true);
    };

    const applyHelperCalculation = () => {
        if (!activeLineForHelper) return;

        const convRate = parseFloat(activeLineForHelper.stockCard?.conversionRate) || 1;
        const totalBaseQty = (helperClosedQty * convRate) + helperOpenQty;

        handleLineChange(activeLineForHelper.id, 'countedQty', parseFloat(totalBaseQty.toFixed(2)));
        setHelperModalOpen(false);
    };

    const vibrate = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    // Derived flags
    const isReadOnly = session?.status === 'COMPLETED' || session?.status === 'CANCELLED';
    const isBlindCount = session?.isBlindCount;

    // Filtered Lines
    const filteredLines = lines.filter(line => {
        let match = true;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            match = match && (line.stockCard?.name?.toLowerCase().includes(q) || line.stockCard?.code?.toLowerCase().includes(q));
        }

        if (filterCategory) {
            match = match && line.stockCard?.category === filterCategory;
        }

        if (filterStatus !== 'ALL') {
            if (filterStatus === 'COUNTED') match = match && line.isCounted;
            if (filterStatus === 'UNCOUNTED') match = match && !line.isCounted;
            if (filterStatus === 'HAS_DIFF') match = match && line.isCounted && parseFloat(line.differenceQty) !== 0;
        }

        return match;
    });

    // KPIs
    const kpiTotalLines = lines.length;
    const kpiCountedLines = lines.filter(l => l.isCounted).length;
    const kpiDiffCost = lines.reduce((sum, l) => sum + (parseFloat(l.differenceCost) || 0), 0);

    // Print report handler
    const handlePrintReport = (type: 'full' | 'deficits' | 'surpluses' | 'analysis') => {
        setPrintDropdownOpen(false);

        const reportTitles: Record<string, string> = {
            full: 'TAM SAYIM RAPORU',
            deficits: 'EKSİKLER RAPORU',
            surpluses: 'FAZLALAR RAPORU',
            analysis: 'SAYIM FARK ANALİZ RAPORU',
        };

        let reportLines = [...lines];
        if (type === 'deficits') reportLines = lines.filter(l => l.isCounted && parseFloat(l.differenceQty) < 0);
        if (type === 'surpluses') reportLines = lines.filter(l => l.isCounted && parseFloat(l.differenceQty) > 0);
        if (type === 'analysis') reportLines = lines.filter(l => l.isCounted && parseFloat(l.differenceQty) !== 0);

        const totalDeficit = lines.filter(l => l.isCounted && parseFloat(l.differenceCost) < 0).reduce((s, l) => s + parseFloat(l.differenceCost), 0);
        const totalSurplus = lines.filter(l => l.isCounted && parseFloat(l.differenceCost) > 0).reduce((s, l) => s + parseFloat(l.differenceCost), 0);
        const netDiff = totalDeficit + totalSurplus;

        const rows = reportLines.map((line, idx) => {
            const diffQty = parseFloat(line.differenceQty) || 0;
            const diffCost = parseFloat(line.differenceCost) || 0;
            const diffColor = diffQty < 0 ? '#ef4444' : diffQty > 0 ? '#10b981' : '#94a3b8';
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `
            <tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;">
                <td style="padding:3px 6px;color:#94a3b8;font-size:9px;white-space:nowrap;">${idx + 1}</td>
                <td style="padding:3px 6px;">
                    <span style="font-weight:700;font-size:10px;color:#1e293b;">${line.stockCard?.name || '-'}</span>
                </td>
                <td style="padding:3px 6px;">
                    <span style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;">${line.stockCard?.code || ''}${line.stockCard?.category ? ` • ${line.stockCard.category}` : ''}</span>
                </td>
                <td style="padding:3px 6px;text-align:right;font-weight:700;font-size:10px;color:#64748b;white-space:nowrap;">${parseFloat(line.theoreticalQty || 0).toFixed(2)} ${line.unit}</td>
                <td style="padding:3px 6px;text-align:right;font-weight:700;font-size:10px;color:#4f46e5;white-space:nowrap;">${line.isCounted ? `${parseFloat(line.countedQty || 0).toFixed(2)} ${line.unit}` : '—'}</td>
                <td style="padding:3px 6px;text-align:right;font-weight:800;font-size:10px;color:${diffColor};white-space:nowrap;">${line.isCounted ? `${diffQty >= 0 ? '+' : ''}${diffQty.toFixed(2)} ${line.unit}` : '—'}</td>
                <td style="padding:3px 6px;text-align:right;font-weight:700;font-size:10px;color:${diffColor};white-space:nowrap;">${line.isCounted && diffCost !== 0 ? `${diffCost >= 0 ? '+' : ''}${diffCost.toFixed(2)} ₺` : '—'}</td>
            </tr>`;
        }).join('');

        const analysisSummary = type === 'analysis' ? `
        <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <div style="background:#f8fafc;padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">ÖZET ANALİZ</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);">
                <div style="padding:8px 10px;border-right:1px solid #e2e8f0;">
                    <div style="font-size:8px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Toplam Eksik</div>
                    <div style="font-size:14px;font-weight:900;color:#ef4444;">${totalDeficit.toFixed(2)} ₺</div>
                </div>
                <div style="padding:8px 10px;border-right:1px solid #e2e8f0;">
                    <div style="font-size:8px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Toplam Fazla</div>
                    <div style="font-size:14px;font-weight:900;color:#10b981;">+${totalSurplus.toFixed(2)} ₺</div>
                </div>
                <div style="padding:8px 10px;">
                    <div style="font-size:8px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Net Fark</div>
                    <div style="font-size:14px;font-weight:900;color:${netDiff < 0 ? '#ef4444' : netDiff > 0 ? '#10b981' : '#64748b'}">${netDiff >= 0 ? '+' : ''}${netDiff.toFixed(2)} ₺</div>
                </div>
            </div>
        </div>` : '';

        const printContent = `
        <html><head>
            <meta charset="UTF-8"/>
            <title>${reportTitles[type]}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
                body { background: white; color: #1e293b; padding: 16px; font-size: 10px; }
                @media print { body { padding: 10px; } @page { margin: 8mm; size: A4; } }
            </style>
        </head><body>
            <div style="border-bottom:2px solid #4f46e5;padding-bottom:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;">
                <div>
                    <div style="font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">POSNETX › ENVANTER SAYIM</div>
                    <h1 style="font-size:14px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.04em;">${reportTitles[type]}</h1>
                </div>
                <div style="text-align:right;font-size:8px;font-weight:700;color:#64748b;line-height:1.6;">
                    <div>Fiş No: <strong style="color:#4f46e5;">#${session?.id}</strong> &nbsp;|&nbsp; Tarih: ${session?.sessionDate ? new Date(session.sessionDate).toLocaleDateString('tr-TR') : '-'} &nbsp;|&nbsp; Depo: ${session?.warehouse?.name || 'Tüm Depolar'}</div>
                    <div>Yazdırma: ${new Date().toLocaleString('tr-TR')} &nbsp;|&nbsp; Toplam: ${reportLines.length} kalem</div>
                </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:10px;">
                <thead>
                    <tr style="background:#1e293b;color:white;">
                        <th style="padding:5px 6px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;width:28px;">#</th>
                        <th style="padding:5px 6px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;">Stok Adı</th>
                        <th style="padding:5px 6px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;color:#94a3b8;">Kod / Grup</th>
                        <th style="padding:5px 6px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;">Teorik</th>
                        <th style="padding:5px 6px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;color:#a5b4fc;">Fiili</th>
                        <th style="padding:5px 6px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;">Fark (Adet)</th>
                        <th style="padding:5px 6px;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.07em;font-weight:900;">Fark (₺)</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${analysisSummary}
            <div style="margin-top:12px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:7px;color:#94a3b8;font-weight:700;">
                <div>${reportTitles[type]} — ${new Date().toLocaleDateString('tr-TR')}</div>
                <div>POSNetX Envanter Yönetim Sistemi</div>
            </div>
        </body></html>`;

        const printWin = window.open('', '_blank', 'width=1000,height=700');
        if (printWin) {
            printWin.document.write(printContent);
            printWin.document.close();
            printWin.onload = () => {
                printWin.focus();
                printWin.print();
            };
        }
    };

    const handlePrintForm = () => {
        setFormModalOpen(false);
        const showTheo = formConfig.showTheoretical && !isBlindCount;

        const countTypeLabel = session?.countType === 'PARTIAL' ? 'KİSMİ SAYIM' : session?.countType === 'LOCATION' ? 'LOKASYON BAZLI SAYIM' : 'TAM SAYIM';

        const rows = lines.map((line, idx) => {
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
            return `
            <tr style="background:${rowBg};border-bottom:1px solid #e8ecf0;">
                <td style="padding:4px 6px;font-size:9px;font-weight:700;color:#64748b;white-space:nowrap;vertical-align:top;">${line.stockCard?.code || '-'}</td>
                <td style="padding:4px 6px;font-size:9px;font-weight:700;color:#1e293b;vertical-align:top;">${line.stockCard?.name || '-'}</td>
                <td style="padding:4px 6px;font-size:9px;color:#64748b;text-align:center;white-space:nowrap;vertical-align:top;">${line.unit || '-'}</td>
                <td style="padding:4px 6px;font-size:9px;color:#94a3b8;text-align:center;vertical-align:top;"></td>
                ${showTheo ? `<td style="padding:4px 6px;font-size:9px;font-weight:700;color:#475569;text-align:center;white-space:nowrap;vertical-align:top;">${parseFloat(line.theoreticalQty || 0).toFixed(2)}</td>` : ''}
                <td style="padding:4px 6px;vertical-align:top;"><div style="border-bottom:1px solid #000;height:18px;"></div></td>
                <td style="padding:4px 6px;vertical-align:top;"><div style="border-bottom:1px solid #ccc;height:45px;"></div></td>
            </tr>`;
        }).join('');

        const printContent = `
        <html><head>
            <meta charset="UTF-8"/>
            <title>SAYİM FORMU - Fiş #${session?.id}</title>
            <style>
                * { box-sizing:border-box; margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; }
                body { background:white; color:#1e293b; padding:14px; font-size:9px; }
                @media print { body { padding:8px; } @page { margin:6mm; size:A4 portrait; } }
                .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; }
                .info-item { display:flex; gap:4px; align-items:baseline; }
                .info-label { font-size:7px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; white-space:nowrap; }
                .info-value { font-size:9px; font-weight:700; color:#1e293b; border-bottom:1px solid #e2e8f0; flex:1; min-width:60px; }
                table { width:100%; border-collapse:collapse; }
                thead th { background:#1e293b; color:white; padding:5px 6px; text-align:left; font-size:7.5px; font-weight:900; text-transform:uppercase; letter-spacing:0.07em; }
                tfoot td { background:#f8fafc; padding:6px 8px; font-size:8px; font-weight:700; border-top:2px solid #1e293b; }
                .sign-box { border:1px solid #cbd5e1; border-radius:4px; padding:8px 12px; }
                .sign-line { border-bottom:1px dashed #94a3b8; height:28px; margin-top:4px; }
            </style>
        </head><body>
            <!-- HEADER -->
            <div style="border:2px solid #1e293b;border-radius:6px;padding:10px 14px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
                    <div>
                        <div style="font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">POSNETX › ENVANTER YÖNETİMİ</div>
                        <h1 style="font-size:15px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;">SAYİM FORMU</h1>
                        <div style="margin-top:3px;"><span style="background:#1e293b;color:white;font-size:8px;font-weight:900;padding:2px 8px;border-radius:3px;">${countTypeLabel}</span></div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px;font-weight:900;color:#4f46e5;">Fiş No: #${session?.id}</div>
                        <div style="font-size:9px;font-weight:700;color:#64748b;">Sayım Tarihi: ${session?.sessionDate ? new Date(session.sessionDate).toLocaleDateString('tr-TR') : '-'}</div>
                        <div style="font-size:9px;font-weight:700;color:#64748b;">Yazdırma: ${new Date().toLocaleString('tr-TR')}</div>
                        <div style="font-size:9px;font-weight:700;color:#64748b;">Toplam Kalem: ${lines.length}</div>
                    </div>
                </div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">İşletme Adı</span>
                        <span class="info-value">${formConfig.businessName || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Depo / Lokasyon</span>
                        <span class="info-value">${session?.warehouse?.name || 'Tüm Depolar'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Şube Adı</span>
                        <span class="info-value">${formConfig.branchName || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Sayımı Hazırlayan</span>
                        <span class="info-value">${user?.name || user?.email || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Sayımı Yapan Kişi</span>
                        <span class="info-value">${formConfig.counterPerson || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Sayım Nüshası</span>
                        <span class="info-value"></span>
                    </div>
                </div>
            </div>

            <!-- TABLO -->
            <table>
                <thead>
                    <tr>
                        <th style="width:70px;">Stok Kodu</th>
                        <th>Stok Adı</th>
                        <th style="width:36px;text-align:center;">Birim</th>
                        <th style="width:80px;text-align:center;">Lokasyon / Raf</th>
                        ${showTheo ? '<th style="width:54px;text-align:center;">Teorik</th>' : ''}
                        <th style="width:80px;text-align:center;background:#2d3a52;">Sayılan Miktar</th>
                        <th style="width:250px;text-align:center;">Not</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="${showTheo ? 7 : 6}" style="padding:4px 8px;">
                            Toplam ${lines.length} kalem &nbsp;&mdash;&nbsp; ${countTypeLabel}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <!-- İMZA ALANLARI -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;">
                <div class="sign-box">
                    <div style="font-size:7.5px;font-weight:900;color:#64748b;text-transform:uppercase;">Sayımı Yapan</div>
                    <div class="sign-line"></div>
                    <div style="font-size:8px;color:#94a3b8;margin-top:2px;">İmza / İsim</div>
                </div>
                <div class="sign-box">
                    <div style="font-size:7.5px;font-weight:900;color:#64748b;text-transform:uppercase;">Kontrol Eden</div>
                    <div class="sign-line"></div>
                    <div style="font-size:8px;color:#94a3b8;margin-top:2px;">İmza / İsim</div>
                </div>
                <div class="sign-box">
                    <div style="font-size:7.5px;font-weight:900;color:#64748b;text-transform:uppercase;">Yönetici Onayı</div>
                    <div class="sign-line"></div>
                    <div style="font-size:8px;color:#94a3b8;margin-top:2px;">İmza / İsim</div>
                </div>
            </div>

            <div style="margin-top:10px;text-align:center;font-size:7px;color:#cbd5e1;">POSNetX Envanter Yönetim Sistemi &mdash; ${new Date().toLocaleString('tr-TR')}</div>
        </body></html>`;

        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (printWin) {
            printWin.document.write(printContent);
            printWin.document.close();
            printWin.onload = () => { printWin.focus(); printWin.print(); };
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans relative transition-colors duration-300">
            {/* Background Decorations */}
            <div className={`absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none z-0 ${session?.status === 'COMPLETED' ? 'bg-emerald-500/5' : session?.status === 'CANCELLED' ? 'bg-red-500/5' : 'bg-indigo-500/5'}`}></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none z-0"></div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sayım Fişi Yükleniyor...</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full z-10 relative">
                    {!session ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 z-10">
                            <i className="fat fa-triangle-exclamation text-4xl text-amber-500 mb-4"></i>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sayım Fişi Bulunamadı veya Yüklenemedi.</p>
                            <button onClick={() => router.push(`/${locale}/inventory/count`)} className="mt-6 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest">Geri Dön</button>
                        </div>
                    ) : (
                        <>  
                            {/* Header */}
                            <div className="px-[50px] py-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border-b border-white dark:border-slate-700 shadow-sm shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-50">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase m-0 leading-none">
                                            SAYIM FİŞİ <span className="text-indigo-600 dark:text-indigo-400 opacity-80">#{session?.id}</span>
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                <i className="fat fa-calendar mr-1"></i> {session?.sessionDate ? new Date(session.sessionDate).toLocaleDateString('tr-TR') : '-'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                <i className="fat fa-building mr-1"></i> {session?.warehouse?.name || (session?.warehouseId ? `Depo #${session.warehouseId}` : 'Tüm Depolar')}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${session?.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : session?.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                                                {session?.status === 'COMPLETED' ? 'ONAYLANDI' : session?.status === 'CANCELLED' ? 'İPTAL EDİLDİ' : 'AÇIK (DEVAM EDİYOR)'}
                                            </span>
                                            {isBlindCount && (
                                                <span className="text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                                                    <i className="fat fa-eye-slash mr-1"></i> Kör Sayım
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto pb-2 md:pb-0 items-center flex-wrap">
                                    {!isReadOnly && (
                                        <>
                                            <button onClick={handleCancelSession} disabled={saving} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest whitespace-nowrap shadow-sm hover:bg-red-100 transition-all flex items-center gap-2 disabled:opacity-50">
                                                <i className="fat fa-ban"></i> İptal Et
                                            </button>
                                            <button onClick={() => saveDraft(false)} disabled={saving || Object.keys(pendingChanges).length === 0} className="px-5 py-2.5 bg-white border border-slate-200 dark:bg-slate-700 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:text-slate-400">
                                                {saving ? <i className="fat fa-spinner fa-spin"></i> : <i className="fat fa-floppy-disk"></i>}
                                                Taslağı Kaydet
                                                {Object.keys(pendingChanges).length > 0 && <span className="bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px]">{Object.keys(pendingChanges).length}</span>}
                                            </button>
                                            <button onClick={handleApprove} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-md hover:shadow-lg hover:from-emerald-600 transition-all active:scale-95 flex items-center gap-2">
                                                <i className="fat fa-check-double"></i> SAYIMI ONAYLA (UYGULA)
                                            </button>
                                        </>
                                    )}
                                    {/* Print Dropdown */}
                                    <div className="relative">
                                        <button onClick={() => setPrintDropdownOpen(p => !p)} className="px-5 py-2.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-sm transition-all flex items-center gap-2">
                                            <i className="fat fa-print"></i> Rapor Yazdır
                                            <i className={`fat fa-chevron-down text-[9px] transition-transform duration-200 ${printDropdownOpen ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        {printDropdownOpen && (
                                            <>
                                                {/* Backdrop to close */}
                                                <div className="fixed inset-0 z-40" onClick={() => setPrintDropdownOpen(false)}></div>
                                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                                                    <div className="p-1.5">
                                                        <button onClick={() => handlePrintReport('full')} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors flex items-center gap-3 uppercase tracking-widest">
                                                            <i className="fat fa-list-check text-indigo-400 w-4"></i> Tam Sayım Raporu
                                                        </button>
                                                        <button onClick={() => handlePrintReport('deficits')} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 transition-colors flex items-center gap-3 uppercase tracking-widest">
                                                            <i className="fat fa-arrow-trend-down text-red-400 w-4"></i> Eksikler Raporu
                                                        </button>
                                                        <button onClick={() => handlePrintReport('surpluses')} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-3 uppercase tracking-widest">
                                                            <i className="fat fa-arrow-trend-up text-emerald-400 w-4"></i> Fazlalar Raporu
                                                        </button>
                                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                                        <button onClick={() => handlePrintReport('analysis')} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 transition-colors flex items-center gap-3 uppercase tracking-widest">
                                                            <i className="fat fa-chart-bar text-amber-400 w-4"></i> Fark Analiz Raporu
                                                        </button>
                                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                                        <button onClick={() => { setPrintDropdownOpen(false); setFormConfig(c => ({ ...c, showTheoretical: !isBlindCount })); setFormModalOpen(true); }} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-400 transition-colors flex items-center gap-3 uppercase tracking-widest">
                                                            <i className="fat fa-clipboard-list text-teal-400 w-4"></i> Sayım Formu Yazdır
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button onClick={() => router.push(`/${locale}/inventory/count`)} className="px-5 py-2.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-sm transition-all flex items-center gap-2">
                                        <i className="fat fa-arrow-left"></i> Geri
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden flex flex-col px-[50px] py-6 relative">
                                {session?.note && (
                                    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50 rounded-2xl flex items-start gap-4 shrink-0">
                                        <i className="fat fa-note-sticky text-amber-500 text-2xl mt-1"></i>
                                        <div>
                                            <h6 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">Sayım Notu / Açıklaması</h6>
                                            <p className="text-sm font-bold text-amber-900/70 dark:text-amber-300/70 m-0">{session?.note}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-64">
                                            <i className="fat fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Stok adı veya kodu ile ara..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="">Tüm Kategoriler</option>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <i className="fat fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                                        </div>
                                        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === 'ALL' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Tümü</button>
                                            <button onClick={() => setFilterStatus('COUNTED')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === 'COUNTED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Sayılan</button>
                                            <button onClick={() => setFilterStatus('UNCOUNTED')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === 'UNCOUNTED' ? 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Sayılmayan</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 bg-white dark:bg-slate-800 px-6 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ml-auto">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İlerleme</span>
                                            <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">{kpiCountedLines} <span className="text-sm text-slate-400 font-bold">/ {kpiTotalLines}</span></span>
                                        </div>
                                        <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700"></div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fark Tutarı</span>
                                            <span className={`text-lg font-black leading-none mt-0.5 ${kpiDiffCost > 0 ? 'text-emerald-500' : kpiDiffCost < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                                {kpiDiffCost > 0 ? '+' : ''}{kpiDiffCost.toFixed(2)} ₺
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white dark:border-slate-700/50 shadow-sm rounded-3xl flex flex-col">
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stok Adı & Kod</th>
                                                    {!isBlindCount && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Teorik Miktar</th>}
                                                    <th className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center w-64 bg-indigo-50/50 dark:bg-indigo-500/5">Sayılan FİİLİ Miktar</th>
                                                    {!isBlindCount && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fark</th>}
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[450px]">DURUM & AÇIKLAMA</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                {filteredLines.map((line, idx) => {
                                                    const diffQty = parseFloat(line.differenceQty) || 0;
                                                    const isNegative = diffQty < 0;
                                                    const isPositive = diffQty > 0;
                                                    let inputColorClass = "bg-white border-slate-200 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 font-bold text-slate-800 dark:text-white";
                                                    if (line.isCounted) {
                                                        if (isNegative && !isBlindCount) inputColorClass = "bg-red-50 border-red-300 focus:border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400";
                                                        else if (isPositive && !isBlindCount) inputColorClass = "bg-emerald-50 border-emerald-300 focus:border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
                                                        else inputColorClass = "bg-indigo-50 border-indigo-200 focus:border-indigo-500 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-500/30 dark:text-indigo-400";
                                                    }
                                                    return (
                                                        <tr key={line.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${line.isCounted ? '' : 'opacity-80'}`}>
                                                            <td className="px-6 py-3">
                                                                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">{idx + 1}</span>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500">
                                                                        <i className={`fat ${line.stockCard?.category === 'Alkol' ? 'fa-wine-bottle text-red-400' : 'fa-box'}`}></i>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{line.stockCard?.name}</p>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{line.stockCard?.code} &bull; {line.stockCard?.category}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {!isBlindCount && (
                                                                <td className="px-6 py-3 text-right">
                                                                    <span className="text-lg font-black text-slate-400 tracking-tight">
                                                                        {parseFloat(line.theoreticalQty).toFixed(2)} <span className="text-xs">{line.unit}</span>
                                                                    </span>
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-3 bg-indigo-50/30 dark:bg-indigo-900/10 relative">
                                                                <div className="flex items-stretch gap-0 w-full max-w-[220px] mx-auto group">
                                                                    <input
                                                                        type="number"
                                                                        step="any"
                                                                        value={line.countedQty === null ? '' : line.countedQty}
                                                                        onChange={(e) => handleLineChange(line.id, 'countedQty', e.target.value)}
                                                                        onFocus={(e) => { vibrate(); e.target.select(); }}
                                                                        disabled={isReadOnly}
                                                                        placeholder="Miktarı Girin.."
                                                                        className={`w-full text-center px-1 py-2.5 rounded-l-xl border-y border-l shadow-inner outline-none transition-all text-sm ${inputColorClass}`}
                                                                        style={{ MozAppearance: 'textfield' }}
                                                                    />
                                                                    <span className={`px-3 py-2.5 border-y font-bold text-xs uppercase tracking-widest flex items-center border-l-0 ${line.isCounted ? (isNegative && !isBlindCount ? 'bg-red-100 border-red-300 text-red-600 dark:bg-red-900/40 dark:border-red-500/30' : (isPositive && !isBlindCount ? 'bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-900/40 dark:border-emerald-500/30' : 'bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/40 dark:border-indigo-500/30')) : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600'}`}>
                                                                        {line.unit}
                                                                    </span>
                                                                    {!isReadOnly && line.stockCard?.purchaseUnit && line.stockCard?.conversionRate > 1 && (
                                                                        <button onClick={() => openHelperModal(line)} title="Bar Sayım Yardımcısı (Şişe + Kalan Türünden)" className={`px-3 py-2.5 rounded-r-xl border-y border-r font-black flex items-center transition-all hover:bg-orange-500 hover:text-white hover:border-orange-600 ${line.isCounted ? (isNegative && !isBlindCount ? 'bg-red-50 border-red-300 text-red-400 dark:bg-red-900/20 dark:border-red-500/30' : (isPositive && !isBlindCount ? 'bg-emerald-50 border-emerald-300 text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-500/30' : 'bg-indigo-50 border-indigo-200 text-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-500/30')) : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-600'}`}>
                                                                            <i className="fat fa-calculator"></i>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {!isBlindCount && (
                                                                <td className="px-6 py-3 text-right">
                                                                    {line.isCounted ? (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className={`text-base font-black tracking-tight ${isNegative ? 'text-red-500' : isPositive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                                                {isPositive ? '+' : ''}{diffQty.toFixed(2)} <span className="text-xs ml-1">{line.unit}</span>
                                                                            </span>
                                                                            {diffQty !== 0 && (
                                                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${isNegative ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
                                                                                    ({(parseFloat(line.differenceCost) || 0).toFixed(2)} ₺)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-3 text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                                        <input type="checkbox" disabled={isReadOnly} checked={line.isCounted} onChange={(e) => handleLineChange(line.id, 'isCounted', e.target.checked)} className="sr-only peer" />
                                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
                                                                    </label>
                                                                    <div className="relative group/note flex-1 min-w-[300px]">
                                                                        <i className={`fat fa-comment-dots absolute left-3 top-1/2 -translate-y-1/2 text-[10px] transition-colors ${line.description ? 'text-amber-500' : 'text-slate-300 group-hover/note:text-slate-400'}`}></i>
                                                                        <input
                                                                            type="text"
                                                                            disabled={isReadOnly}
                                                                            value={line.description || ''}
                                                                            onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                                                            placeholder="Not ekleyin..."
                                                                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all ${line.description ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/5 dark:border-amber-500/20 dark:text-amber-400' : 'bg-slate-50 border-slate-100 text-slate-400 focus:bg-white focus:border-indigo-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-500 dark:focus:border-indigo-500/50'}`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Form Ayarları Modalı */}
            {formModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        <div className="p-6 border-b border-teal-100 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-900/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-0">
                                    <i className="fat fa-clipboard-list text-teal-500"></i> SAYIM FORMU AYARLARI
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Yazdırılacak formu özelleştirin</p>
                            </div>
                            <button onClick={() => setFormModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-slate-800 transition-all shadow-sm">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-auto max-h-[60vh]">
                            {/* Otomatik gelen — salt okunur */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">

                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İşletme Adı</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{formConfig.businessName || <span className="text-slate-400 italic font-normal text-xs">Parametrelerden girilmedi</span>}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Depo / Lokasyon</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{session?.warehouse?.name || 'Tüm Depolar'}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sayım Tarihi</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{session?.sessionDate ? new Date(session.sessionDate).toLocaleDateString('tr-TR') : '-'}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hazırlayan</span>
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{user?.name || user?.email || '-'}</span>
                                </div>
                            </div>
                            {/* Düzenlenebilir alanlar */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Şube Adı <span className="text-teal-500">(Opsiyonel)</span></label>
                                <input type="text" value={formConfig.branchName} onChange={(e) => setFormConfig(c => ({ ...c, branchName: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none" placeholder="Örn: Merkez Şube" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Sayımı Yapan Kişi <span className="text-teal-500">(Opsiyonel)</span></label>
                                <input type="text" value={formConfig.counterPerson} onChange={(e) => setFormConfig(c => ({ ...c, counterPerson: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none" placeholder="Boş bırakılırsa formda boş kalır" />
                            </div>
                            {!isBlindCount && (
                                <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors">
                                    <input type="checkbox" checked={formConfig.showTheoretical} onChange={(e) => setFormConfig(c => ({ ...c, showTheoretical: e.target.checked }))} className="w-4 h-4 accent-teal-500 cursor-pointer" />
                                    <div>
                                        <div className="text-sm font-black text-slate-700 dark:text-slate-300">Teorik Miktarları Göster</div>
                                        <div className="text-[10px] text-slate-400 font-bold">Formda teorik miktar kolonu görünsün</div>
                                    </div>
                                </label>
                            )}
                            {isBlindCount && (
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl">
                                    <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest"><i className="fat fa-eye-slash mr-1"></i> Kör Sayım: Teorik miktarlar formı yazdırılırken gizlenir.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex gap-3">
                            <button onClick={() => setFormModalOpen(false)} className="flex-1 py-3 rounded-2xl font-black text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">İPTAL</button>
                            <button onClick={handlePrintForm} className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-md hover:from-teal-600 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <i className="fat fa-print"></i> FORMU YAZDIR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bar Helper Modal */}
            {helperModalOpen && activeLineForHelper && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-900/20">
                            <i className="fat fa-calculator text-3xl text-orange-500 mb-2"></i>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white capitalize leading-tight mb-1">{activeLineForHelper.stockCard?.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest m-0 flex justify-center gap-2">
                                <span>1 {activeLineForHelper.stockCard?.purchaseUnit} = {activeLineForHelper.stockCard?.conversionRate} {activeLineForHelper.stockCard?.baseUnit}</span>
                            </p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Kapalı (Tam) {activeLineForHelper.stockCard?.purchaseUnit}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">x {activeLineForHelper.stockCard?.conversionRate} {activeLineForHelper.stockCard?.baseUnit}</span>
                                </label>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setHelperClosedQty(Math.max(0, helperClosedQty - 1))} className="w-14 h-14 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center text-xl font-black active:scale-95 transition-transform">-</button>
                                    <input type="number" value={helperClosedQty === 0 ? '' : helperClosedQty} onChange={(e) => setHelperClosedQty(parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full h-14 text-center text-2xl font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 focus:border-orange-500 rounded-2xl outline-none" style={{ MozAppearance: 'textfield' }} />
                                    <button onClick={() => setHelperClosedQty(helperClosedQty + 1)} className="w-14 h-14 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center text-xl font-black active:scale-95 transition-transform">+</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Açık {activeLineForHelper.stockCard?.purchaseUnit} Kalanı ({activeLineForHelper.stockCard?.baseUnit})</label>
                                <div className="relative">
                                    <input type="number" step="any" value={helperOpenQty === 0 ? '' : helperOpenQty} onChange={(e) => setHelperOpenQty(parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full h-14 text-center pr-12 text-2xl font-black text-slate-800 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 focus:border-orange-500 rounded-2xl outline-none" style={{ MozAppearance: 'textfield' }} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 uppercase">{activeLineForHelper.stockCard?.baseUnit}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                    {[10, 20, 35, 50].map(val => (<button key={val} onClick={() => setHelperOpenQty(val)} className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg text-xs font-black text-slate-600 dark:text-slate-300">{val}</button>))}
                                </div>
                            </div>
                            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex justify-between items-center mt-2">
                                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">TOPLAM ({activeLineForHelper.stockCard?.baseUnit})</span>
                                <span className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                                    {((helperClosedQty * (parseFloat(activeLineForHelper.stockCard?.conversionRate) || 1)) + parseFloat(helperOpenQty as any || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex gap-3">
                            <button onClick={() => setHelperModalOpen(false)} className="flex-1 py-3.5 rounded-2xl font-black text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">İPTAL</button>
                            <button onClick={applyHelperCalculation} className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-md shadow-orange-500/20 transition-all active:scale-95">UYGULA</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
