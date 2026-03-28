import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './sale.entity';
import { SaleItem } from './sale-item.entity';
import { TransferLog } from './transfer-log.entity';
import { SecurityModule } from '../auth/security.module';
import { RecipesModule } from '../recipes/recipes.module';
import { StocksModule } from '../stocks/stocks.module';
import { FinanceModule } from '../finance/finance.module';
import { PartnersModule } from '../partners/partners.module';
import { PrintersModule } from '../printers/printers.module';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { KitchenGateway } from '../orders/kitchen.gateway';
import { AlertsModule } from '../alerts/alerts.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, Table, User, TransferLog]),
    SecurityModule,
    RecipesModule,
    StocksModule,
    FinanceModule,
    PartnersModule,
    PrintersModule,
    AlertsModule,
    StockMovementsModule,
  ],
  providers: [SalesService, KitchenGateway],
  controllers: [SalesController],
  exports: [SalesService],
})
export class SalesModule { }
