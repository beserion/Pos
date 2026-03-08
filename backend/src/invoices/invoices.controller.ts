import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from './invoice.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Post()
  create(@Body() invoiceData: Partial<Invoice>) {
    return this.invoicesService.create(invoiceData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Invoice>) {
    return this.invoicesService.update(+id, updateData);
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
