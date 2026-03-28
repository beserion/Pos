import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { Table } from './table.entity';
import { Sale } from '../sales/sale.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Table, Sale])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
