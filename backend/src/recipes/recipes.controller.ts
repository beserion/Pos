import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  findAll() {
    return this.recipesService.findAll();
  }

  @Get('legacy')
  findAllLegacy() {
    return this.recipesService.findAllLegacy();
  }

  @Get('by-product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.recipesService.findByProduct(productId);
  }

  @Get('cost/:productId')
  calculateCost(@Param('productId', ParseIntPipe) productId: number) {
    return this.recipesService.calculateCost(productId);
  }

  @Get('summary/:productId')
  getRecipeSummary(@Param('productId', ParseIntPipe) productId: number) {
    return this.recipesService.getRecipeSummary(productId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recipesService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.recipesService.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.recipesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recipesService.remove(id);
  }
}
