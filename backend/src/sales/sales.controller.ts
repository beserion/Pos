import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { Sale } from './sale.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  // --- Kitchen Display Endpoints ---
  @Get('kitchen')
  getKitchenOrders() {
    return this.salesService.getKitchenOrders();
  }

  @Get('kitchen/counts')
  getKitchenCounts() {
    return this.salesService.getKitchenCounts();
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('tableId') tableId?: string,
    @Query('userId') userId?: string,
    @Query('waiterId') waiterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
      tableId ? parseInt(tableId) : undefined,
      userId ? parseInt(userId) : (waiterId ? parseInt(waiterId) : undefined),
      startDate,
      endDate,
    );
  }

  @Post('end-of-day')
  endOfDay(@Body('userId') userId?: number) {
    return this.salesService.endOfDay(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }

  @Post()
  create(@Body() saleData: Partial<Sale>) {
    return this.salesService.create(saleData);
  }

  @Put('items/pay-batch')
  payBatchItems(@Body() payload: { itemIds: number[], paymentMethod: string, partnerId?: number }) {
    return this.salesService.payBatchItems(payload.itemIds, payload.paymentMethod, payload.partnerId);
  }

  @Put('items/:id/pay')
  payItem(@Param('id') id: string, @Body() payload: { paymentMethod: string, partnerId?: number }) {
    return this.salesService.payItem(+id, payload.paymentMethod, payload.partnerId);
  }

  // Status update: supports both POST (legacy) and PUT (new)
  @Post(':id/status')
  updateStatusPost(@Param('id') id: string, @Body('status') status: string) {
    return this.salesService.updateStatus(+id, status);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.salesService.updateStatus(+id, status);
  }

  @Post('table/:tableId/cancel')
  cancelTableOrders(@Param('tableId') tableId: string) {
    return (this.salesService as any).cancelTableOrders(+tableId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesService.remove(+id);
  }
}

