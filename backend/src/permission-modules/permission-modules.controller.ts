import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionModulesService } from './permission-modules.service';
import { PermModule } from './permission-module.entity';

@Controller('permission-modules')
@UseGuards(JwtAuthGuard)
export class PermissionModulesController {
  constructor(private readonly service: PermissionModulesService) {}

  @Get()
  findAll(): Promise<PermModule[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PermModule> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Partial<PermModule>): Promise<PermModule> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<PermModule>,
  ): Promise<PermModule> {
    return this.service.update(id, dto);
  }

  @Delete('reset-defaults')
  @HttpCode(HttpStatus.OK)
  resetToDefaults(): Promise<void> {
    return this.service.resetToDefaults();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
