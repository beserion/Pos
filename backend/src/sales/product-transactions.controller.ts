import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductTransactionsService } from './product-transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('product-transactions')
@UseGuards(JwtAuthGuard)
export class ProductTransactionsController {
  constructor(private readonly service: ProductTransactionsService) {}

  @Get()
  @Permissions('VIEW_SALES')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('actionType') actionType?: string,
    @Query('waiterId') waiterId?: string,
    @Query('salesChannel') salesChannel?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll(
      page ? +page : 1,
      limit ? +limit : 20,
      productId ? +productId : undefined,
      actionType,
      waiterId ? +waiterId : undefined,
      salesChannel,
      startDate,
      endDate,
    );
  }

  @Get('action-types')
  @Permissions('VIEW_SALES')
  async getActionTypes() {
    return this.service.getActionTypes();
  }

  @Get('by-check/:checkNo')
  @Permissions('VIEW_SALES')
  async findByCheck(@Param('checkNo') checkNo: string) {
    return this.service.findByCheck(checkNo);
  }

  @Get('by-product/:productId')
  @Permissions('VIEW_SALES')
  async findByProduct(@Param('productId') productId: string) {
    return this.service.findByProduct(+productId);
  }
}
