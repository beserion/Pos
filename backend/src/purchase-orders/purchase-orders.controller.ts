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
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PurchaseOrder } from './purchase-order.entity';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  @Permissions('VIEW_PURCHASE_ORDERS')
  findAll() {
    return this.poService.findAll();
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

  @Delete(':id')
  @Permissions('EDIT_PURCHASE_ORDERS')
  remove(@Param('id') id: string) {
    return this.poService.remove(+id);
  }
}
