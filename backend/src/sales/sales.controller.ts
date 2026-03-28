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
  Request,
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
  getKitchenOrders(@Query('status') status?: string) {
    return this.salesService.getKitchenOrders(status);
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

  @Get('transfer/logs')
  getTransferLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sourceTableId') sourceTableId?: string,
    @Query('targetTableId') targetTableId?: string,
    @Query('transferType') transferType?: string,
  ) {
    return this.salesService.getTransferLogs({
      startDate,
      endDate,
      sourceTableId: sourceTableId ? parseInt(sourceTableId) : undefined,
      targetTableId: targetTableId ? parseInt(targetTableId) : undefined,
      transferType,
    });
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
  payBatchItems(@Body() payload: { itemIds: number[], paymentMethod: string, partnerId?: number, paidAmountCash?: number, paidAmountCreditCard?: number }) {
    return this.salesService.payBatchItems(payload);
  }

  @Put('items/:id/pay')
  payItem(@Param('id') id: string, @Body() payload: { paymentMethod: string, partnerId?: number }) {
    return this.salesService.payItem(+id, payload.paymentMethod, payload.partnerId);
  }

  @Post('items/:id/mars')
  marsItem(@Param('id') id: string) {
    return this.salesService.marsItem(+id);
  }

  @Put('items/:id/ready')
  readyItem(@Param('id') id: string) {
    return this.salesService.readyItem(+id);
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

  @Post('items/:id/cancel')
  cancelItem(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.cancelItem(+id, reason || '', userId);
  }

  @Post('items/:id/refund')
  refundItem(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.refundItem(+id, reason || '', userId);
  }

  @Post(':id/refund')
  refundSale(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.refundSale(+id, reason || '', userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.salesService.updateStatus(+id, 'CANCELLED');
  }

  // --- Alt Adisyon (Sub-Check) Endpoints ---

  @Get('table/:tableId/sub-checks')
  getTableSubChecks(@Param('tableId') tableId: string) {
    return this.salesService.getTableSubChecks(+tableId);
  }

  @Post(':id/sub-check')
  createSubCheck(@Param('id') id: string, @Body('label') label?: string) {
    return this.salesService.createSubCheck(+id, label);
  }

  @Post(':id/split')
  splitCheck(
    @Param('id') id: string,
    @Body() body: { itemIds: number[]; quantities?: Record<number, number>; newLabel?: string },
  ) {
    return this.salesService.splitCheck(+id, body.itemIds, body.quantities, body.newLabel);
  }

  @Put('items/move')
  moveItems(
    @Body() body: { sourceId: number; targetId: number; itemIds: number[]; quantities?: Record<number, number> },
  ) {
    return this.salesService.moveItems(body.sourceId, body.targetId, body.itemIds, body.quantities);
  }

  @Put(':id/merge')
  mergeSubChecks(@Param('id') id: string) {
    return this.salesService.mergeSubChecks(+id);
  }

  @Post(':id/items')
  appendItems(@Param('id') id: string, @Body('items') items: any[]) {
    return this.salesService.appendItems(+id, items);
  }

  // --- Transfer Endpointleri ---

  @Post('transfer/items-to-table')
  transferItemsToTable(
    @Body() body: {
      sourceSubCheckId: number;
      targetTableId: number;
      itemIds: number[];
      quantities?: Record<number, number>;
      confirmed?: boolean;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.transferItemsToTable(body, userId);
  }

  @Post('transfer/items-within-table')
  transferItemsWithinTable(
    @Body() body: {
      sourceSubCheckId: number;
      targetSubCheckId: number | 'NEW';
      itemIds: number[];
      quantities?: Record<number, number>;
      newLabel?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.transferItemsWithinTable(body, userId);
  }

  @Post('transfer/subcheck-to-table')
  transferSubCheckToTable(
    @Body() body: {
      subCheckId: number;
      targetTableId: number;
      confirmed?: boolean;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.transferSubCheckToTable(body, userId);
  }

  @Post('transfer/table')
  transferTable(
    @Body() body: {
      sourceTableId: number;
      targetTableId: number;
      confirmed?: boolean;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.transferTable(body, userId);
  }

}
