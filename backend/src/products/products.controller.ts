import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Get()
  @Permissions('VIEW_PRODUCTS')
  async findAll() {
    return this.productsService.findAll();
  }

  @Get('quicksale')
  @Permissions('VIEW_PRODUCTS')
  async findAllQuickSale() {
    return this.productsService.findAllQuickSale();
  }

  @Get(':id')
  @Permissions('VIEW_PRODUCTS')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Post()
  @Permissions('ADD_PRODUCTS')
  create(@Body() productData: Partial<Product>) {
    return this.productsService.create(productData);
  }

  @Put(':id')
  @Permissions('EDIT_PRODUCTS')
  update(@Param('id') id: string, @Body() updateData: Partial<Product>) {
    return this.productsService.update(+id, updateData);
  }

  @Delete(':id')
  @Permissions('DELETE_PRODUCTS')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
