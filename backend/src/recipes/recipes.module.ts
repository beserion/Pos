import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { ProductsModule } from '../products/products.module';
import { SecurityModule } from '../auth/security.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe]), ProductsModule, SecurityModule],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
