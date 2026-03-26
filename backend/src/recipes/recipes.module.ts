import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipeHeader } from './recipe-header.entity';
import { RecipeLine } from './recipe-line.entity';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { ProductsModule } from '../products/products.module';
import { SecurityModule } from '../auth/security.module';
import { StockCardsModule } from '../stock-cards/stock-cards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeHeader, RecipeLine]),
    ProductsModule,
    SecurityModule,
    StockCardsModule,
  ],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
