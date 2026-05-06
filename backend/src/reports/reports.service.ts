import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(private dataSource: DataSource) { }

  // ─── DASHBOARD ──────────────────────────────────────────────────────────────

  async getDashboardData(companyId: number = 1) {
    const kpiRes = await this.dataSource.query(`
      WITH CombinedData AS (
        SELECT amount, type, paymentMethod, createdAt FROM account_transactions
        UNION ALL
        SELECT 
          totalAmount as amount, 
          'INCOME' as type, 
          CASE 
            WHEN paymentMethod IN ('CASH', 'KASA') THEN 'KASA'
            WHEN paymentMethod IN ('BANKA', 'POS') THEN 'BANKA'
            WHEN paymentMethod IN ('CREDIT_CARD', 'KREDI_KARTI', 'CC') THEN 'KREDI_KARTI'
            ELSE 'DIGER'
          END as paymentMethod,
          createdAt
        FROM sales 
        WHERE status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
      )
      SELECT 
        -- Weekly (Last 7 Days)
        SUM(CASE WHEN type = 'INCOME' AND createdAt >= DATEADD(day, -7, GETDATE()) THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as weeklyIncome,
        SUM(CASE WHEN type = 'EXPENSE' AND createdAt >= DATEADD(day, -7, GETDATE()) THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as weeklyExpense,
        
        -- Weekly Asset Distribution
        SUM(CASE WHEN paymentMethod = 'KASA' AND createdAt >= DATEADD(day, -7, GETDATE()) THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as kasa,
        SUM(CASE WHEN paymentMethod = 'BANKA' AND createdAt >= DATEADD(day, -7, GETDATE()) THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as banka,
        SUM(CASE WHEN paymentMethod = 'KREDI_KARTI' AND createdAt >= DATEADD(day, -7, GETDATE()) THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as kart,
        SUM(CASE WHEN paymentMethod NOT IN ('KASA', 'BANKA', 'KREDI_KARTI') AND createdAt >= DATEADD(day, -7, GETDATE()) THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as diger
      FROM CombinedData
    `, [companyId]);

    const { weeklyIncome = 0, weeklyExpense = 0, kasa = 0, banka = 0, kart = 0, diger = 0 } = kpiRes[0] || {};

    const currentWeekRes = await this.dataSource.query(`
      WITH WeeklyData AS (
        SELECT amount, type, createdAt FROM account_transactions
        UNION ALL
        SELECT totalAmount as amount, 'INCOME' as type, createdAt FROM sales 
        WHERE status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
      )
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as expense
      FROM WeeklyData
      WHERE createdAt >= DATEADD(day, -7, GETDATE())
    `, [companyId]);

    const prevWeekRes = await this.dataSource.query(`
      WITH WeeklyData AS (
        SELECT amount, type, createdAt FROM account_transactions
        UNION ALL
        SELECT totalAmount as amount, 'INCOME' as type, createdAt FROM sales 
        WHERE status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
      )
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as expense
      FROM WeeklyData
      WHERE createdAt >= DATEADD(day, -14, GETDATE()) AND createdAt < DATEADD(day, -7, GETDATE())
    `, [companyId]);

    const currentWeekSales = Number(currentWeekRes[0]?.income || 0);
    const prevWeekSales = Number(prevWeekRes[0]?.income || 0);
    const currentWeekExp = Number(currentWeekRes[0]?.expense || 0);
    const prevWeekExp = Number(prevWeekRes[0]?.expense || 0);

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      const diff = ((curr - prev) / prev) * 100;
      return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
    };

    const incomeTrend = calculateTrend(currentWeekSales, prevWeekSales);
    const expenseTrend = calculateTrend(currentWeekExp, prevWeekExp);
    const profitTrend = calculateTrend(currentWeekSales - currentWeekExp, prevWeekSales - prevWeekExp);

    const weeklySalesRaw = await this.dataSource.query(`
      WITH WeeklyCombined AS (
        SELECT amount, createdAt FROM account_transactions WHERE type = 'INCOME'
        UNION ALL
        SELECT totalAmount as amount, createdAt FROM sales WHERE status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
      )
      SELECT 
        FORMAT(createdAt, 'yyyy-MM-dd') as date,
        SUM(amount) as total
      FROM WeeklyCombined
      WHERE createdAt >= DATEADD(day, -7, GETDATE())
      GROUP BY FORMAT(createdAt, 'yyyy-MM-dd')
      ORDER BY date ASC
    `, [companyId]);

    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayStr = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      const found = weeklySalesRaw.find((s: any) => s.date === dateStr);
      labels.push(displayStr);
      data.push(found ? Number(found.total) : 0);
    }

    let topProductsRaw = [];
    try {
      topProductsRaw = await this.dataSource.query(`
        SELECT TOP 10 p.name, SUM(CAST(si.quantity AS DECIMAL(18,2))) as count
        FROM sale_items si
        JOIN products p ON p.id = si.productId
        JOIN sales s ON s.id = si.saleId
        WHERE (ISNULL(s.companyId, 1) = @0 OR @0 = 0)
        GROUP BY p.name
        ORDER BY count DESC
      `, [companyId]);
    } catch (e) { topProductsRaw = []; }

    const weeklyCogsRes = await this.dataSource.query(`
      SELECT SUM(CAST(si.quantity AS DECIMAL(18,2)) * CAST(si.costPrice AS DECIMAL(18,2))) as totalCost 
      FROM sale_items si JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED' AND (ISNULL(s.companyId, 1) = @0 OR @0 = 0) AND s.createdAt >= DATEADD(day, -7, GETDATE())
    `, [companyId]);
    const prevWeekCogsRes = await this.dataSource.query(`
      SELECT SUM(CAST(si.quantity AS DECIMAL(18,2)) * CAST(si.costPrice AS DECIMAL(18,2))) as totalCost 
      FROM sale_items si JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED' AND (ISNULL(s.companyId, 1) = @0 OR @0 = 0) AND s.createdAt >= DATEADD(day, -14, GETDATE()) AND s.createdAt < DATEADD(day, -7, GETDATE())
    `, [companyId]);

    const weeklyCogs = Number(weeklyCogsRes[0]?.totalCost || 0);
    const prevWeekCogs = Number(prevWeekCogsRes[0]?.totalCost || 0);
    const cogsTrend = calculateTrend(weeklyCogs, prevWeekCogs);
    const weeklyNetProfit = Number(weeklyIncome) - weeklyCogs - Number(weeklyExpense);

    return {
      totalIncome: Number(weeklyIncome), totalExpense: Number(weeklyExpense), cogs: weeklyCogs, netProfit: weeklyNetProfit,
      kasa: Number(kasa), banka: Number(banka), kart: Number(kart), diger: Number(diger),
      incomeTrend, expenseTrend, profitTrend, cogsTrend,
      salesData: { labels, data },
      balanceData: { labels: ['Kasa (Nakit)', 'Banka (POS)', 'Kart'], data: [Number(kasa), Number(banka), Number(kart)] },
      topProductsData: { labels: topProductsRaw.map((p: any) => p.name), data: topProductsRaw.map((p: any) => Number(p.count)) },
    };
  }

  // ─── 1. SATIŞ ANALİZİ ───────────────────────────────────────────────────────

  async getSalesAnalysis(filters: { date?: string; startDate?: string; endDate?: string; cashRegisterId?: number; companyId?: number }) {
    const { dateFilter, params } = this.buildDateFilter(filters);

    // Günün Cirosu
    const ciroRes = await this.dataSource.query(`
      SELECT
        SUM(CASE WHEN (s.paymentMethod IN ('KASA','CASH')) THEN CAST(s.totalAmount AS DECIMAL(18,2)) ELSE 0 END) as nakitCiro,
        SUM(CASE WHEN (s.paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC')) THEN CAST(s.totalAmount AS DECIMAL(18,2)) ELSE 0 END) as kartCiro,
        SUM(CASE WHEN (s.paymentMethod IN ('CARI')) THEN CAST(s.totalAmount AS DECIMAL(18,2)) ELSE 0 END) as cariCiro,
        SUM(CASE WHEN (s.paymentMethod NOT IN ('KASA','CASH','KREDI_KARTI','CREDIT_CARD','CC','CARI') OR s.paymentMethod IS NULL) THEN CAST(s.totalAmount AS DECIMAL(18,2)) ELSE 0 END) as digerCiro,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as toplamCiro
      FROM sales s
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params);

    const ciro = ciroRes[0] || {};

    // İşlem Özeti
    const islemRes = await this.dataSource.query(`
      SELECT
        COUNT(DISTINCT s.id) as satisAdedi,
        ISNULL(SUM(CAST(s.refundAmount AS DECIMAL(18,2))), 0) as iadeToplam,
        COUNT(DISTINCT CASE WHEN s.status = 'CANCELLED' THEN s.id END) as iptalAdedi,
        ISNULL(SUM(CAST(s.discountAmount AS DECIMAL(18,2))), 0) as indirimToplam
      FROM sales s
      WHERE 1=1 ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params);

    const islem = islemRes[0] || {};

    // İptal Özeti (Audit Logs üzerinden - İşlem anına göre)
    // Hem tüm adisyon iptallerini hem de tekil ürün iptallerini sayar
    const auditDateFilter = dateFilter.replace(/s\.createdAt/g, 'timestamp').replace(/s\./g, '');
    const cancellationAuditRes = await this.dataSource.query(`
      SELECT COUNT(*) as iptalAdedi
      FROM audit_logs
      WHERE actionType IN ('SALE_CANCEL', 'ITEM_CANCEL', 'ADISYON_CANCEL') ${auditDateFilter}
      ${filters.companyId ? ` AND (companyId = ${filters.companyId} OR companyId IS NULL)` : ''}
    `, params);

    // Ürün iptali/iadesi (Miktar bazlı/Statü bazlı)
    const itemIslemRes = await this.dataSource.query(`
      SELECT
        COUNT(CASE WHEN si.status = 'CANCELLED' THEN 1 END) as iptalUrunAdedi,
        ISNULL(SUM(CASE WHEN si.status = 'CANCELLED' THEN CAST(si.total AS DECIMAL(18,2)) ELSE 0 END), 0) as iptalUrunToplam,
        COUNT(CASE WHEN si.status = 'REFUNDED' THEN 1 END) as iadeUrunAdedi,
        ISNULL(SUM(CASE WHEN si.status = 'REFUNDED' THEN CAST(si.total AS DECIMAL(18,2)) ELSE 0 END), 0) as iadeUrunToplam
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE 1=1 ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params);

    // Garson satış toplamları
    const garsonRes = await this.dataSource.query(`
      SELECT u.firstName + ' ' + ISNULL(u.lastName,'') as garsonAdi,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as toplam,
        COUNT(DISTINCT s.id) as adisyonSayisi
      FROM sales s
      LEFT JOIN users u ON u.id = s.waiterId
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY toplam DESC
    `, params);

    // Açık masa/hesap
    const acikMasaRes = await this.dataSource.query(`
      SELECT COUNT(*) as acikMasaSayisi, ISNULL(SUM(currentTotal), 0) as acikMasaToplami
      FROM tables
      WHERE status = 'DOLU'
    `);

    return {
      gunCirosu: {
        nakitCiro: Number(ciro.nakitCiro || 0),
        kartCiro: Number(ciro.kartCiro || 0),
        cariCiro: Number(ciro.cariCiro || 0),
        digerCiro: Number(ciro.digerCiro || 0),
        toplamCiro: Number(ciro.toplamCiro || 0),
      },
      islemOzeti: {
        satisAdedi: Number(islem.satisAdedi || 0),
        iadeToplam: Number(islem.iadeToplam || 0),
        iptalAdedi: Number(cancellationAuditRes[0]?.iptalAdedi || 0),
        indirimToplam: Number(islem.indirimToplam || 0),
        iptalUrunAdedi: Number(itemIslemRes[0]?.iptalUrunAdedi || 0),
        iptalUrunToplam: Number(itemIslemRes[0]?.iptalUrunToplam || 0),
        iadeUrunAdedi: Number(itemIslemRes[0]?.iadeUrunAdedi || 0),
        iadeUrunToplam: Number(itemIslemRes[0]?.iadeUrunToplam || 0),
      },
      acikMasa: {
        sayi: Number(acikMasaRes[0]?.acikMasaSayisi || 0),
        toplam: Number(acikMasaRes[0]?.acikMasaToplami || 0),
      },
      garsonlarToplamlar: garsonRes.map((g: any) => ({
        garsonAdi: g.garsonAdi?.trim() || 'Bilinmeyen',
        toplam: Number(g.toplam || 0),
        adisyonSayisi: Number(g.adisyonSayisi || 0),
      })),
    };
  }

  // ─── 2. DETAYLI SATIŞ ANALİZİ ────────────────────────────────────────────────

  async getDetailedSalesAnalysis(filters: {
    startDate?: string; endDate?: string; cashRegisterId?: number;
    waiterId?: number; paymentMethod?: string; companyId?: number;
  }) {
    const { dateFilter, params } = this.buildDateFilter(filters);

    // Tahsilat detayları
    const tahsilatRes = await this.dataSource.query(`
      SELECT paymentMethod,
        SUM(CAST(totalAmount AS DECIMAL(18,2))) as toplam,
        COUNT(*) as adet
      FROM sales s
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY paymentMethod
    `, params);

    // Ürün satış özeti (en çok satılanlar)
    const urunRes = await this.dataSource.query(`
      SELECT p.name as urunAdi,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as adet,
        SUM(CAST(si.total AS DECIMAL(18,2))) as toplam
      FROM sale_items si
      JOIN products p ON p.id = si.productId
      JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED' AND si.status = 'ACTIVE' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY p.name
      ORDER BY toplam DESC
    `, params);

    // Satış Tipi Kırılımı (Yarım/Duble)
    const saleTypeRes = await this.dataSource.query(`
      SELECT p.name as urunAdi,
        si.saleType,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as adet,
        SUM(CAST(si.total AS DECIMAL(18,2))) as toplam
      FROM sale_items si
      JOIN products p ON p.id = si.productId
      JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED' AND si.status = 'ACTIVE' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY p.name, si.saleType
      ORDER BY p.name, si.saleType
    `, params);

    // Grup bazlı satış (kategori)
    const grupRes = await this.dataSource.query(`
      SELECT ISNULL(p.category, 'Diğer') as kategori,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as adet,
        SUM(CAST(si.total AS DECIMAL(18,2))) as toplam
      FROM sale_items si
      JOIN products p ON p.id = si.productId
      JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED' AND si.status = 'ACTIVE' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY p.category
      ORDER BY toplam DESC
    `, params);

    // Garson toplamları
    const garsonRes = await this.dataSource.query(`
      SELECT u.firstName + ' ' + ISNULL(u.lastName,'') as garsonAdi,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as satisToplam,
        SUM(CAST(s.discountAmount AS DECIMAL(18,2))) as indirimToplam,
        COUNT(DISTINCT s.id) as adisyonSayisi
      FROM sales s
      LEFT JOIN users u ON u.id = s.waiterId
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY satisToplam DESC
    `, params);

    // İndirim özeti
    const indirimRes = await this.dataSource.query(`
      SELECT SUM(CAST(discountAmount AS DECIMAL(18,2))) as toplamIndirim,
        COUNT(CASE WHEN discountAmount > 0 THEN 1 END) as indirimliAdisyon
      FROM sales s
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params);

    // İade/iptal detayları (SaleItems üzerinden - Artık ödeme sonrası silinmiyorlar)
    const iadeRes = await this.dataSource.query(`
      SELECT si.status as durum,
        COUNT(*) as adet,
        SUM(CAST(si.total AS DECIMAL(18,2))) as toplam
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE si.status IN ('CANCELLED','REFUNDED') ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY si.status
    `, params);

    // Genel toplamlar
    const toplamRes = await this.dataSource.query(`
      SELECT
        SUM(CAST(totalAmount AS DECIMAL(18,2))) as netSatis,
        SUM(CAST(discountAmount AS DECIMAL(18,2))) as toplamIndirim,
        SUM(CAST(serviceFee AS DECIMAL(18,2))) as toplamServis,
        ISNULL(SUM(CAST(refundAmount AS DECIMAL(18,2))), 0) as toplamIade,
        COUNT(*) as adisyonSayisi
      FROM sales s
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params);

    return {
      tahsilatDetay: tahsilatRes.map((t: any) => ({
        odemeYontemi: t.paymentMethod || 'Diğer',
        toplam: Number(t.toplam || 0),
        adet: Number(t.adet || 0),
      })),
      urunSatisOzeti: urunRes.map((u: any) => ({
        urunAdi: u.urunAdi,
        adet: Number(u.adet || 0),
        toplam: Number(u.toplam || 0),
      })),
      satisTipiKirilim: saleTypeRes.map((r: any) => ({
        urunAdi: r.urunAdi,
        satisTipi: r.saleType === 'HALF' ? 'Yarım' : r.saleType === 'DOUBLE' ? 'Duble' : 'Standart',
        adet: Number(r.adet || 0),
        toplam: Number(r.toplam || 0),
      })),
      grupSatisToplam: grupRes.map((g: any) => ({
        kategori: g.kategori,
        adet: Number(g.adet || 0),
        toplam: Number(g.toplam || 0),
      })),
      garsonlarToplamlar: garsonRes.map((g: any) => ({
        garsonAdi: g.garsonAdi?.trim() || 'Bilinmeyen',
        satisToplam: Number(g.satisToplam || 0),
        indirimToplam: Number(g.indirimToplam || 0),
        adisyonSayisi: Number(g.adisyonSayisi || 0),
      })),
      indirimOzeti: {
        toplamIndirim: Number(indirimRes[0]?.toplamIndirim || 0),
        indirimliAdisyon: Number(indirimRes[0]?.indirimliAdisyon || 0),
      },
      iadeIptalDetay: iadeRes.map((i: any) => ({
        durum: i.durum,
        adet: Number(i.adet || 0),
        toplam: Number(i.toplam || 0),
      })),
      genelToplamlar: {
        netSatis: Number(toplamRes[0]?.netSatis || 0),
        toplamIndirim: Number(toplamRes[0]?.toplamIndirim || 0),
        toplamServis: Number(toplamRes[0]?.toplamServis || 0),
        toplamIade: Number(toplamRes[0]?.toplamIade || 0),
        toplamIadeUrun: Number(iadeRes.find((i: any) => i.durum === 'REFUNDED')?.toplam || 0),
        toplamIptal: Number(iadeRes.find((i: any) => i.durum === 'CANCELLED')?.toplam || 0),
        adisyonSayisi: Number(toplamRes[0]?.adisyonSayisi || 0),
      },
    };
  }

  // ─── 3. VARDİYA RAPORU ───────────────────────────────────────────────────────

  async getShiftReport(shiftId: number) {
    const shiftRes = await this.dataSource.query(`
      SELECT sh.*, u.firstName + ' ' + ISNULL(u.lastName,'') as kullanicıAdi,
        cr.name as kasaAdi
      FROM shifts sh
      LEFT JOIN users u ON u.id = sh.userId
      LEFT JOIN cash_registers cr ON cr.id = sh.cashRegisterId
      WHERE sh.id = @0
    `, [shiftId]);

    if (!shiftRes[0]) return null;
    const shift = shiftRes[0];

    // Tahsilat toplamları
    const tahsilatRes = await this.dataSource.query(`
      SELECT
        SUM(CASE WHEN paymentMethod IN ('KASA','CASH') THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as nakit,
        SUM(CASE WHEN paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC') THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as krediKarti,
        SUM(CASE WHEN paymentMethod = 'CARI' THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
        SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as bolunmusNakit,
        SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as bolunmusKart,
        SUM(CAST(totalAmount AS DECIMAL(12,2))) as toplamTahsilat,
        COUNT(*) as adisyonSayisi
      FROM sales
      WHERE shiftId = @0 AND status = 'COMPLETED'
    `, [shiftId]);

    // İşlem özeti
    const islemRes = await this.dataSource.query(`
      SELECT
        SUM(CAST(totalAmount AS DECIMAL(12,2))) as satisToplam,
        ISNULL(SUM(CAST(refundAmount AS DECIMAL(12,2))), 0) as iadeToplam,
        ISNULL(SUM(CAST(discountAmount AS DECIMAL(12,2))), 0) as indirimToplam,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as iptalAdedi
      FROM sales
      WHERE shiftId = @0
    `, [shiftId]);

    const tahsilat = tahsilatRes[0] || {};
    const islem = islemRes[0] || {};

    const sure = shift.closedAt && shift.openedAt
      ? Math.round((new Date(shift.closedAt).getTime() - new Date(shift.openedAt).getTime()) / 60000)
      : null;

    return {
      vardiyaBilgisi: {
        vardiyaNo: shift.id,
        kasaAdi: shift.kasaAdi,
        kullanici: shift.kullanicıAdi?.trim(),
        acilisSaati: shift.openedAt,
        kapanisSaati: shift.closedAt,
        sureDakika: sure,
        durum: shift.status,
        businessDate: shift.businessDate,
      },
      acilisBilgisi: {
        acilisNakdi: Number(shift.openingCash || 0),
        not: shift.note,
      },
      tahsilat: {
        nakit: Number(tahsilat.nakit || 0) + Number(tahsilat.bolunmusNakit || 0),
        krediKarti: Number(tahsilat.krediKarti || 0) + Number(tahsilat.bolunmusKart || 0),
        cari: Number(tahsilat.cari || 0),
        toplamTahsilat: Number(tahsilat.toplamTahsilat || 0),
        adisyonSayisi: Number(tahsilat.adisyonSayisi || 0),
      },
      islemler: {
        satisToplam: Number(islem.satisToplam || 0),
        iadeToplam: Number(islem.iadeToplam || 0),
        indirimToplam: Number(islem.indirimToplam || 0),
        iptalAdedi: Number(islem.iptalAdedi || 0),
      },
      kapanis: {
        beklenenNakit: Number(shift.expectedCash || 0),
        sayilanNakit: Number(shift.closingCash || 0),
        fark: Number(shift.cashDifference || 0),
      },
    };
  }

  async getShiftReportByUser(userId: number, startDate?: string, endDate?: string) {
    // Build date filters
    const dateConditions: string[] = [];
    const params: any[] = [userId];

    if (startDate) {
      const sd = new Date(startDate);
      sd.setHours(0, 0, 0, 0);
      params.push(sd.toISOString());
      dateConditions.push(`sh.openedAt >= @${params.length - 1}`);
    }
    if (endDate) {
      const ed = new Date(endDate);
      ed.setHours(23, 59, 59, 999);
      params.push(ed.toISOString());
      dateConditions.push(`sh.openedAt <= @${params.length - 1}`);
    }
    const dateSql = dateConditions.length > 0 ? 'AND ' + dateConditions.join(' AND ') : '';

    // Fetch all shifts for the user
    const shiftsRes = await this.dataSource.query(`
      SELECT sh.*, 
        u.firstName + ' ' + ISNULL(u.lastName,'') as kullanicıAdi,
        cr.name as kasaAdi
      FROM shifts sh
      LEFT JOIN users u ON u.id = sh.userId
      LEFT JOIN cash_registers cr ON cr.id = sh.cashRegisterId
      WHERE sh.userId = @0 ${dateSql}
      ORDER BY sh.openedAt DESC
    `, params);

    if (!shiftsRes || shiftsRes.length === 0) return null;

    const shiftIds = shiftsRes.map((s: any) => s.id).join(',');
    const personelAdi = shiftsRes[0].kullanicıAdi?.trim();

    // Tahsilat toplamları (all shifts combined)
    const tahsilatRes = await this.dataSource.query(`
      SELECT
        SUM(CASE WHEN paymentMethod IN ('KASA','CASH') THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as nakit,
        SUM(CASE WHEN paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC') THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as krediKarti,
        SUM(CASE WHEN paymentMethod = 'CARI' THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
        SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as bolunmusNakit,
        SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as bolunmusKart,
        SUM(CAST(totalAmount AS DECIMAL(12,2))) as toplamTahsilat,
        COUNT(*) as adisyonSayisi
      FROM sales
      WHERE shiftId IN (${shiftIds}) AND status = 'COMPLETED'
    `);

    // İşlem özeti
    const islemRes = await this.dataSource.query(`
      SELECT
        SUM(CAST(totalAmount AS DECIMAL(12,2))) as satisToplam,
        ISNULL(SUM(CAST(refundAmount AS DECIMAL(12,2))), 0) as iadeToplam,
        ISNULL(SUM(CAST(discountAmount AS DECIMAL(12,2))), 0) as indirimToplam,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as iptalAdedi
      FROM sales
      WHERE shiftId IN (${shiftIds})
    `);

    const tahsilat = tahsilatRes[0] || {};
    const islem = islemRes[0] || {};

    // Toplam süre & kapanış
    let totalMinutes = 0;
    let totalBeklenen = 0, totalSayilan = 0, totalFark = 0, totalAcilisNakdi = 0;
    for (const sh of shiftsRes) {
      if (sh.closedAt && sh.openedAt) {
        totalMinutes += Math.round((new Date(sh.closedAt).getTime() - new Date(sh.openedAt).getTime()) / 60000);
      }
      totalBeklenen += Number(sh.expectedCash || 0);
      totalSayilan += Number(sh.closingCash || 0);
      totalFark += Number(sh.cashDifference || 0);
      totalAcilisNakdi += Number(sh.openingCash || 0);
    }

    const firstShift = shiftsRes[shiftsRes.length - 1];
    const lastShift = shiftsRes[0];

    return {
      vardiyaBilgisi: {
        vardiyaNo: `${shiftsRes.length} vardiya`,
        kasaAdi: shiftsRes.map((s: any) => s.kasaAdi).filter(Boolean).join(', ') || '—',
        kullanici: personelAdi,
        acilisSaati: firstShift.openedAt,
        kapanisSaati: lastShift.closedAt,
        sureDakika: totalMinutes || null,
        durum: shiftsRes.some((s: any) => s.status === 'OPEN') ? 'OPEN' : 'CLOSED',
        businessDate: `${startDate || '—'} → ${endDate || '—'}`,
      },
      acilisBilgisi: {
        acilisNakdi: totalAcilisNakdi,
        not: `Toplam ${shiftsRes.length} vardiya`,
      },
      tahsilat: {
        nakit: Number(tahsilat.nakit || 0) + Number(tahsilat.bolunmusNakit || 0),
        krediKarti: Number(tahsilat.krediKarti || 0) + Number(tahsilat.bolunmusKart || 0),
        cari: Number(tahsilat.cari || 0),
        toplamTahsilat: Number(tahsilat.toplamTahsilat || 0),
        adisyonSayisi: Number(tahsilat.adisyonSayisi || 0),
      },
      islemler: {
        satisToplam: Number(islem.satisToplam || 0),
        iadeToplam: Number(islem.iadeToplam || 0),
        indirimToplam: Number(islem.indirimToplam || 0),
        iptalAdedi: Number(islem.iptalAdedi || 0),
      },
      kapanis: {
        beklenenNakit: totalBeklenen,
        sayilanNakit: totalSayilan,
        fark: totalFark,
      },
      vardiaylar: shiftsRes.map((sh: any) => ({
        id: sh.id,
        kasaAdi: sh.kasaAdi,
        acilis: sh.openedAt,
        kapanis: sh.closedAt,
        durum: sh.status,
        businessDate: sh.businessDate,
      })),
    };
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────

  private buildDateFilter(filters: { startDate?: string; endDate?: string; date?: string; cashRegisterId?: number }) {
    const params: any[] = [];
    let dateFilter = '';
    let pIdx = 0;

    const dateStr = filters.date;
    if (dateStr) {
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateStr);
      end.setHours(23, 59, 59, 999);
      params.push(start, end);
      dateFilter += ` AND s.createdAt >= @${pIdx++} AND s.createdAt <= @${pIdx++}`;
    } else {
      if (filters.startDate) {
        params.push(new Date(filters.startDate));
        dateFilter += ` AND s.createdAt >= @${pIdx++}`;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        params.push(end);
        dateFilter += ` AND s.createdAt <= @${pIdx++}`;
      }
    }

    if (filters.cashRegisterId) {
      params.push(filters.cashRegisterId);
      dateFilter += ` AND s.cashRegisterId = @${pIdx++}`;
    }

    return { dateFilter, params };
  }

  // ─── TRANSFER RAPORU ──────────────────────────────────────────────────────────

  async getTransferReport(filters: { startDate?: string; endDate?: string }) {
    const { dateFilter, params } = this.buildDateFilter({ startDate: filters.startDate, endDate: filters.endDate });

    // İşlem türüne göre sayılar
    const typeCountsRes = await this.dataSource.query(`
      SELECT transferType, COUNT(*) as adet
      FROM transfer_logs tl
      WHERE 1=1 ${dateFilter.replace(/s\./g, 'tl.')}
      GROUP BY transferType
    `, params).catch(() => []);

    // Masa bazlı transfer yoğunluğu
    const tableStatsRes = await this.dataSource.query(`
      SELECT sourceTableName, COUNT(*) as transferSayisi,
        SUM(CAST(amountBefore AS DECIMAL(18,2))) as toplamTutar
      FROM transfer_logs tl
      WHERE 1=1 ${dateFilter.replace(/s\./g, 'tl.')}
      GROUP BY sourceTableName
      ORDER BY transferSayisi DESC
    `, params).catch(() => []);

    // Toplam
    const toplamRes = await this.dataSource.query(`
      SELECT COUNT(*) as toplamTransfer,
        SUM(CAST(amountBefore AS DECIMAL(18,2))) as toplamTutar
      FROM transfer_logs tl
      WHERE 1=1 ${dateFilter.replace(/s\./g, 'tl.')}
    `, params).catch(() => [{}]);

    return {
      islemTurleri: typeCountsRes.map((t: any) => ({
        tur: t.transferType,
        adet: Number(t.adet || 0),
      })),
      masaBazliYogunluk: tableStatsRes.map((m: any) => ({
        masaAdi: m.sourceTableName,
        transferSayisi: Number(m.transferSayisi || 0),
        toplamTutar: Number(m.toplamTutar || 0),
      })),
      genelToplam: {
        toplamTransfer: Number(toplamRes[0]?.toplamTransfer || 0),
        toplamTutar: Number(toplamRes[0]?.toplamTutar || 0),
      },
    };
  }
}
