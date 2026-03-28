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
        SUM(CASE WHEN paymentMethod = 'CARI' THEN CAST(totalAmount AS DECIMAL(12,2)) ELSE 0 END) as cari,
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
      cashCollection: Number(t.nakit || 0) + Number(t.splitNakit || 0),
      creditCardCollection: Number(t.krediKarti || 0) + Number(t.splitKart || 0),
      cariCollection: Number(t.cari || 0),
      mealCardCollection: 0,
      onlinePaymentCollection: 0,
      giftCardCollection: 0,
      otherCollection: 0,
      totalCollection,

      // -- Operasyon --
      totalReceipts: Number(t.adisyonSayisi || 0),
      totalCustomers: 0,
      totalProductCount: Number(urunRes[0]?.toplamUrun || 0),

      // -- Düzeltme --
      discountTotal: Number(t.toplamIndirim || 0),
      complimentaryTotal: 0,
      refundTotal: Number(t.toplamIade || 0),
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

      // Legacy
      totalOpeningCash,
      totalClosingCash,
      totalExpectedCash,
      totalCashDifference,
      totalIncome: netSales,
      totalExpense: 0,
    });

    return this.zReportRepo.save(zReport);
  }

  async getZReport(cashRegisterId: number, businessDate: string, companyId: number = 1): Promise<ZReport> {
    const report = await this.zReportRepo.findOne({ where: { cashRegisterId, businessDate, companyId } });
    if (!report) throw new NotFoundException('Z Raporu bulunamadı.');
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
    return qb.take(100).getMany();
  }
}
