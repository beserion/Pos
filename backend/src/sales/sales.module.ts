import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './sale.entity';
import { SaleItem } from './sale-item.entity';
import { TransferLog } from './transfer-log.entity';
import { ProductTransaction } from './product-transaction.entity';
import { SecurityModule } from '../auth/security.module';
import { RecipesModule } from '../recipes/recipes.module';
import { StocksModule } from '../stocks/stocks.module';
import { FinanceModule } from '../finance/finance.module';
import { PartnersModule } from '../partners/partners.module';
import { PrintersModule } from '../printers/printers.module';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { OrdersModule } from '../orders/orders.module';
import { AlertsModule } from '../alerts/alerts.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { ProductTransactionsService } from './product-transactions.service';
import { ProductTransactionsController } from './product-transactions.controller';
import { Product } from '../products/product.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem, Table, User, TransferLog, ProductTransaction, Product]),
    SecurityModule,
    RecipesModule,
    StocksModule,
    FinanceModule,
    PartnersModule,
    PrintersModule,
    AlertsModule,
    StockMovementsModule,
    ProductsModule,
    OrdersModule,
  ],
  providers: [SalesService, ProductTransactionsService],
  controllers: [SalesController, ProductTransactionsController],
  exports: [SalesService, ProductTransactionsService],
})
export class SalesModule { }
