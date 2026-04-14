import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SecurityModule } from '../auth/security.module';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';
import { Modifier } from '../modifiers/modifier.entity';
import { RecipeHeader } from '../recipes/recipe-header.entity';
import { ProductVariation } from './product-variation.entity';
import { VariationGroup } from './variation-group.entity';
import { ParametersModule } from '../parameters/parameters.module';

import { ProductTransaction } from './product-transaction.entity';

import { ProductsPublicController } from './products-public.controller';

@Module({
<<<<<<< HEAD
  imports: [
    TypeOrmModule.forFeature([
      Product, Recipe, Modifier, RecipeHeader,
      ProductVariation, VariationGroup,
    ]),
    SecurityModule,
    ParametersModule,
  ],
=======
  imports: [TypeOrmModule.forFeature([Product, Recipe, Modifier, ProductTransaction]), SecurityModule],
>>>>>>> upstream/server
  providers: [ProductsService],
  controllers: [ProductsController, ProductsPublicController],
  exports: [ProductsService],
})
export class ProductsModule { }
