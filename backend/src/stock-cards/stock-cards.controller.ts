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
import { StockCardsService } from './stock-cards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stock-cards')
@UseGuards(JwtAuthGuard)
export class StockCardsController {
  constructor(private readonly service: StockCardsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.findAll(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      search,
      category,
      warehouseId ? parseInt(warehouseId) : undefined,
    );
  }

  @Get('all')
  findAllNoPagination() {
    return this.service.findAllNoPagination();
  }

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('conversions')
  findConversions(@Query('stockCardId') stockCardId?: string) {
    return this.service.findConversions(
      stockCardId ? parseInt(stockCardId) : undefined,
    );
  }

  @Post('conversions')
  createConversion(@Body() body: any) {
    return this.service.createConversion(body);
  }

  @Put('conversions/:id')
  updateConversion(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateConversion(id, body);
  }

  @Delete('conversions/:id')
  removeConversion(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeConversion(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
