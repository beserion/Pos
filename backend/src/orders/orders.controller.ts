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
@UseGuards(JwtAuthGuard)
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
  create(@Body() orderData: Partial<Order>) {
    return this.ordersService.create(orderData);
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

  @Delete(':id')
  @Permissions('DELETE_ORDERS')
  remove(@Param('id') id: number) {
    return this.ordersService.remove(id);
  }
}
