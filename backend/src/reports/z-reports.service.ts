import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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

  /**
   * Generates and saves a Z-Report for a specific cash register and business date
   */
  async generateZReport(
    cashRegisterId: number,
    businessDate: string,
    userId: number,
    companyId: number = 1
  ): Promise<ZReport> {
    // 1. Validate cash register
    const register = await this.cashRegisterRepo.findOne({ where: { id: cashRegisterId, companyId } });
    if (!register) throw new NotFoundException('Kasa bulunamadı.');

    // 2. Check if Z-Report already exists
    const existing = await this.zReportRepo.findOne({
      where: { cashRegisterId, businessDate, companyId }
    });
    if (existing) {
      throw new BadRequestException('Bu iş günü için zaten Z Raporu alınmış.');
    }

    // 3. Fetch all shifts for the given business day and cash register
    const shifts = await this.shiftRepo.find({
      where: { cashRegisterId, businessDate, companyId }
    });

    if (shifts.length === 0) {
      throw new BadRequestException('Bu iş gününde kasada işlem (vardiya) bulunamadı.');
    }

    // 4. Check if there are any open shifts
    const hasOpenShift = shifts.some(s => s.status === 'OPEN');
    if (hasOpenShift) {
      throw new BadRequestException('Z Raporu alabilmek için kasadaki tüm vardiyaların kapatılmış olması gerekmektedir.');
    }

    // 5. Aggregate shift data
    let totalOpeningCash = 0;
    let totalClosingCash = 0;
    let totalExpectedCash = 0;
    let totalCashDifference = 0;

    const shiftIds = shifts.map(s => s.id);

    for (const shift of shifts) {
      totalOpeningCash += Number(shift.openingCash || 0);
      totalClosingCash += Number(shift.closingCash || 0);
      totalExpectedCash += Number(shift.expectedCash || 0);
      totalCashDifference += Number(shift.cashDifference || 0);
    }

    // Calculate total income (sales) from the sales table for these shifts
    // This provides a breakdown of sales regardless of payment method
    let totalIncome = 0;
    try {
      if (shiftIds.length > 0) {
        const salesRes = await this.dataSource.query(`
          SELECT SUM(CAST(totalAmount AS DECIMAL(18,2))) as total
          FROM sales
          WHERE shiftId IN (${shiftIds.join(',')})
        `);
        totalIncome = Number(salesRes[0]?.total || 0);
      }
    } catch (e) {
      console.error('Failed to calculate Z-Report totalIncome:', e);
    }

    // 6. Save Z-Report
    const zReport = this.zReportRepo.create({
      cashRegisterId,
      businessDate,
      totalOpeningCash,
      totalClosingCash,
      totalExpectedCash,
      totalCashDifference,
      totalIncome,
      generatedByUserId: userId,
      companyId
    });

    return this.zReportRepo.save(zReport);
  }

  /**
   * Retrieves a Z-Report by ID or CashRegister/BusinessDate
   */
  async getZReport(cashRegisterId: number, businessDate: string, companyId: number = 1): Promise<ZReport> {
    const report = await this.zReportRepo.findOne({
      where: { cashRegisterId, businessDate, companyId }
    });
    
    if (!report) throw new NotFoundException('Z Raporu bulunamadı.');
    return report;
  }
}
