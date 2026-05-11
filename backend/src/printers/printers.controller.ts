import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PrintersService } from './printers.service';
import { Printer } from './printer.entity';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getCachedPerms } from '../auth/permissions.guard';

@Controller('printers')
@UseGuards(JwtAuthGuard)
export class PrintersController {
  constructor(private readonly printersService: PrintersService) { }

  @Get()
  findAll(): Promise<Printer[]> {
    return this.printersService.findAll();
  }

  @Get('discover')
  async discoverPrinters(): Promise<{ success: boolean, printers: any[], message?: string }> {
    return this.printersService.discoverPrinters();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Printer> {
    return this.printersService.findOne(+id);
  }

  @Post()
  create(@Body() createData: Partial<Printer>): Promise<Printer> {
    return this.printersService.create(createData);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<Printer>,
  ): Promise<Printer> {
    return this.printersService.update(+id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.printersService.remove(+id);
  }

  @Post('print-receipt')
  async printReceipt(
    @Body() data: any,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user?.userId || req.user?.id;
    if (userId) {
      const cached = getCachedPerms(userId);
      const isSuper = cached?.roleName === 'ADMIN' || cached?.roleName === 'ADMINISTRATOR';
      if (!isSuper) {
        const perms = cached?.allUserPerms || [];
        
        // 1. Yazdırma Yetkisi Kontrolü
        if (!perms.includes('OP:CAN_PRINT_BILL')) {
          return { success: false, message: 'Adisyon yazdırma yetkiniz bulunmamaktadır.' };
        }

        // 2. Tekrar Yazdırma Kontrolü
        // Frontend'den gelen data'da masanın zaten yazdırıldığı bilgisi varsa
        if (data.isAlreadyPrinted && !perms.includes('OP:REPRINT_BILL')) {
          return { success: false, message: 'Bu adisyon daha önce yazdırılmıştır. Tekrar yazdırma yetkiniz yok.' };
        }
      }
    }
    return this.printersService.printReceipt(data);
  }

  @Post('print-kitchen')
  printKitchen(
    @Body() data: any,
  ): Promise<{ success: boolean; message: string }> {
    return this.printersService.printKitchen(data);
  }

  @Post('print-z-report')
  printZReport(
    @Body() data: any,
  ): Promise<{ success: boolean; message: string }> {
    return this.printersService.printZReport(data);
  }

  @Post('print-z-report-detailed')
  async printZReportDetailed(
    @Body() body: { zReportId: number; printerId: number },
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    const userId = req.user?.userId || req.user?.id;
    return this.printersService.printZReportDetailed(body.zReportId, body.printerId, userId);
  }
}
