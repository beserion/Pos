import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Order } from './order.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    findAll() {
        return this.ordersService.findAll();
    }

    @Get('kitchen')
    findKitchenOrders() {
        return this.ordersService.findKitchenOrders();
    }

    @Get(':id')
    findOne(@Param('id') id: number) {
        return this.ordersService.findOne(id);
    }

    @Post()
    create(@Body() orderData: Partial<Order>) {
        return this.ordersService.create(orderData);
    }

    @Put(':id/status')
    updateStatus(@Param('id') id: number, @Body('status') status: string) {
        return this.ordersService.updateStatus(id, status);
    }

    @Delete(':id')
    remove(@Param('id') id: number) {
        return this.ordersService.remove(id);
    }
}
