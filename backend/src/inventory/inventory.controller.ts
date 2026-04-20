import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireFeature } from '../auth/feature.decorator';
import { FeatureGuard } from '../auth/feature.guard';

@Controller('inventory-sessions')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('recipe_system')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  findAllSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.findAllSessions(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      status,
      warehouseId ? parseInt(warehouseId) : undefined,
    );
  }

  @Get('reports/difference')
  getDifferenceReport(
    @Query('warehouseId') warehouseId?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getDifferenceReport(
      warehouseId ? parseInt(warehouseId) : undefined,
      category,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  getSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSession(id);
  }

  @Get(':id/report')
  getSessionReport(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSessionReport(id);
  }

  @Get(':id/print')
  getPrintList(
    @Param('id', ParseIntPipe) id: number,
    @Query('blind') blind?: string,
  ) {
    return this.service.getPrintList(id, blind === 'true');
  }

  @Post()
  createSession(@Body() body: any) {
    return this.service.createSession(body);
  }

  @Patch('lines/:lineId')
  updateLine(
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() body: any,
  ) {
    return this.service.updateLine(lineId, body);
  }

  @Post(':id/bulk-update')
  bulkUpdateLines(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { updates: any[] },
  ) {
    return this.service.bulkUpdateLines(id, body.updates);
  }

  @Post(':id/save-draft')
  saveDraft(@Param('id', ParseIntPipe) id: number) {
    return this.service.saveDraft(id);
  }

  @Post(':id/approve')
  approveSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { userId?: number },
  ) {
    return this.service.approveSession(id, body?.userId);
  }

  @Post(':id/cancel')
  cancelSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelSession(id);
  }

  @Post(':id/reopen')
  reopenSession(@Param('id', ParseIntPipe) id: number) {
    return this.service.reopenSession(id);
  }
}
