import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { Stock } from './stock.entity';
import { Product } from '../products/product.entity';
import { SecurityModule } from '../auth/security.module';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Product]), SecurityModule],
  providers: [StocksService],
  controllers: [StocksController],
  exports: [StocksService],
})
export class StocksModule {}
