import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventorySession } from './inventory-session.entity';
import { InventorySessionLine } from './inventory-session-line.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { StockCardsModule } from '../stock-cards/stock-cards.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventorySession, InventorySessionLine]),
    StockCardsModule,
    StockMovementsModule,
    StocksModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
