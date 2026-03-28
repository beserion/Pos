import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PurchaseOrder } from './purchase-order.entity';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) { }

  @Get()
  @Permissions('VIEW_PURCHASE_ORDERS')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.poService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @Permissions('VIEW_PURCHASE_ORDERS')
  findOne(@Param('id') id: string) {
    return this.poService.findOne(+id);
  }

  @Post()
  @Permissions('ADD_PURCHASE_ORDERS')
  create(@Body() poData: Partial<PurchaseOrder>) {
    return this.poService.create(poData);
  }

  @Post('auto-generate')
  @Permissions('ADD_PURCHASE_ORDERS')
  autoGenerate() {
    return this.poService.autoGenerate();
  }

  @Put(':id/status')
  @Permissions('EDIT_PURCHASE_ORDERS')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.poService.updateStatus(+id, status);
  }

  @Put(':id/receive')
  @Permissions('EDIT_PURCHASE_ORDERS')
  receive(@Param('id') id: string) {
    return this.poService.receive(+id);
  }

  @Put(':id/receive-invoice')
  @Permissions('EDIT_PURCHASE_ORDERS')
  receiveWithInvoice(@Param('id') id: string, @Body() invoiceData: any) {
    return this.poService.receiveWithInvoice(+id, invoiceData);
  }

  @Delete(':id')
  @Permissions('EDIT_PURCHASE_ORDERS')
  remove(@Param('id') id: string) {
    return this.poService.remove(+id);
  }
}
