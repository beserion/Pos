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
import { ZonesService } from './zones.service';
import { Zone } from './zone.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  findAll() {
    return this.zonesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(+id);
  }

  @Post()
  create(@Body() zoneData: Partial<Zone>) {
    return this.zonesService.create(zoneData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Zone>) {
    return this.zonesService.update(+id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(+id);
  }
}
