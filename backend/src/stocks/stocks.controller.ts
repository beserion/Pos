import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StocksService } from './stocks.service';
import { Stock } from './stock.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('low-stock')
  getLowStock() {
    return this.stocksService.checkLowStock();
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('location') location?: string,
  ) {
    return this.stocksService.findAll(page, limit, search, location);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stocksService.findOne(+id);
  }

  @Post()
  create(@Body() stockData: Partial<Stock>) {
    return this.stocksService.create(stockData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Stock>) {
    return this.stocksService.update(+id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stocksService.remove(+id);
  }
}
