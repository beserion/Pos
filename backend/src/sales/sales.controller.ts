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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { Sale } from './sale.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  async create(@Body() saleData: Partial<Sale>, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    try {
      return await this.salesService.create(saleData, userId);
    } catch (err: any) {
      const msg: string = err?.message || 'Satış oluşturulamadı.';
      throw new HttpException(
        { message: msg, errorDetails: msg },
        msg.startsWith('Yazarkasa') ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('items/pay-batch')
  async payBatchItems(@Body() payload: { 
    itemIds: number[]; 
    paymentMethod: string; 
    partnerId?: number; 
    paidAmountCash?: number; 
    paidAmountCreditCard?: number;
    paidCurrency?: string;
    paidCurrencyRate?: number;
    paidCurrencyAmount?: number;
  }) {
    try {
      return await this.salesService.payBatchItems(payload);
    } catch (err: any) {
      const msg: string = err?.message || 'Ödeme alınamadı.';
      throw new HttpException(
        { message: msg, errorDetails: msg },
        msg.startsWith('Yazarkasa') ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  @Put('items/:id/transaction-type')
  updateItemTransactionType(@Param('id') id: string, @Body() body: { type: string, reason?: string }, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.updateItemTransactionType(+id, body.type, body.reason, userId);
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
  @Permissions('OP:CAN_CANCEL_SALE')
  cancelTableOrders(@Param('tableId') tableId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.cancelTableOrders(+tableId, userId);
  }

  @Post('items/:id/cancel')
  @Permissions('OP:CAN_CANCEL_SALE')
  cancelItem(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.cancelItem(+id, reason || '', userId);
  }

  @Post(':id/cancel')
  @Permissions('OP:CAN_CANCEL_SALE')
  cancelSale(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.cancelSale(+id, reason || '', userId);
  }

  @Post('items/:id/refund')
  @Permissions('OP:CAN_CANCEL_SALE')
  refundItem(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.refundItem(+id, reason || '', userId);
  }

  @Post(':id/refund')
  @Permissions('OP:CAN_CANCEL_SALE')
  refundSale(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.refundSale(+id, reason || '', userId);
  }

  @Delete(':id')
  @Permissions('OP:CAN_CANCEL_SALE')
  async remove(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.cancelSale(+id, reason || '', userId);
  }

  @Post(':id/restore')
  restoreSale(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.restoreSale(+id, userId);
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
  appendItems(@Param('id') id: string, @Body('items') items: any[], @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.appendItems(+id, items, userId);
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
  
  @Put(':id/discount')
  updateDiscount(
    @Param('id') id: string,
    @Body() body: { discountAmount: number; discountRate?: number },
    @Request() req: any
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.applyDiscount(+id, body.discountAmount, body.discountRate || 0, userId);
  }

  @Put('items/:id/discount')
  updateItemDiscount(
    @Param('id') id: string,
    @Body() body: { discountRate?: number; discountAmount?: number; quantity?: number },
    @Request() req: any
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || 0;
    return this.salesService.updateItemDiscount(+id, body.discountRate || 0, body.discountAmount || 0, userId, body.quantity);
  }


}
