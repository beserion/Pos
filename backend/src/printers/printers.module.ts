import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { Printer } from './printer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Printer])],
  providers: [PrintersService],
  controllers: [PrintersController],
  exports: [PrintersService],
})
export class PrintersModule {}
