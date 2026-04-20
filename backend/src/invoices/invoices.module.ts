import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { StocksModule } from '../stocks/stocks.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { StockCardsModule } from '../stock-cards/stock-cards.module';

import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem]),
    StocksModule,
    StockMovementsModule,
    StockCardsModule,
    FinanceModule,
  ],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
