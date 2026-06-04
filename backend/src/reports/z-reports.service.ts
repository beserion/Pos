import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ZReport } from './z-report.entity';
import { Shift } from '../shifts/shift.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';

@Injectable()
export class ZReportsService {
  constructor(
    @InjectRepository(ZReport)
    private readonly zReportRepo: Repository<ZReport>,
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepo: Repository<CashRegister>,
    private readonly dataSource: DataSource,
  ) {}

  async generateZReport(
    cashRegisterId: number,
    businessDate: string,
    userId: number,
    companyId: number = 1,
  ): Promise<ZReport> {
    const register = await this.cashRegisterRepo.findOne({ where: { id: cashRegisterId, companyId } });
    if (!register) throw new NotFoundException('Kasa bulunamadı.');

    const existing = await this.zReportRepo.findOne({ where: { cashRegisterId, businessDate, companyId } });
    if (existing) throw new BadRequestException('Bu iş günü için zaten Z Raporu alınmış.');

    const shifts = await this.shiftRepo.find({ where: { cashRegisterId, businessDate, companyId } });
    if (shifts.length === 0) throw new BadRequestException('Bu iş gününde kasada işlem (vardiya) bulunamadı.');

    const hasOpenShift = shifts.some(s => s.status === 'OPEN');
    if (hasOpenShift) throw new BadRequestException('Z Raporu alabilmek için kasadaki tüm vardiyaların kapatılmış olması gerekmektedir.');

    const shiftIds = shifts.map(s => s.id);
    const shiftIdList = shiftIds.join(',');

    // Tahsilat kırılımları
    const tahsilatRes = await this.dataSource.query(`
      SELECT
        SUM(CASE WHEN paymentMethod IN ('KASA','CASH') THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as nakit,
        SUM(CASE WHEN paymentMethod IN ('KREDI_KARTI','CREDIT_CARD','CC') THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as krediKarti,
        SUM(CASE WHEN paymentMethod IN ('CARI', 'PARTNER', 'OPEN') THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
        SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCash AS DECIMAL(12,2)) ELSE 0 END) as splitNakit,
        SUM(CASE WHEN paymentMethod = 'SPLIT' THEN CAST(paidAmountCreditCard AS DECIMAL(12,2)) ELSE 0 END) as splitKart,
        SUM(CAST(totalAmount AS DECIMAL(12,2))) as toplamTahsilat,
        COUNT(*) as adisyonSayisi,
        SUM(CAST(discountAmount AS DECIMAL(12,2))) as toplamIndirim,
        ISNULL(SUM(CAST(serviceFee AS DECIMAL(12,2))), 0) as toplamServis,
        ISNULL(SUM(CAST(refundAmount AS DECIMAL(12,2))), 0) as toplamIade
      FROM sales
      WHERE shiftId IN (${shiftIdList}) AND status = 'COMPLETED'
    `);

    // Fetch manual cari tahsilat/odemeler for these shifts
    const manualTahsilatRes = await this.dataSource.query(`
      SELECT 
        paymentMethod,
        SUM(CASE WHEN type = 'INCOME' THEN CAST(amount AS DECIMAL(12,2)) ELSE -CAST(amount AS DECIMAL(12,2)) END) as toplam
      FROM account_transactions
      WHERE shiftId IN (${shiftIdList})
      GROUP BY paymentMethod
    `).catch(() => []);

    const manualNakit = Number(manualTahsilatRes.find((c: any) => c.paymentMethod === 'KASA' || c.paymentMethod === 'CASH')?.toplam || 0);
    const manualKredi = Number(manualTahsilatRes.find((c: any) => c.paymentMethod === 'KREDI_KARTI' || c.paymentMethod === 'CREDIT_CARD' || c.paymentMethod === 'CC')?.toplam || 0);

    const t = tahsilatRes[0] || {};

    // İptal adetleri
    const iptalRes = await this.dataSource.query(`
      SELECT COUNT(*) as iptalAdedi, ISNULL(SUM(CAST(totalAmount AS DECIMAL(12,2))), 0) as iptalToplam
      FROM sales WHERE shiftId IN (${shiftIdList}) AND status = 'CANCELLED'
    `);
    const iptal = iptalRes[0] || {};

    // Ürün adetleri
    const urunRes = await this.dataSource.query(`
      SELECT COUNT(*) as toplamUrun
      FROM sale_items si JOIN sales s ON s.id = si.saleId
      WHERE s.shiftId IN (${shiftIdList}) AND s.status = 'COMPLETED' AND si.status = 'ACTIVE'
    `);

    // Kategori bazlı toplamlar (düzeltilmiş JOIN ile)
    const catRes = await this.dataSource.query(`
      SELECT COALESCE(p.category, 'Diğer') as name, SUM(CAST(si.total AS DECIMAL(12,2))) as total
      FROM sale_items si 
      JOIN sales s ON s.id = si.saleId
      LEFT JOIN products p ON p.id = si.productId
      WHERE s.shiftId IN (${shiftIdList}) AND s.status = 'COMPLETED' AND si.status = 'ACTIVE'
      GROUP BY p.category
    `).catch(() => []);

    // İade toplam ve adet sorgusu
    const iadeSorguRes = await this.dataSource.query(`
      SELECT 
        ISNULL(SUM(CAST(si.total AS DECIMAL(12,2))), 0) as refundTotal,
        ISNULL(SUM(CAST(si.quantity AS DECIMAL(12,2))), 0) as refundCount
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      WHERE s.shiftId IN (${shiftIdList}) AND si.status = 'REFUNDED'
    `).catch(() => [{ refundTotal: 0, refundCount: 0 }]);
    const iadeData = iadeSorguRes[0] || { refundTotal: 0, refundCount: 0 };

    // Kategori x İşlem Tipi bazlı dağılım sorgusu
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
      WHERE s.shiftId IN (${shiftIdList})
      GROUP BY p.category, si.transactionType, si.status
    `).catch(() => []);

    // Garson bazlı toplamlar
    const waiterRes = await this.dataSource.query(`
      SELECT s.waiterId, u.firstName + ' ' + u.lastName as waiterName, SUM(CAST(s.totalAmount AS DECIMAL(12,2))) as total
      FROM sales s LEFT JOIN users u ON u.id = s.waiterId
      WHERE s.shiftId IN (${shiftIdList}) AND s.status = 'COMPLETED'
      GROUP BY s.waiterId, u.firstName, u.lastName
    `);

    // Net satış
    const netSales = Number(t.toplamTahsilat || 0);
    const totalCollection = netSales;

    // Shift özeti
    let totalOpeningCash = 0, totalClosingCash = 0, totalExpectedCash = 0, totalCashDifference = 0;
    for (const shift of shifts) {
      totalOpeningCash += Number(shift.openingCash || 0);
      totalClosingCash += Number(shift.closingCash || 0);
      totalExpectedCash += Number(shift.expectedCash || 0);
      totalCashDifference += Number(shift.cashDifference || 0);
    }

    // Z numarası (bu kasa için kaçıncı Z raporu)
    const zCount = await this.zReportRepo.count({ where: { cashRegisterId, companyId } });

    const zReport = this.zReportRepo.create({
      cashRegisterId,
      businessDate,
      companyId,
      generatedByUserId: userId,
      zNumber: zCount + 1,
      openedAt: shifts.reduce((min, s) => !min || s.openedAt < min ? s.openedAt : min, null as any),
      closedAt: shifts.reduce((max, s) => !max || (s.closedAt && s.closedAt > max) ? s.closedAt : max, null as any),

      // -- Satış Özeti --
      netSales,

      // -- Tahsilat Toplamları --
      cashCollection: Number(t.nakit || 0) + Number(t.splitNakit || 0) + manualNakit,
      creditCardCollection: Number(t.krediKarti || 0) + Number(t.splitKart || 0) + manualKredi,
      cariCollection: Number(t.cari || 0),
      mealCardCollection: 0,
      onlinePaymentCollection: 0,
      giftCardCollection: 0,
      otherCollection: 0,
      totalCollection: totalCollection + manualNakit + manualKredi,

      // -- Operasyon --
      totalReceipts: Number(t.adisyonSayisi || 0),
      totalCustomers: 0,
      totalProductCount: Number(urunRes[0]?.toplamUrun || 0),

      // -- Düzeltme --
      discountTotal: Number(t.toplamIndirim || 0),
      complimentaryTotal: 0,
      refundTotal: Number(iadeData.refundTotal || 0),
      refundCount: Number(iadeData.refundCount || 0),
      cancelTotal: Number(iptal.iptalToplam || 0),
      serviceFeeTotal: Number(t.toplamServis || 0),

      // -- Vergi (basit %10 hesap) --
      taxBase: Math.round(netSales / 1.1 * 100) / 100,
      taxTotal: Math.round((netSales - netSales / 1.1) * 100) / 100,
      taxBreakdown: JSON.stringify([{ oran: 10, matrah: Math.round(netSales / 1.1 * 100) / 100, kdv: Math.round((netSales - netSales / 1.1) * 100) / 100 }]),

      // -- Açık Hesap --
      openAccountPrevious: 0,
      openAccountNew: 0,
      openAccountClosed: 0,
      openAccountRemaining: 0,

      // -- Kapanış --
      expectedTotal: totalExpectedCash,
      confirmedTotal: totalClosingCash,

      categoryTotals: JSON.stringify(catRes),
      categoryTransactionTotals: JSON.stringify(catTxRes),
      waiterSales: JSON.stringify(waiterRes),
      paymentTotals: JSON.stringify([
        { method: 'CASH', total: Number(t.nakit || 0) + Number(t.splitNakit || 0) },
        { method: 'CREDIT_CARD', total: Number(t.krediKarti || 0) + Number(t.splitKart || 0) },
        { method: 'CARI', total: Number(t.cari || 0) }
      ]),

      // Legacy
      totalOpeningCash,
      totalClosingCash,
      totalExpectedCash,
      totalCashDifference,
      totalIncome: netSales + manualNakit + manualKredi,
      totalExpense: 0,
    });

    const saved = await this.zReportRepo.save(zReport);
    try {
      if (saved.taxBreakdown) (saved as any).taxBreakdown = JSON.parse(saved.taxBreakdown);
      if (saved.categoryTotals) (saved as any).categoryTotals = JSON.parse(saved.categoryTotals);
      if (saved.categoryTransactionTotals) (saved as any).categoryTransactionTotals = JSON.parse(saved.categoryTransactionTotals);
      if (saved.waiterSales) (saved as any).waiterSales = JSON.parse(saved.waiterSales);
      if (saved.paymentTotals) (saved as any).paymentTotals = JSON.parse(saved.paymentTotals);
    } catch (e) {}
    return saved;
  }
  async getZReport(cashRegisterId: number, businessDate: string, companyId: number = 1): Promise<ZReport> {
    const report = await this.zReportRepo.findOne({ where: { cashRegisterId, businessDate, companyId } });
    if (!report) throw new NotFoundException('Z Raporu bulunamadı.');
    try {
      if (report.taxBreakdown) (report as any).taxBreakdown = JSON.parse(report.taxBreakdown);
      if (report.categoryTotals) (report as any).categoryTotals = JSON.parse(report.categoryTotals);
      if (report.categoryTransactionTotals) (report as any).categoryTransactionTotals = JSON.parse(report.categoryTransactionTotals);
      if (report.waiterSales) (report as any).waiterSales = JSON.parse(report.waiterSales);
      if (report.paymentTotals) (report as any).paymentTotals = JSON.parse(report.paymentTotals);
    } catch (e) {}
    return report;
  }

  async listZReports(filters: {
    cashRegisterId?: number;
    startDate?: string;
    endDate?: string;
    companyId?: number;
  }): Promise<ZReport[]> {
    const qb = this.zReportRepo.createQueryBuilder('zr').orderBy('zr.businessDate', 'DESC');
    if (filters.companyId) qb.andWhere('zr.companyId = :cid', { cid: filters.companyId });
    if (filters.cashRegisterId) qb.andWhere('zr.cashRegisterId = :crid', { crid: filters.cashRegisterId });
    if (filters.startDate) qb.andWhere('zr.businessDate >= :sd', { sd: filters.startDate });
    if (filters.endDate) qb.andWhere('zr.businessDate <= :ed', { ed: filters.endDate });
    const list = await qb.take(100).getMany();
    return list.map(report => {
      try {
        if (report.taxBreakdown) (report as any).taxBreakdown = JSON.parse(report.taxBreakdown);
        if (report.categoryTotals) (report as any).categoryTotals = JSON.parse(report.categoryTotals);
        if (report.categoryTransactionTotals) (report as any).categoryTransactionTotals = JSON.parse(report.categoryTransactionTotals);
        if (report.waiterSales) (report as any).waiterSales = JSON.parse(report.waiterSales);
        if (report.paymentTotals) (report as any).paymentTotals = JSON.parse(report.paymentTotals);
      } catch (e) {}
      return report;
    });
  }
}
