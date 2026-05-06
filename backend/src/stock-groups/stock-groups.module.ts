import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockGroup } from './stock-group.entity';
import { StockCard } from '../stock-cards/stock-card.entity';
import { StockGroupsService } from './stock-groups.service';
import { StockGroupsController } from './stock-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockGroup, StockCard])],
  providers: [StockGroupsService],
  controllers: [StockGroupsController],
  exports: [StockGroupsService],
})
export class StockGroupsModule {}
