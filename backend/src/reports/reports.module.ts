import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ZReportsService } from './z-reports.service';
import { AuditLogService } from './audit-log.service';
import { BusinessDayService } from './business-day.service';
import { BusinessDayController } from './business-day.controller';
import { ZReport } from './z-report.entity';
import { AuditLog } from './audit-log.entity';
import { BusinessDayLog } from './business-day-log.entity';
import { ClosedDayRecord } from './closed-day-record.entity';
import { Shift } from '../shifts/shift.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { Table } from '../tables/table.entity';
import { ParametersModule } from '../parameters/parameters.module';

import { Sale } from '../sales/sale.entity';
import { FinanceModule } from '../finance/finance.module';
import { PrintersModule } from '../printers/printers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZReport, AuditLog, BusinessDayLog, ClosedDayRecord, Shift, CashRegister, Table, Sale]),
    ParametersModule,
    FinanceModule,
    PrintersModule,
  ],
  controllers: [ReportsController, BusinessDayController],
  providers: [ReportsService, ZReportsService, AuditLogService, BusinessDayService],
  exports: [ZReportsService, AuditLogService, BusinessDayService],
})
export class ReportsModule {}
