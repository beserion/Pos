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

@Controller('invoices')
// @UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Public()
  @Get('seed')
  async seedTempData() {
    return this.invoicesService.seedTestData();
  }

  @Get()
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
  generateNumber() {
    return this.invoicesService.generateInvoiceNumber();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Post()
  create(@Body() invoiceData: any) {
    return this.invoicesService.create(invoiceData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() invoiceData: any) {
    return this.invoicesService.updateFull(+id, invoiceData);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.invoicesService.updateStatus(+id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(+id);
  }

  @Get('partner/:id')
  findByPartner(@Param('id') id: string) {
    return this.invoicesService.findByPartner(+id);
  }
}
