import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { BusinessDayService } from './business-day.service';

export interface LogActionDto {
  companyId?: number;
  cashRegisterId?: number;
  shiftId?: number;
  userId?: number;
  userRole?: string;
  actionType: string;
  saleId?: number;
  serviceArea?: string;
  tableNo?: string;
  productName?: string;
  oldValue?: string;
  newValue?: string;
  amount?: number;
  description?: string;
  approvedByUserId?: number;
  deviceInfo?: string;
  businessDate?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly businessDayService: BusinessDayService,
  ) {}

  async logAction(dto: LogActionDto): Promise<void> {
    try {
      const bDate = dto.businessDate || await this.businessDayService.getActiveBusinessDate();
      const log = this.auditRepo.create({
        ...dto,
        companyId: dto.companyId || 1,
        timestamp: new Date(),
        businessDate: bDate,
      });
      await this.auditRepo.save(log);
    } catch (err) {
      console.error('[AuditLog] Failed to write audit log:', err);
    }
  }

  async getAuditLogs(filters: {
    companyId?: number;
    startDate?: string;
    endDate?: string;
    userId?: number;
    cashRegisterId?: number;
    shiftId?: number;
    actionType?: string;
    saleId?: number;
    tableNo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);

    const qb = this.auditRepo.createQueryBuilder('al')
      .orderBy('al.timestamp', 'DESC');

    if (filters.companyId) qb.andWhere('al.companyId = :companyId', { companyId: filters.companyId });
    if (filters.userId) qb.andWhere('al.userId = :userId', { userId: filters.userId });
    if (filters.cashRegisterId) qb.andWhere('al.cashRegisterId = :cashRegisterId', { cashRegisterId: filters.cashRegisterId });
    if (filters.shiftId) qb.andWhere('al.shiftId = :shiftId', { shiftId: filters.shiftId });
    if (filters.actionType) qb.andWhere('al.actionType = :actionType', { actionType: filters.actionType });
    if (filters.saleId) qb.andWhere('al.saleId = :saleId', { saleId: filters.saleId });
    if (filters.tableNo) qb.andWhere('al.tableNo LIKE :tableNo', { tableNo: `%${filters.tableNo}%` });

    if (filters.startDate) {
      qb.andWhere('al.timestamp >= :startDate', { startDate: `${filters.startDate} 00:00:00` });
    }
    if (filters.endDate) {
      qb.andWhere('al.timestamp <= :endDate', { endDate: `${filters.endDate} 23:59:59.999` });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}
