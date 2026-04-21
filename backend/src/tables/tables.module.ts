import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { Table } from './table.entity';
import { Sale } from '../sales/sale.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, Sale]),
    forwardRef(() => UsersModule),
  ],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
