import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InposService } from './inpos.service';
import type { InposConnectionConfig, InposInvoiceInfo, InposSaleItemData, InposPaymentInfo } from './inpos.types';
import { getErrorName, InposExtError } from './inpos.types';

@Controller('inpos')
@UseGuards(JwtAuthGuard)
export class InposController {
  constructor(private readonly inposService: InposService) {}

  /** Yazarkasaya bağlan */
  @Post('connect')
  async connect(@Body() config: InposConnectionConfig) {
    const status = await this.inposService.connect(config);
    return { success: status.connected, status };
  }

  /** Bağlantıyı kes */
  @Post('disconnect')
  disconnect() {
    this.inposService.disconnect();
    return { success: true, message: 'Bağlantı kesildi' };
  }

  /** Cihaz durumu */
  @Get('status')
  getStatus() {
    return this.inposService.getStatus();
  }

  /** Normal satış yap */
  @Post('sale')
  async processSale(
    @Body() body: { items: InposSaleItemData[]; payments: InposPaymentInfo[]; cashierName?: string },
  ) {
    return this.inposService.processSale(body.items, body.payments, body.cashierName);
  }

  /** Faturalı satış yap */
  @Post('sale-with-invoice')
  async processSaleWithInvoice(
    @Body() body: { items: InposSaleItemData[]; payments: InposPaymentInfo[]; invoiceData: InposInvoiceInfo; cashierName?: string },
  ) {
    return this.inposService.processSaleWithInvoice(body.items, body.payments, body.invoiceData, body.cashierName);
  }

  /** X raporu al */
  @Post('x-report')
  xReport() {
    const result = this.inposService.getXReport();
    return { success: result.error === InposExtError.InposNoError, error: getErrorName(result.error) };
  }

  /** Z raporu al */
  @Post('z-report')
  zReport() {
    const result = this.inposService.getZReport();
    return { success: result.error === InposExtError.InposNoError, error: getErrorName(result.error) };
  }

  /** Kısım bilgilerini cihazdan çek */
  @Get('sections')
  getSections() {
    return this.inposService.getAllSections();
  }

  /** Tuşları kilitle */
  @Post('block-keys')
  blockKeys() {
    const result = this.inposService.blockKeys();
    return { success: result.error === InposExtError.InposNoError, error: getErrorName(result.error) };
  }

  /** Tuş kilidini aç */
  @Post('unblock-keys')
  unblockKeys() {
    const result = this.inposService.unblockKeys();
    return { success: result.error === InposExtError.InposNoError, error: getErrorName(result.error) };
  }

  /** Tuş kilidi durumu */
  @Get('key-status')
  keyStatus() {
    return this.inposService.getKeyBlockStatus();
  }

  /** Kayıtlı ayarları getir */
  @Get('config')
  async getConfig(@Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.inposService.getConfig(companyId);
  }

  /** Ayarları kaydet */
  @Post('config')
  async saveConfig(@Body() data: any, @Request() req: any) {
    const companyId = req.user.companyId || 1;
    return this.inposService.saveConfig(data, companyId);
  }

  /** Mevcut Z numarası */
  @Get('current-z')
  getCurrentZ() {
    return this.inposService.getCurrentZ();
  }
}
