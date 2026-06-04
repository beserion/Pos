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
        WHERE paymentMethod != 'SPLIT' AND status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
        UNION ALL
        SELECT 
          paidAmountCash as amount, 
          'INCOME' as type, 
          'KASA' as paymentMethod,
          createdAt
        FROM sales 
        WHERE paymentMethod = 'SPLIT' AND status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
        UNION ALL
        SELECT 
          paidAmountCreditCard as amount, 
          'INCOME' as type, 
          'KREDI_KARTI' as paymentMethod,
          createdAt
        FROM sales 
        WHERE paymentMethod = 'SPLIT' AND status = 'COMPLETED' AND isEndOfDayClosed = 0 AND (ISNULL(companyId, 1) = @0 OR @0 = 0)
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
        SUM(CASE 
          WHEN (s.paymentMethod IN ('KASA','CASH')) THEN CAST(s.totalAmount AS DECIMAL(18,2)) 
          WHEN (s.paymentMethod = 'SPLIT') THEN CAST(s.paidAmountCash AS DECIMAL(18,2))
          ELSE 0 END) as nakitCiro,
        SUM(CASE 
          WHEN (s.paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC')) THEN CAST(s.totalAmount AS DECIMAL(18,2)) 
          WHEN (s.paymentMethod = 'SPLIT') THEN CAST(s.paidAmountCreditCard AS DECIMAL(18,2))
          ELSE 0 END) as kartCiro,
        SUM(CASE WHEN (s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN')) THEN CAST(s.totalAmount AS DECIMAL(18,2)) ELSE 0 END) as cariCiro,
        SUM(CASE WHEN (s.paymentMethod NOT IN ('KASA','CASH','KREDI_KARTI','CREDIT_CARD','CC','CARI','PARTNER','OPEN','SPLIT') OR s.paymentMethod IS NULL) THEN CAST(s.totalAmount AS DECIMAL(18,2)) ELSE 0 END) as digerCiro,
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
    // Audit logs'da henüz businessDate kolonu yok, bu yüzden timestamp'i formatlayarak karşılaştırıyoruz.
    const auditDateFilter = dateFilter.replace(/s\.businessDate/g, "FORMAT(timestamp, 'yyyy-MM-dd')").replace(/s\./g, '');
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

    // Alınan Döviz Analizi
    const dovizRes = await this.dataSource.query(`
      SELECT 
        COALESCE(s.paidCurrency, 'TRY') as currency,
        SUM(CAST(s.paidCurrencyAmount AS DECIMAL(18,2))) as totalAmount
      FROM sales s
      WHERE s.status = 'COMPLETED' AND s.paidCurrencyAmount > 0 ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY s.paidCurrency
    `, params).catch(() => []);

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
      dovizAnalizi: dovizRes.map((d: any) => ({
        currency: d.currency,
        totalAmount: Number(d.totalAmount || 0),
      })),
    };
  }

  // ─── 2. DETAYLI SATIŞ ANALİZİ ────────────────────────────────────────────────

  async getDetailedSalesAnalysis(filters: {
    startDate?: string; endDate?: string; cashRegisterId?: number;
    waiterId?: number; paymentMethod?: string; companyId?: number;
    date?: string;
  }) {
    const { dateFilter, params } = this.buildDateFilter(filters);
    const { dateFilter: dateFilterAcc, params: paramsAcc } = this.buildDateFilter({
      startDate: filters.startDate,
      endDate: filters.endDate,
      date: filters.date,
    });

    // 1. Tahsilat Detayları & SPLIT Payments
    const tahsilatRes = await this.dataSource.query(`
      SELECT method as paymentMethod, SUM(total) as toplam, SUM(adet) as adet
      FROM (
        SELECT 
          CASE 
            WHEN paymentMethod IN ('CASH', 'KASA') THEN 'CASH'
            WHEN paymentMethod IN ('CREDIT_CARD', 'KREDI_KARTI', 'CC') THEN 'CREDIT_CARD'
            WHEN paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN 'CARI'
            ELSE paymentMethod 
          END as method,
          SUM(CAST(totalAmount AS DECIMAL(18,2))) as total,
          COUNT(*) as adet
        FROM sales s
        WHERE s.status = 'COMPLETED' AND paymentMethod != 'SPLIT' ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
        GROUP BY paymentMethod
        UNION ALL
        SELECT 'CASH' as method, SUM(CAST(paidAmountCash AS DECIMAL(18,2))) as total, COUNT(*) as adet
        FROM sales s
        WHERE s.status = 'COMPLETED' AND paymentMethod = 'SPLIT' AND paidAmountCash > 0 ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
        UNION ALL
        SELECT 'CREDIT_CARD' as method, SUM(CAST(paidAmountCreditCard AS DECIMAL(18,2))) as total, COUNT(*) as adet
        FROM sales s
        WHERE s.status = 'COMPLETED' AND paymentMethod = 'SPLIT' AND paidAmountCreditCard > 0 ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      ) AS SplitPayments
      GROUP BY method
    `, params).catch(() => []);

    // 2. Giderler / Ödeme (-)
    const expenseRes = await this.dataSource.query(`
      SELECT SUM(CAST(amount AS DECIMAL(18,2))) as payout
      FROM account_transactions s
      WHERE s.type = 'EXPENSE' ${dateFilterAcc}
    `, paramsAcc).catch(() => [{ payout: 0 }]);
    const payoutTotal = Number(expenseRes[0]?.payout || 0);

    // 3. Cari Tahsilat Kırılımları (Nakit/Kart)
    const cariCollectionsRes = await this.dataSource.query(`
      SELECT 
        s.paymentMethod,
        SUM(CAST(s.amount AS DECIMAL(18,2))) as toplam
      FROM account_transactions s
      WHERE s.type = 'INCOME' AND s.partnerId > 0 ${dateFilterAcc}
      GROUP BY s.paymentMethod
    `, paramsAcc).catch(() => []);

    const cariNakit = Number(cariCollectionsRes.find((c: any) => c.paymentMethod === 'KASA' || c.paymentMethod === 'CASH')?.toplam || 0);
    const cariKredi = Number(cariCollectionsRes.find((c: any) => c.paymentMethod === 'KREDI_KARTI' || c.paymentMethod === 'CREDIT_CARD')?.toplam || 0);

    // 4. Alınan Döviz Analizi
    const dovizRes = await this.dataSource.query(`
      SELECT 
        COALESCE(s.paidCurrency, 'TRY') as currency,
        SUM(CAST(s.paidCurrencyAmount AS DECIMAL(18,2))) as totalAmount
      FROM sales s
      WHERE s.status = 'COMPLETED' AND s.paidCurrencyAmount > 0 ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY s.paidCurrency
    `, params).catch(() => []);

    // 5. İşlem Toplamları (İade, İptal, İkram, Ödenmez vb.)
    const islemDetayRes = await this.dataSource.query(`
      SELECT 
        si.status,
        si.transactionType,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as adet,
        SUM(CAST(si.total AS DECIMAL(18,2))) as toplam,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as retailToplam
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY si.status, si.transactionType
    `, params).catch(() => []);

    // 6. İndirim Toplamları (Satış vs Cari)
    const indirimDetayRes = await this.dataSource.query(`
      SELECT 
        CASE WHEN s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN 'CARI' ELSE 'SATIS' END as tip,
        SUM(CAST(s.discountAmount AS DECIMAL(18,2))) as toplam
      FROM sales s
      WHERE s.status = 'COMPLETED' AND s.discountAmount > 0 ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY CASE WHEN s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN 'CARI' ELSE 'SATIS' END
    `, params).catch(() => []);

    const satisIndirim = Number(indirimDetayRes.find((i: any) => i.tip === 'SATIS')?.toplam || 0);
    const cariIndirim = Number(indirimDetayRes.find((i: any) => i.tip === 'CARI')?.toplam || 0);

    // 7. Açık Hesap Detayı (Cari Hesaplar listesi)
    const acikHesapRes = await this.dataSource.query(`
      SELECT 
        COALESCE(p.name, 'Bilinmeyen Cari') as cariAdi,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as toplam
      FROM sales s
      JOIN partners p ON p.id = s.partnerId
      WHERE s.status = 'COMPLETED' AND s.paymentMethod IN ('CARI', 'PARTNER', 'OPEN') ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY p.name
    `, params).catch(() => []);

    // 8. Kategori Bazlı Ürün Satış Özeti
    const urunKategoriRes = await this.dataSource.query(`
      SELECT 
        COALESCE(pt.name, 'Diğer') as kategori,
        p.name as urunAdi,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as adet,
        SUM(CAST(si.total AS DECIMAL(18,2))) as toplam
      FROM sale_items si
      JOIN products p ON p.id = si.productId
      LEFT JOIN product_types pt ON pt.id = p.productTypeId
      JOIN sales s ON s.id = si.saleId
      WHERE s.status = 'COMPLETED' AND si.status = 'ACTIVE' AND si.transactionType = 'SALE' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY COALESCE(pt.name, 'Diğer'), p.name
      ORDER BY COALESCE(pt.name, 'Diğer'), toplam DESC
    `, params).catch(() => []);

    // 9. Garson Satış ve İndirim Toplamları
    const garsonRes = await this.dataSource.query(`
      SELECT 
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as garsonAdi,
        SUM(CAST(s.discountAmount AS DECIMAL(18,2))) as indirimToplam,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as satisToplam
      FROM sales s
      LEFT JOIN users u ON u.id = s.waiterId
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY satisToplam DESC
    `, params).catch(() => []);

    // 10. Kasiyer / Kasa Tahsilat Toplamları
    const kasiyerRes = await this.dataSource.query(`
      SELECT 
        COALESCE(cr.name, 'Ana Kasa') as kasaAdi,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as toplam
      FROM sales s
      LEFT JOIN cash_registers cr ON cr.id = s.cashRegisterId
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY cr.name
    `, params).catch(() => []);

    // 11. Müşteri / Hizmet Tipi Toplamları
    const musteriRes = await this.dataSource.query(`
      SELECT 
        CASE 
          WHEN s.tableName LIKE 'Paket%' OR s.tableName LIKE 'Servis%' OR s.tableName LIKE 'Delivery%' THEN 'PAKET' 
          ELSE 'MASA' 
        END as tip,
        COUNT(s.id) as adet,
        SUM(CAST(s.totalAmount AS DECIMAL(18,2))) as toplam
      FROM sales s
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY CASE 
        WHEN s.tableName LIKE 'Paket%' OR s.tableName LIKE 'Servis%' OR s.tableName LIKE 'Delivery%' THEN 'PAKET' 
        ELSE 'MASA' 
      END
    `, params).catch(() => []);

    // Genel Toplamlar
    const toplamRes = await this.dataSource.query(`
      SELECT
        SUM(CAST(totalAmount AS DECIMAL(18,2))) as netSatis,
        SUM(CAST(discountAmount AS DECIMAL(18,2))) as toplamIndirim,
        SUM(CAST(serviceFee AS DECIMAL(18,2))) as toplamServis,
        COUNT(*) as adisyonSayisi
      FROM sales s
      WHERE s.status = 'COMPLETED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params).catch(() => [{ netSatis: 0, toplamIndirim: 0, toplamServis: 0, adisyonSayisi: 0 }]);

    const refundRes = await this.dataSource.query(`
      SELECT
        ISNULL(SUM(CAST(si.total AS DECIMAL(18,2))), 0) as toplamIade,
        ISNULL(SUM(CAST(si.quantity AS DECIMAL(18,2))), 0) as iadeAdedi
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE si.status = 'REFUNDED' ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
    `, params).catch(() => [{ toplamIade: 0, iadeAdedi: 0 }]);

    // Kategori x İşlem Tipi Dağılımı
    const catTxRes = await this.dataSource.query(`
      SELECT 
        COALESCE(p.category, 'Diğer') as categoryName,
        si.transactionType,
        si.status,
        SUM(CAST(si.quantity AS DECIMAL(12,2))) as quantity,
        SUM(CAST(si.total AS DECIMAL(12,2))) as total,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(12,2))) as retailTotal
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE 1=1 ${dateFilter}
      ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY p.category, si.transactionType, si.status
    `, params).catch(() => []);

    return {
      tahsilatDetay: tahsilatRes.map((t: any) => ({
        odemeYontemi: t.paymentMethod || 'Diğer',
        toplam: Number(t.toplam || 0),
        adet: Number(t.adet || 0),
      })),
      payoutTotal,
      cariNakit,
      cariKredi,
      dovizAnalizi: dovizRes.map((d: any) => ({
        currency: d.currency,
        totalAmount: Number(d.totalAmount || 0),
      })),
      islemDetaylari: islemDetayRes.map((i: any) => ({
        status: i.status,
        transactionType: i.transactionType,
        adet: Number(i.adet || 0),
        toplam: Number(i.toplam || 0),
        retailToplam: Number(i.retailToplam || 0),
      })),
      satisIndirim,
      cariIndirim,
      acikHesapDetay: acikHesapRes.map((a: any) => ({
        cariAdi: a.cariAdi,
        toplam: Number(a.toplam || 0),
      })),
      urunKategoriSatis: urunKategoriRes.map((u: any) => ({
        kategori: u.kategori,
        urunAdi: u.urunAdi,
        adet: Number(u.adet || 0),
        toplam: Number(u.toplam || 0),
      })),
      garsonlarToplamlar: garsonRes.map((g: any) => ({
        garsonAdi: g.garsonAdi?.trim() || 'Bilinmeyen',
        satisToplam: Number(g.satisToplam || 0),
        indirimToplam: Number(g.indirimToplam || 0),
      })),
      kasiyerTahsilat: kasiyerRes.map((k: any) => ({
        kasaAdi: k.kasaAdi,
        toplam: Number(k.toplam || 0),
      })),
      musteriToplamlari: musteriRes.map((m: any) => ({
        tip: m.tip,
        adet: Number(m.adet || 0),
        toplam: Number(m.toplam || 0),
      })),
      categoryTransactionTotals: catTxRes.map((c: any) => ({
        categoryName: c.categoryName,
        transactionType: c.transactionType,
        status: c.status,
        quantity: Number(c.quantity || 0),
        total: Number(c.total || 0),
        retailTotal: Number(c.retailTotal || 0),
      })),
      genelToplamlar: {
        netSatis: Number(toplamRes[0]?.netSatis || 0),
        toplamIndirim: Number(toplamRes[0]?.toplamIndirim || 0),
        toplamServis: Number(toplamRes[0]?.toplamServis || 0),
        toplamIade: Number(refundRes[0]?.toplamIade || 0),
        iadeAdedi: Number(refundRes[0]?.iadeAdedi || 0),
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
        SUM(CASE WHEN paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
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

    // Fetch manual cari tahsilat/odemeler for this shift
    const manualTahsilatRes = await this.dataSource.query(`
      SELECT 
        paymentMethod,
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(12,2)) ELSE -CAST(amount AS DECIMAL(12,2)) END) as toplam
      FROM account_transactions
      WHERE shiftId = @0
      GROUP BY paymentMethod
    `, [shiftId]).catch(() => []);

    const manualNakit = Number(manualTahsilatRes.find((c: any) => c.paymentMethod === 'KASA' || c.paymentMethod === 'CASH')?.toplam || 0);
    const manualKredi = Number(manualTahsilatRes.find((c: any) => c.paymentMethod === 'KREDI_KARTI' || c.paymentMethod === 'CREDIT_CARD' || c.paymentMethod === 'CC')?.toplam || 0);

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
        nakit: Number(tahsilat.nakit || 0) + Number(tahsilat.bolunmusNakit || 0) + manualNakit,
        krediKarti: Number(tahsilat.krediKarti || 0) + Number(tahsilat.bolunmusKart || 0) + manualKredi,
        cari: Number(tahsilat.cari || 0),
        toplamTahsilat: Number(tahsilat.toplamTahsilat || 0) + manualNakit + manualKredi,
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
        SUM(CASE WHEN paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
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

    // Fetch manual cari tahsilat/odemeler for these shifts combined
    const manualTahsilatRes = await this.dataSource.query(`
      SELECT 
        paymentMethod,
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(12,2)) ELSE -CAST(amount AS DECIMAL(12,2)) END) as toplam
      FROM account_transactions
      WHERE shiftId IN (${shiftIds})
      GROUP BY paymentMethod
    `).catch(() => []);

    const manualNakit = Number(manualTahsilatRes.find((c: any) => c.paymentMethod === 'KASA' || c.paymentMethod === 'CASH')?.toplam || 0);
    const manualKredi = Number(manualTahsilatRes.find((c: any) => c.paymentMethod === 'KREDI_KARTI' || c.paymentMethod === 'CREDIT_CARD' || c.paymentMethod === 'CC')?.toplam || 0);

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
        nakit: Number(tahsilat.nakit || 0) + Number(tahsilat.bolunmusNakit || 0) + manualNakit,
        krediKarti: Number(tahsilat.krediKarti || 0) + Number(tahsilat.bolunmusKart || 0) + manualKredi,
        cari: Number(tahsilat.cari || 0),
        toplamTahsilat: Number(tahsilat.toplamTahsilat || 0) + manualNakit + manualKredi,
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

    // ── Tarih filtresi artık `businessDate` (program tarihi) üzerinden çalışır ──
    // Bu sayede gece yarısı geçişlerinde satışlar gerçek saat yerine
    // iş günü tarihine göre doğru şekilde raporlanır.
    const dateStr = filters.date;
    if (dateStr) {
      params.push(dateStr, dateStr);
      dateFilter += ` AND s.businessDate >= @${pIdx++} AND s.businessDate <= @${pIdx++}`;
    } else {
      if (filters.startDate) {
        params.push(filters.startDate);
        dateFilter += ` AND s.businessDate >= @${pIdx++}`;
      }
      if (filters.endDate) {
        params.push(filters.endDate);
        dateFilter += ` AND s.businessDate <= @${pIdx++}`;
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

  // ─── İKRAM VE ÖDENMEZ DETAY RAPORU ──────────────────────────────────────────

  async getComplimentaryNonPayableReport(filters: { startDate?: string; endDate?: string; companyId?: number }) {
    const { dateFilter, params } = this.buildDateFilter({ startDate: filters.startDate, endDate: filters.endDate });

    const itemsRes = await this.dataSource.query(`
      SELECT 
        si.id as id,
        COALESCE(NULLIF(s.tableName, ''), t.name, ps.tableName, 'Paket/Hızlı Satış') as tableName,
        s.id as saleId,
        COALESCE(si.addedAt, s.createdAt) as transactionDate,
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        p.name as productName,
        CAST(si.quantity AS DECIMAL(18,2)) as quantity,
        COALESCE(si.productTypeName, 'Diğer') as productTypeName,
        si.transactionType as transactionType,
        si.transactionReason as transactionReason,
        CAST(si.unitPrice AS DECIMAL(18,2)) as unitPrice,
        CAST(si.total AS DECIMAL(18,2)) as total,
        CAST(COALESCE(p.price, 0) AS DECIMAL(18,2)) as retailPrice
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN tables t ON t.id = s.tableId
      LEFT JOIN sales ps ON ps.id = s.parentSaleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(si.addedByUserId, s.waiterId)
      WHERE si.transactionType != 'SALE' 
        AND si.status = 'ACTIVE'
        AND s.status = 'COMPLETED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      ORDER BY transactionDate DESC
    `, params).catch(() => []);

    const categorySummary = await this.dataSource.query(`
      SELECT 
        COALESCE(si.productTypeName, 'Diğer') as categoryName,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE si.transactionType != 'SALE' 
        AND si.status = 'ACTIVE'
        AND s.status = 'COMPLETED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY COALESCE(si.productTypeName, 'Diğer')
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    const typeSummary = await this.dataSource.query(`
      SELECT 
        si.transactionType as transactionType,
        COUNT(DISTINCT s.id) as saleCount,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE si.transactionType != 'SALE' 
        AND si.status = 'ACTIVE'
        AND s.status = 'COMPLETED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY si.transactionType
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    const staffSummary = await this.dataSource.query(`
      SELECT 
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        COUNT(si.id) as itemTransactionCount,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(si.addedByUserId, s.waiterId)
      WHERE si.transactionType != 'SALE' 
        AND si.status = 'ACTIVE'
        AND s.status = 'COMPLETED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    return {
      items: itemsRes.map((item: any) => ({
        id: item.id,
        tableName: item.tableName,
        saleId: item.saleId,
        transactionDate: item.transactionDate,
        staffName: item.staffName,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        productTypeName: item.productTypeName,
        transactionType: item.transactionType,
        transactionReason: item.transactionReason,
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        retailPrice: Number(item.retailPrice || 0),
        retailTotal: Number(item.retailPrice || 0) * Number(item.quantity || 0)
      })),
      categorySummary: categorySummary.map((c: any) => ({
        categoryName: c.categoryName,
        totalQuantity: Number(c.totalQuantity || 0),
        totalValue: Number(c.totalValue || 0)
      })),
      typeSummary: typeSummary.map((t: any) => ({
        transactionType: t.transactionType,
        saleCount: Number(t.saleCount || 0),
        totalQuantity: Number(t.totalQuantity || 0),
        totalValue: Number(t.totalValue || 0)
      })),
      staffSummary: staffSummary.map((s: any) => ({
        staffName: s.staffName,
        itemTransactionCount: Number(s.itemTransactionCount || 0),
        totalQuantity: Number(s.totalQuantity || 0),
        totalValue: Number(s.totalValue || 0)
      }))
    };
  }

  // ─── İADE DETAY RAPORU ──────────────────────────────────────────

  async getRefundsReport(filters: { startDate?: string; endDate?: string; companyId?: number }) {
    const { dateFilter, params } = this.buildDateFilter({ startDate: filters.startDate, endDate: filters.endDate });

    const itemsRes = await this.dataSource.query(`
      SELECT 
        si.id as id,
        COALESCE(NULLIF(s.tableName, ''), t.name, ps.tableName, 'Paket/Hızlı Satış') as tableName,
        s.id as saleId,
        COALESCE(si.addedAt, s.createdAt) as transactionDate,
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        p.name as productName,
        CAST(si.quantity AS DECIMAL(18,2)) as quantity,
        COALESCE(si.productTypeName, 'Diğer') as productTypeName,
        si.status as status,
        si.refundReason as refundReason,
        CAST(si.unitPrice AS DECIMAL(18,2)) as unitPrice,
        CAST(si.total AS DECIMAL(18,2)) as total,
        CAST(COALESCE(p.price, 0) AS DECIMAL(18,2)) as retailPrice
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN tables t ON t.id = s.tableId
      LEFT JOIN sales ps ON ps.id = s.parentSaleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(si.refundedByUserId, s.waiterId)
      WHERE si.status = 'REFUNDED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      ORDER BY transactionDate DESC
    `, params).catch(() => []);

    const categorySummary = await this.dataSource.query(`
      SELECT 
        COALESCE(si.productTypeName, 'Diğer') as categoryName,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE si.status = 'REFUNDED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY COALESCE(si.productTypeName, 'Diğer')
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    const staffSummary = await this.dataSource.query(`
      SELECT 
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        COUNT(si.id) as itemTransactionCount,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(si.refundedByUserId, s.waiterId)
      WHERE si.status = 'REFUNDED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    return {
      items: itemsRes.map((item: any) => ({
        id: item.id,
        tableName: item.tableName,
        saleId: item.saleId,
        transactionDate: item.transactionDate,
        staffName: item.staffName,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        productTypeName: item.productTypeName,
        status: item.status,
        refundReason: item.refundReason,
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        retailPrice: Number(item.retailPrice || 0),
        retailTotal: Number(item.retailPrice || 0) * Number(item.quantity || 0)
      })),
      categorySummary: categorySummary.map((c: any) => ({
        categoryName: c.categoryName,
        totalQuantity: Number(c.totalQuantity || 0),
        totalValue: Number(c.totalValue || 0)
      })),
      staffSummary: staffSummary.map((s: any) => ({
        staffName: s.staffName,
        itemTransactionCount: Number(s.itemTransactionCount || 0),
        totalQuantity: Number(s.totalQuantity || 0),
        totalValue: Number(s.totalValue || 0)
      }))
    };
  }

  async getCancelledReport(filters: { startDate?: string; endDate?: string; companyId?: number }) {
    const { dateFilter, params } = this.buildDateFilter({ startDate: filters.startDate, endDate: filters.endDate });

    const itemsRes = await this.dataSource.query(`
      SELECT 
        si.id as id,
        COALESCE(NULLIF(s.tableName, ''), t.name, ps.tableName, 'Paket/Hızlı Satış') as tableName,
        s.id as saleId,
        COALESCE(si.addedAt, s.createdAt) as transactionDate,
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        p.name as productName,
        CAST(si.quantity AS DECIMAL(18,2)) as quantity,
        COALESCE(si.productTypeName, 'Diğer') as productTypeName,
        si.status as status,
        si.cancelReason as cancelReason,
        CAST(si.unitPrice AS DECIMAL(18,2)) as unitPrice,
        CAST(si.total AS DECIMAL(18,2)) as total,
        CAST(COALESCE(p.price, 0) AS DECIMAL(18,2)) as retailPrice
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN tables t ON t.id = s.tableId
      LEFT JOIN sales ps ON ps.id = s.parentSaleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(si.cancelledByUserId, s.waiterId)
      WHERE si.status = 'CANCELLED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      ORDER BY transactionDate DESC
    `, params).catch(() => []);

    const categorySummary = await this.dataSource.query(`
      SELECT 
        COALESCE(si.productTypeName, 'Diğer') as categoryName,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE si.status = 'CANCELLED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY COALESCE(si.productTypeName, 'Diğer')
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    const staffSummary = await this.dataSource.query(`
      SELECT 
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        COUNT(si.id) as itemTransactionCount,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(COALESCE(p.price, 0) * si.quantity AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(si.cancelledByUserId, s.waiterId)
      WHERE si.status = 'CANCELLED'
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    return {
      items: itemsRes.map((item: any) => ({
        id: item.id,
        tableName: item.tableName,
        saleId: item.saleId,
        transactionDate: item.transactionDate,
        staffName: item.staffName,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        productTypeName: item.productTypeName,
        status: item.status,
        cancelReason: item.cancelReason,
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        retailPrice: Number(item.retailPrice || 0),
        retailTotal: Number(item.retailPrice || 0) * Number(item.quantity || 0)
      })),
      categorySummary: categorySummary.map((c: any) => ({
        categoryName: c.categoryName,
        totalQuantity: Number(c.totalQuantity || 0),
        totalValue: Number(c.totalValue || 0)
      })),
      staffSummary: staffSummary.map((s: any) => ({
        staffName: s.staffName,
        itemTransactionCount: Number(s.itemTransactionCount || 0),
        totalQuantity: Number(s.totalQuantity || 0),
        totalValue: Number(s.totalValue || 0)
      }))
    };
  }

  async getDiscountsReport(filters: { startDate?: string; endDate?: string; companyId?: number }) {
    const { dateFilter, params } = this.buildDateFilter({ startDate: filters.startDate, endDate: filters.endDate });

    const itemsRes = await this.dataSource.query(`
      SELECT 
        si.id as id,
        COALESCE(NULLIF(s.tableName, ''), t.name, ps.tableName, 'Paket/Hızlı Satış') as tableName,
        s.id as saleId,
        COALESCE(si.addedAt, s.createdAt) as transactionDate,
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        p.name as productName,
        CAST(si.quantity AS DECIMAL(18,2)) as quantity,
        COALESCE(si.productTypeName, 'Diğer') as productTypeName,
        si.status as status,
        CAST(si.unitPrice AS DECIMAL(18,2)) as unitPrice,
        CAST(si.total AS DECIMAL(18,2)) as total,
        CAST(si.discountAmount AS DECIMAL(18,2)) as discountAmount,
        CAST(si.discountRate AS DECIMAL(5,2)) as discountRate,
        CAST(s.discountAmount AS DECIMAL(18,2)) as saleDiscountAmount,
        CAST(s.discountRate AS DECIMAL(5,2)) as saleDiscountRate,
        CAST(s.totalAmount AS DECIMAL(18,2)) as saleTotalAmount
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN tables t ON t.id = s.tableId
      LEFT JOIN sales ps ON ps.id = s.parentSaleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(s.waiterId, si.addedByUserId)
      WHERE si.status NOT IN ('CANCELLED', 'REFUNDED')
        AND s.status = 'COMPLETED'
        AND (si.discountAmount > 0 OR s.discountAmount > 0)
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      ORDER BY transactionDate DESC
    `, params).catch(() => []);

    const categorySummary = await this.dataSource.query(`
      SELECT 
        COALESCE(si.productTypeName, 'Diğer') as categoryName,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(si.discountAmount AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE si.status NOT IN ('CANCELLED', 'REFUNDED')
        AND s.status = 'COMPLETED'
        AND (si.discountAmount > 0 OR s.discountAmount > 0)
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY COALESCE(si.productTypeName, 'Diğer')
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    const staffSummary = await this.dataSource.query(`
      SELECT 
        COALESCE(u.firstName + ' ' + u.lastName, 'Sistem') as staffName,
        COUNT(si.id) as itemTransactionCount,
        SUM(CAST(si.quantity AS DECIMAL(18,2))) as totalQuantity,
        SUM(CAST(si.discountAmount AS DECIMAL(18,2))) as totalValue
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      LEFT JOIN users u ON u.id = COALESCE(s.waiterId, si.addedByUserId)
      WHERE si.status NOT IN ('CANCELLED', 'REFUNDED')
        AND s.status = 'COMPLETED'
        AND (si.discountAmount > 0 OR s.discountAmount > 0)
        ${dateFilter}
        ${filters.companyId ? ` AND (s.companyId = ${filters.companyId} OR s.companyId IS NULL)` : ''}
      GROUP BY u.firstName, u.lastName
      ORDER BY totalQuantity DESC
    `, params).catch(() => []);

    return {
      items: itemsRes.map((item: any) => ({
        id: item.id,
        tableName: item.tableName,
        saleId: item.saleId,
        transactionDate: item.transactionDate,
        staffName: item.staffName,
        productName: item.productName,
        quantity: Number(item.quantity || 0),
        productTypeName: item.productTypeName,
        status: item.status,
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0),
        discountAmount: Number(item.discountAmount || 0),
        discountRate: Number(item.discountRate || 0),
        saleDiscountAmount: Number(item.saleDiscountAmount || 0),
        saleDiscountRate: Number(item.saleDiscountRate || 0),
        saleTotalAmount: Number(item.saleTotalAmount || 0)
      })),
      categorySummary: categorySummary.map((c: any) => ({
        categoryName: c.categoryName,
        totalQuantity: Number(c.totalQuantity || 0),
        totalValue: Number(c.totalValue || 0)
      })),
      staffSummary: staffSummary.map((s: any) => ({
        staffName: s.staffName,
        itemTransactionCount: Number(s.itemTransactionCount || 0),
        totalQuantity: Number(s.totalQuantity || 0),
        totalValue: Number(s.totalValue || 0)
      }))
    };
  }
}

