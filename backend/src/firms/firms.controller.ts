import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { FirmsService } from './firms.service';
import { Firm } from './firm.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('firms')
export class FirmsController {
  constructor(private readonly firmsService: FirmsService) {}

  @Get()
  findAll(): Promise<Firm[]> {
    return this.firmsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Firm> {
    return this.firmsService.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<Firm>): Promise<Firm> {
    return this.firmsService.create(data);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<Firm>): Promise<Firm> {
    return this.firmsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.firmsService.remove(id);
  }
}
