import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cash-registers')
@UseGuards(JwtAuthGuard)
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Get('my')
  async getMyRegister(@Request() req: any) {
    const companyId = req.user.companyId || 1;
    let cashRegisterId = req.user.cashRegisterId;

    if (!cashRegisterId && (req.user.role === 'Süper Admin' || req.user.role === 'Admin')) {
      const allRegisters = await this.cashRegistersService.findAll(companyId);
      if (allRegisters.length > 0) {
        return allRegisters[0];
      }
    }

    if (!cashRegisterId) return null;
    try {
      return await this.cashRegistersService.findOne(cashRegisterId, companyId);
    } catch {
      return null;
    }
  }

  @Get()
  findAll(@Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.cashRegistersService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.cashRegistersService.findOne(+id, companyId);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.cashRegistersService.create(data, companyId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.cashRegistersService.update(+id, data, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.cashRegistersService.remove(+id, companyId);
  }
}
