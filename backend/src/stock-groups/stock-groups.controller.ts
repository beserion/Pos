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
import { StockGroupsService } from './stock-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StockGroup } from './stock-group.entity';

@Controller('stock-groups')
@UseGuards(JwtAuthGuard)
export class StockGroupsController {
  constructor(private readonly service: StockGroupsService) {}

  @Get()
  findAll(): Promise<StockGroup[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StockGroup> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any): Promise<StockGroup> {
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ): Promise<StockGroup> {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
