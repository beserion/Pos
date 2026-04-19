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
import { SetMenu } from './set-menu.entity';
import { SetGroup } from './set-group.entity';
import { SetGroupItem } from './set-group-item.entity';

import { ProductsPublicController } from './products-public.controller';
import { SetMenusController } from './set-menus.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product, Recipe, Modifier, RecipeHeader,
      ProductVariation, VariationGroup, ProductTransaction,
      SetMenu, SetGroup, SetGroupItem
    ]),
    SecurityModule,
    ParametersModule,
  ],
  providers: [ProductsService],
  controllers: [ProductsController, ProductsPublicController, SetMenusController],
  exports: [ProductsService],
})
export class ProductsModule { }
