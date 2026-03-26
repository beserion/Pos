import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMovement } from './stock-movement.entity';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementsController } from './stock-movements.controller';
import { StockCardsModule } from '../stock-cards/stock-cards.module';
import { RecipesModule } from '../recipes/recipes.module';
import { ParametersModule } from '../parameters/parameters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockMovement]),
    StockCardsModule,
    forwardRef(() => RecipesModule),
    ParametersModule,
  ],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
