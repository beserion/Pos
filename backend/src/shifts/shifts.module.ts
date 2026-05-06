import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { Shift } from './shift.entity';
import { User } from '../users/user.entity';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { ParametersModule } from '../parameters/parameters.module';
import { ZReport } from '../reports/z-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, User, CashRegister, ZReport]), ParametersModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
