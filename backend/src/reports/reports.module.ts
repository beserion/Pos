import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ZReportsService } from './z-reports.service';
import { ZReport } from './z-report.entity';
import { Shift } from '../shifts/shift.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZReport, Shift, CashRegister])],
  controllers: [ReportsController],
  providers: [ReportsService, ZReportsService],
  exports: [ZReportsService],
})
export class ReportsModule {}
