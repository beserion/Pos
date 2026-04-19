import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegister } from '../cash-registers/cash-register.entity';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { Printer } from './printer.entity';
import { OrderRoutingModule } from '../order-routing/order-routing.module';

@Module({
  imports: [TypeOrmModule.forFeature([Printer, CashRegister]), OrderRoutingModule],
  providers: [PrintersService],
  controllers: [PrintersController],
  exports: [PrintersService],
})
export class PrintersModule {}
