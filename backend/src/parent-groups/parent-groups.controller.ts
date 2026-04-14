import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ParentGroupsService } from './parent-groups.service';
import { ParentGroup } from './parent-group.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('parent-groups')
@UseGuards(JwtAuthGuard)
export class ParentGroupsController {
  constructor(private readonly service: ParentGroupsService) {}

  @Get()
  findAll(): Promise<ParentGroup[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ParentGroup> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any): Promise<ParentGroup> {
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ): Promise<ParentGroup> {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
