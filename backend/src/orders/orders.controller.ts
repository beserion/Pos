import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Order } from './order.entity';

@Controller('orders')
// @UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Get()
  @Permissions('VIEW_ORDERS')
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('kitchen')
  @Permissions('VIEW_ORDERS')
  findKitchenOrders() {
    return this.ordersService.findKitchenOrders();
  }

  @Get('kitchen/counts')
  @Permissions('VIEW_ORDERS')
  getKitchenCounts() {
    return this.ordersService.getKitchenCounts();
  }

  @Get(':id')
  @Permissions('VIEW_ORDERS')
  findOne(@Param('id') id: number) {
    return this.ordersService.findOne(id);
  }

  @Get('table/:tableId/active')
  @Permissions('VIEW_ORDERS')
  findActiveOrdersByTable(@Param('tableId') tableId: number) {
    return this.ordersService.findActiveOrdersByTable(tableId);
  }

  @Post()
  @Permissions('ADD_ORDERS')
  async create(@Body() orderData: Partial<Order>) {
    try {
      return await this.ordersService.create(orderData);
    } catch (err: any) {
      throw new (require('@nestjs/common').HttpException)(err.message || 'Error', 500);
    }
  }

  @Post('table/:tableId/checkout')
  @Permissions('EDIT_ORDERS')
  async checkoutTableItems(@Param('tableId') tableId: number, @Body() checkoutData: any) {
    try {
      const { userId, ...data } = checkoutData;
      await this.ordersService.checkoutTableItems(tableId, data, userId);
      return { success: true };
    } catch (error: any) {
      console.error(error);
      throw new (require('@nestjs/common').InternalServerErrorException)({
        message: 'Checkout operation failed',
        errorDetails: error.message,
        stack: error.stack,
      });
    }
  }

  @Put(':id/status')
  @Permissions('EDIT_ORDERS')
  updateStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.ordersService.updateStatus(id, status);
  }

  @Put('items/:itemId/pay')
  @Permissions('EDIT_ORDERS')
  markItemAsPaid(
    @Param('itemId') itemId: number,
    @Body('paymentMethod') paymentMethod: string,
    @Body('partnerId') partnerId: number,
  ) {
    return this.ordersService.markItemAsPaid(itemId, paymentMethod || 'KASA', partnerId);
  }

  @Put('items/pay-batch')
  @Permissions('EDIT_ORDERS')
  markItemsAsPaid(
    @Body('itemIds') itemIds: number[],
    @Body('paymentMethod') paymentMethod: string,
    @Body('partnerId') partnerId: number,
  ) {
    return this.ordersService.markItemsAsPaid(itemIds, paymentMethod || 'KASA', partnerId);
  }

  @Post('table/:tableId/cancel')
  @Permissions('EDIT_ORDERS')
  async cancelTableOrders(@Param('tableId') tableId: number) {
    try {
      await this.ordersService.cancelTableOrders(tableId);
      return { success: true };
    } catch (error: any) {
      throw new (require('@nestjs/common').InternalServerErrorException)({
        message: 'Cancellation failed',
        errorDetails: error.message,
      });
    }
  }

  @Delete(':id')
  @Permissions('DELETE_ORDERS')
  remove(@Param('id') id: number) {
    return this.ordersService.remove(id);
  }
}
