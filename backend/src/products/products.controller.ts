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
  @Permissions('VIEW_PRODUCTS', 'VIEW_INVOICES', 'VIEW_SALES')
  async findAll() {
    return this.productsService.findAll();
  }

  @Get('quicksale')
  async findAllQuickSale() {
    return this.productsService.findAllQuickSale();
  }
  
  @Get('transactions')
  @Permissions('VIEW_SALES')
  async findAllTransactions() {
    return this.productsService.findAllTransactions();
  }

  @Get(':id')
  @Permissions('VIEW_PRODUCTS', 'VIEW_INVOICES', 'VIEW_SALES')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Post()
  @Permissions('ADD_PRODUCTS')
  create(@Body() productData: Partial<Product>) {
    return this.productsService.create(productData);
  }

  @Put('reorder')
  @Permissions('EDIT_PRODUCTS', 'VIEW_PRODUCTS', 'VIEW_SALES')
  reorder(@Body() reorderData: { items: { id: number, orderIndex: number }[] }) {
    return this.productsService.reorderProducts(reorderData.items);
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
