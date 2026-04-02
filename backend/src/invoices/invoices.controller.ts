import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Patch,
  UseGuards,
  Query,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { Permissions } from '../auth/permissions.decorator';
import { RequireFeature } from '../auth/feature.decorator';
import { FeatureGuard } from '../auth/feature.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature('finance_system')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Public()
  @Get('seed')
  async seedTempData() {
    return this.invoicesService.seedTestData();
  }

  @Get()
  @Permissions('VIEW_INVOICES', 'VIEW_SALES')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoicesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
      status,
      type,
      startDate,
      endDate
    );
  }

  @Get('generate-number')
  @Permissions('ADD_INVOICES', 'ADD_SALES')
  generateNumber() {
    return this.invoicesService.generateInvoiceNumber();
  }

  @Get(':id')
  @Permissions('VIEW_INVOICES', 'VIEW_SALES')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Post()
  @Permissions('ADD_INVOICES')
  create(@Body() invoiceData: any) {
    return this.invoicesService.create(invoiceData);
  }

  @Put(':id')
  @Permissions('EDIT_INVOICES')
  update(@Param('id') id: string, @Body() invoiceData: any) {
    return this.invoicesService.updateFull(+id, invoiceData);
  }

  @Patch(':id/status')
  @Permissions('EDIT_INVOICES')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.invoicesService.updateStatus(+id, status);
  }

  @Delete(':id')
  @Permissions('DELETE_INVOICES')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(+id);
  }

  @Get('partner/:id')
  @Permissions('VIEW_INVOICES')
  findByPartner(@Param('id') id: string) {
    return this.invoicesService.findByPartner(+id);
  }
}
