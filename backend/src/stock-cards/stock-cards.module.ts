import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockCard } from './stock-card.entity';
import { UnitConversion } from './unit-conversion.entity';
import { StockCardsService } from './stock-cards.service';
import { StockCardsController } from './stock-cards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockCard, UnitConversion])],
  controllers: [StockCardsController],
  providers: [StockCardsService],
  exports: [StockCardsService],
})
export class StockCardsModule {}
