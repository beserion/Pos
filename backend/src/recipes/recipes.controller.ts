import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Recipe } from './recipe.entity';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @Permissions('VIEW_RECIPES')
  findAll() {
    return this.recipesService.findAll();
  }

  @Get('product/:productId')
  @Permissions('VIEW_RECIPES')
  findByProduct(@Param('productId') productId: string) {
    return this.recipesService.findByProduct(+productId);
  }

  @Get('product/:productId/cost')
  @Permissions('VIEW_RECIPES')
  calculateCost(@Param('productId') productId: string) {
    return this.recipesService.calculateCost(+productId);
  }

  @Get('product/:productId/summary')
  @Permissions('VIEW_RECIPES')
  getRecipeSummary(@Param('productId') productId: string) {
    return this.recipesService.getRecipeSummary(+productId);
  }

  @Get(':id')
  @Permissions('VIEW_RECIPES')
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(+id);
  }

  @Post()
  @Permissions('ADD_RECIPES')
  create(@Body() recipeData: Partial<Recipe>) {
    return this.recipesService.create(recipeData);
  }

  @Put(':id')
  @Permissions('EDIT_RECIPES')
  update(@Param('id') id: string, @Body() updateData: Partial<Recipe>) {
    return this.recipesService.update(+id, updateData);
  }

  @Delete(':id')
  @Permissions('DELETE_RECIPES')
  remove(@Param('id') id: string) {
    return this.recipesService.remove(+id);
  }
}
