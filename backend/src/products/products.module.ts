import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SecurityModule } from '../auth/security.module';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';
import { RecipeHeader } from '../recipes/recipe-header.entity';
import { RecipeLine } from '../recipes/recipe-line.entity';
import { Modifier } from '../modifiers/modifier.entity';

import { ProductTransaction } from './product-transaction.entity';

import { ProductsPublicController } from './products-public.controller';

import { ProductType } from '../product-types/product-type.entity';
import { Department } from '../departments/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Recipe, RecipeHeader, RecipeLine, Modifier, ProductTransaction, ProductType, Department]), SecurityModule],
  providers: [ProductsService],
  controllers: [ProductsController, ProductsPublicController],
  exports: [ProductsService],
})
export class ProductsModule { }
