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
  constructor(private readonly ordersService: OrdersService) {}

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

  @Post()
  @Permissions('ADD_ORDERS')
  create(@Body() orderData: Partial<Order>) {
    return this.ordersService.create(orderData);
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
