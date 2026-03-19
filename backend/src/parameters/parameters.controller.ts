import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ParametersService } from './parameters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('parameters')
@UseGuards(JwtAuthGuard)
export class ParametersController {
  constructor(private readonly service: ParametersService) {}

  // GET /parameters → Tüm parametreler
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // GET /parameters/module/:module → Modüle göre
  @Get('module/:module')
  findByModule(@Param('module') module: string) {
    return this.service.findByModule(module);
  }

  // GET /parameters/value?module=pos&key=tax_rate
  @Get('value')
  getValue(@Query('module') module: string, @Query('key') key: string) {
    return this.service.getValue(module, key);
  }

  // POST /parameters/upsert → Tekil kayıt
  @Post('upsert')
  upsert(@Body() body: { module: string; key: string; value: string; label?: string; type?: string; description?: string }) {
    return this.service.upsert(body.module, body.key, body.value, body.label, body.type, body.description);
  }

  // POST /parameters/bulk → Toplu kayıt
  @Post('bulk')
  bulkUpsert(@Body() body: { items: { module: string; key: string; value: string; label?: string; type?: string; description?: string }[] }) {
    return this.service.bulkUpsert(body.items);
  }

  // DELETE /parameters/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
