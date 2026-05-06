import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { Printer } from './printer.entity';
import { OrderRoutingModule } from '../order-routing/order-routing.module';
import { ParametersModule } from '../parameters/parameters.module';
import { OutputProfile } from '../output-profiles/output-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Printer, CashRegister, OutputProfile]), OrderRoutingModule, ParametersModule],
  providers: [PrintersService],
  controllers: [PrintersController],
  exports: [PrintersService],
})
export class PrintersModule {}
