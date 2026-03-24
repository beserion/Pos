import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ZReportsService } from './z-reports.service';
import { AuditLogService } from './audit-log.service';
import { ZReport } from './z-report.entity';
import { AuditLog } from './audit-log.entity';
import { Shift } from '../shifts/shift.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZReport, AuditLog, Shift, CashRegister])],
  controllers: [ReportsController],
  providers: [ReportsService, ZReportsService, AuditLogService],
  exports: [ZReportsService, AuditLogService],
})
export class ReportsModule {}
