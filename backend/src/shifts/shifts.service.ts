import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Shift } from './shift.entity';
import { User } from '../users/user.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { ParametersService } from '../parameters/parameters.service';
import { ZReport } from '../reports/z-report.entity';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepo: Repository<CashRegister>,
    @InjectRepository(ZReport)
    private readonly zReportRepo: Repository<ZReport>,
    private readonly parametersService: ParametersService,
  ) {}

  /** Open a new shift for the given user on the given cash register */
  async openShift(
    userId: number,
    cashRegisterId: number,
    openingCash: number,
    companyId: number,
  ): Promise<Shift> {
    // 1. Fetch user and verify authorization
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role'] });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Verify authorization: User must be assigned to this register, OR be an Admin/Super Admin
    if (user.cashRegisterId !== cashRegisterId && user.role?.name !== 'Süper Admin' && user.role?.name !== 'Admin') {
      throw new ForbiddenException(
        'Bu kasada işlem yapma yetkiniz bulunmamaktadır.',
      );
    }

    // 2. Check if this register already has an open shift
    const existingRegisterShift = await this.shiftRepo.findOne({
      where: { cashRegisterId, status: 'OPEN', companyId },
    });
    if (existingRegisterShift) {
      throw new BadRequestException(
        'Bu kasada zaten açık bir vardiya bulunmaktadır. Önce mevcut vardiyayı kapatmanız gerekmektedir.',
      );
    }

    // 3. Check if this user already has an open shift on any register
    const existingUserShift = await this.shiftRepo.findOne({
      where: { userId, status: 'OPEN', companyId },
    });
    if (existingUserShift) {
      throw new BadRequestException(
        'Zaten başka bir kasada açık vardıyanız bulunmaktadır. Önce mevcut vardiyanızı kapatmanız gerekmektedir.',
      );
    }

    // 4. Calculate business date based on parameters
    const businessDate = await this.getCurrentBusinessDate();
    const now = new Date(); // Re-add now for openedAt

    // 5. Check if Z-Report is already generated for this businessDate and register
    const existingZReport = await this.zReportRepo.findOne({
      where: { cashRegisterId, businessDate, companyId },
    });
    if (existingZReport) {
      throw new BadRequestException(
        'Bu iş günü için gün sonu (Z-Raporu) alınmıştır. Yeni vardiya açılamaz.',
      );
    }

    // 6. Create the shift
    const shift = this.shiftRepo.create({
      userId,
      cashRegisterId,
      businessDate,
      openingCash,
      status: 'OPEN',
      companyId,
      openedAt: now,
    });

    return this.shiftRepo.save(shift);
  }

  /** Close a specific shift */
  async closeShift(
    shiftId: number,
    closingCash: number,
    note?: string,
  ): Promise<Shift> {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Vardiya bulunamadı.');
    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Bu vardiya zaten kapatılmış.');
    }

    // Calculate expected cash (opening + cash sales during shift)
    const expectedCash = await this.calculateExpectedCash(shift);

    shift.closedAt = new Date();
    shift.status = 'CLOSED';
    shift.closingCash = closingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = Number((closingCash - expectedCash).toFixed(2));
    if (note) shift.note = note;

    return this.shiftRepo.save(shift);
  }

  /** Transfer a shift to another user (Faz 2 — basic stub) */
  async transferShift(
    shiftId: number,
    toUserId: number,
    closingCash: number,
    note?: string,
  ): Promise<{ closedShift: Shift; newShift: Shift }> {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Vardiya bulunamadı.');
    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Bu vardiya zaten kapatılmış.');
    }

    // Verify target user is authorized for this register
    const targetUser = await this.userRepo.findOne({ where: { id: toUserId }, relations: ['role'] });
    if (!targetUser) throw new NotFoundException('Hedef kullanıcı bulunamadı.');
    if (targetUser.cashRegisterId !== shift.cashRegisterId && targetUser.role?.name !== 'Süper Admin' && targetUser.role?.name !== 'Admin') {
      throw new ForbiddenException(
        'Hedef kullanıcı bu kasada yetkili değildir.',
      );
    }

    // Close current shift as TRANSFERRED
    const expectedCash = await this.calculateExpectedCash(shift);
    shift.closedAt = new Date();
    shift.status = 'TRANSFERRED';
    shift.closingCash = closingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = Number((closingCash - expectedCash).toFixed(2));
    shift.transferredToUserId = toUserId;
    if (note) shift.note = note;
    const closedShift = await this.shiftRepo.save(shift);

    // Open new shift for the target user with the closing cash as opening
    const newShift = await this.openShift(
      toUserId,
      shift.cashRegisterId,
      closingCash,
      shift.companyId,
    );

    return { closedShift, newShift };
  }

  /**
   * Calculates the current business date based on parameters
   */
  async getCurrentBusinessDate(): Promise<string> {
    const now = new Date();
    let businessDateStr = now.toISOString().split('T')[0];
    
    try {
      // Default to 04:00 AM if not set
      const startHourStr = await this.parametersService.getValue('pos', 'business_day_start_hour') || '04:00';
      const [startHour, startMinute] = startHourStr.split(':').map(Number);
      
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // If current time is strictly before the business day start time, it belongs to the previous business day
      if (currentHour < startHour || (currentHour === startHour && currentMinute < startMinute)) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        businessDateStr = yesterday.toISOString().split('T')[0];
      }
    } catch (err) {
      console.error('Error calculating business date, falling back to current date:', err);
    }
    return businessDateStr;
  }

  /** Get the active (OPEN) shift for a user */
  async getActiveShift(userId: number): Promise<Shift | null> {
    return this.shiftRepo.findOne({
      where: { userId, status: 'OPEN' },
      relations: ['cashRegister', 'user'],
    });
  }

  /** Get the active (OPEN) shift for a specific cash register */
  async getActiveShiftByRegister(
    cashRegisterId: number,
  ): Promise<Shift | null> {
    return this.shiftRepo.findOne({
      where: { cashRegisterId, status: 'OPEN' },
      relations: ['cashRegister', 'user'],
    });
  }

  /** Get shift history with optional filters */
  async getShiftHistory(filters: {
    cashRegisterId?: number;
    userId?: number;
    startDate?: string;
    endDate?: string;
    companyId?: number;
  }): Promise<Shift[]> {
    const qb = this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.user', 'user')
      .leftJoinAndSelect('shift.cashRegister', 'cashRegister')
      .orderBy('shift.openedAt', 'DESC');

    if (filters.cashRegisterId) {
      qb.andWhere('shift.cashRegisterId = :cashRegisterId', {
        cashRegisterId: filters.cashRegisterId,
      });
    }
    if (filters.userId) {
      qb.andWhere('shift.userId = :userId', { userId: filters.userId });
    }
    if (filters.startDate) {
      qb.andWhere('shift.businessDate >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('shift.businessDate <= :endDate', {
        endDate: filters.endDate,
      });
    }
    if (filters.companyId) {
      qb.andWhere('shift.companyId = :companyId', {
        companyId: filters.companyId,
      });
    }

    return qb.take(100).getMany();
  }

  /** Calculate the expected cash in the register for a given shift */
  private async calculateExpectedCash(shift: Shift): Promise<number> {
    // Opening cash + cash payments during shift - cash refunds
    // Uses raw query to sum paidAmountCash from sales linked to this shift
    const result = await this.shiftRepo.manager.query(
      `SELECT 
        ISNULL(SUM(CAST(paidAmountCash AS DECIMAL(12,2))), 0) as totalCashIn
       FROM sales 
       WHERE shiftId = @0 AND status = 'COMPLETED'`,
      [shift.id],
    );

    const totalCashIn = Number(result[0]?.totalCashIn || 0);
    return Number((shift.openingCash + totalCashIn).toFixed(2));
  }
}
