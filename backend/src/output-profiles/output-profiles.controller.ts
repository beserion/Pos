import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OutputProfilesService } from './output-profiles.service';
import { OutputProfile } from './output-profile.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('output-profiles')
@UseGuards(JwtAuthGuard)
export class OutputProfilesController {
  constructor(private readonly service: OutputProfilesService) {}

  @Get()
  findAll(): Promise<OutputProfile[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<OutputProfile> {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() data: Partial<OutputProfile>): Promise<OutputProfile> {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<OutputProfile>): Promise<OutputProfile> {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(+id);
  }
}
