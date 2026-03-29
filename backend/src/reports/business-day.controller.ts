import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BusinessDayService } from './business-day.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('business-day')
@UseGuards(AuthGuard('jwt'))
export class BusinessDayController {
  constructor(private readonly businessDayService: BusinessDayService) {}

  /** İş günü durum bilgisi — tüm kontroller */
  @Get('status')
  async getStatus(@Request() req: any) {
    const companyId = req.user?.companyId || 1;
    return this.businessDayService.getBusinessDayStatus(companyId);
  }

  /** Gün sonu al — 6 saat kuralı + ileri tarih koruması + vardiya kontrolü */
  @Post('end-of-day')
  async endOfDay(
    @Body() body: { note?: string },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const companyId = req.user?.companyId || 1;
    return this.businessDayService.performEndOfDay(userId, companyId, body.note);
  }

  /** Kapalı gün devri — tek gün, sıralı */
  @Post('rollover-closed-day')
  async rolloverClosedDay(
    @Body() body: { businessDate: string; isClosed: boolean; note: string },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const companyId = req.user?.companyId || 1;
    return this.businessDayService.rolloverClosedDay(
      userId,
      body.businessDate,
      body.isClosed,
      body.note,
      companyId,
    );
  }

  /** Aynı tarihte devam et — sadece yetkili kullanıcı */
  @Post('continue-same-date')
  async continueSameDate(
    @Body() body: { note: string },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const companyId = req.user?.companyId || 1;
    return this.businessDayService.continueOnSameDate(userId, body.note, companyId);
  }

  /** Bekleyen kapalı gün listesi */
  @Get('closed-day-queue')
  async getClosedDayQueue(@Request() req: any) {
    const companyId = req.user?.companyId || 1;
    return this.businessDayService.getClosedDayQueue(companyId);
  }

  /** Teknik tarih düzeltme — sadece üst yetkili */
  @Post('technical-date-fix')
  async technicalDateFix(
    @Body() body: { newDate: string; note: string },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const companyId = req.user?.companyId || 1;
    return this.businessDayService.technicalDateFix(
      userId,
      body.newDate,
      body.note,
      companyId,
    );
  }
}
