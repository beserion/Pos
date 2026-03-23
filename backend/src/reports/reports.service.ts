import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(private dataSource: DataSource) {}

  async getDashboardData() {
    // 1. Get KPI values using SQL SUM for efficiency
    const kpiRes = await this.dataSource.query(`
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'EXPENSE' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as totalExpense,
        SUM(CASE WHEN paymentMethod = 'KASA' THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as kasa,
        SUM(CASE WHEN paymentMethod = 'BANKA' THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as banka,
        SUM(CASE WHEN paymentMethod = 'KREDI_KARTI' THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as kart,
        SUM(CASE WHEN paymentMethod NOT IN ('KASA', 'BANKA', 'KREDI_KARTI') THEN (CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE -CAST(amount AS DECIMAL(18,2)) END) ELSE 0 END) as diger
      FROM account_transactions
    `);

    const { totalIncome = 0, totalExpense = 0, kasa = 0, banka = 0, kart = 0, diger = 0 } = kpiRes[0] || {};

    // 2. Trend Calculation (Last 7 days vs previous 7 days)
    const currentWeekRes = await this.dataSource.query(`
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as expense
      FROM account_transactions
      WHERE createdAt >= DATEADD(day, -7, GETDATE())
    `);

    const prevWeekRes = await this.dataSource.query(`
      SELECT 
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN CAST(amount AS DECIMAL(18,2)) ELSE 0 END) as expense
      FROM account_transactions
      WHERE createdAt >= DATEADD(day, -14, GETDATE()) AND createdAt < DATEADD(day, -7, GETDATE())
    `);

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
    
    // Profit trend (very rough estimate based on income-expense for those weeks)
    const profitTrend = calculateTrend(currentWeekSales - currentWeekExp, prevWeekSales - prevWeekExp);

    // 3. Weekly Sales (Last 7 Days)
    const weeklySalesRaw = await this.dataSource.query(`
      SELECT 
        FORMAT(createdAt, 'yyyy-MM-dd') as date,
        SUM(amount) as total
      FROM account_transactions
      WHERE type = 'INCOME' 
        AND createdAt >= DATEADD(day, -7, GETDATE())
      GROUP BY FORMAT(createdAt, 'yyyy-MM-dd')
      ORDER BY date ASC
    `);

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

    const salesData = { labels, data };

    // 4. Top Products
    let topProductsRaw = [];
    try {
      topProductsRaw = await this.dataSource.query(`
        SELECT TOP 10 p.name, SUM(CAST(si.quantity AS DECIMAL(18,2))) as count
        FROM sale_items si
        JOIN products p ON p.id = si.productId
        GROUP BY p.name
        ORDER BY count DESC
      `);
    } catch (e) {
      console.error('Error fetching real top products from DB:', e);
      topProductsRaw = [];
    }

    const topProductsData = {
      labels: topProductsRaw.map((p: any) => p.name || 'Bilinmeyen Ürün'),
      data: topProductsRaw.map((p: any) => Number(p.count || 0)),
    };

    // 5. Asset Breakdown
    const balanceData = {
      labels: ['Kasa (Nakit)', 'Banka (POS)', 'Kart'],
      data: [Number(kasa), Number(banka), Number(kart)],
    };

    // COGS Trend
    const currentWeekCogsRes = await this.dataSource.query(`
      SELECT SUM(CAST(si.quantity AS DECIMAL(18,2)) * CAST(si.costPrice AS DECIMAL(18,2))) as totalCost 
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE s.createdAt >= DATEADD(day, -7, GETDATE())
    `);
    const prevWeekCogsRes = await this.dataSource.query(`
      SELECT SUM(CAST(si.quantity AS DECIMAL(18,2)) * CAST(si.costPrice AS DECIMAL(18,2))) as totalCost 
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE s.createdAt >= DATEADD(day, -14, GETDATE()) AND s.createdAt < DATEADD(day, -7, GETDATE())
    `);
    const currentWeekCogs = Number(currentWeekCogsRes[0]?.totalCost || 0);
    const prevWeekCogs = Number(prevWeekCogsRes[0]?.totalCost || 0);
    const cogsTrend = calculateTrend(currentWeekCogs, prevWeekCogs);

    // Total COGS for overall Net Profit
    const totalCogsRes = await this.dataSource.query(`
      SELECT SUM(CAST(quantity AS DECIMAL(18,2)) * CAST(costPrice AS DECIMAL(18,2))) as totalCost 
      FROM sale_items
    `);
    const cogs = Number(totalCogsRes[0]?.totalCost || 0);

    const netProfit = Number(totalIncome) - Number(cogs) - Number(totalExpense);

    return {
      totalIncome: Number(totalIncome),
      totalExpense: Number(totalExpense),
      cogs: Number(cogs),
      netProfit: Number(netProfit),
      kasa: Number(kasa),
      banka: Number(banka),
      kart: Number(kart),
      diger: Number(diger),
      incomeTrend,
      expenseTrend,
      profitTrend,
      cogsTrend,
      salesData,
      balanceData,
      topProductsData,
    };
  }
}
