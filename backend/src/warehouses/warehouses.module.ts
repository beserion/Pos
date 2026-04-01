import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './warehouse.entity';
import { StockCard } from '../stock-cards/stock-card.entity';
import { StockMovement } from '../stock-movements/stock-movement.entity';
import { InventorySession } from '../inventory/inventory-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      StockCard,
      StockMovement,
      InventorySession,
    ]),
  ],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}

