import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProductTypesService } from './product-types.service';
import { ProductType } from './product-type.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('product-types')
@UseGuards(JwtAuthGuard)
export class ProductTypesController {
  constructor(private readonly service: ProductTypesService) {}

  @Get()
  findAll(): Promise<ProductType[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ProductType> {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() data: Partial<ProductType>): Promise<ProductType> {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<ProductType>): Promise<ProductType> {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(+id);
  }
}
