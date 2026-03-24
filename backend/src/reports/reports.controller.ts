import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ZReportsService } from './z-reports.service';
import { AuditLogService } from './audit-log.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly zReportsService: ZReportsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Dashboard (mevcut) ──
  @Get('dashboard')
  async getDashboard() {
    return await this.reportsService.getDashboardData();
  }

  // ── 1. Satış Analizi ──
  @Get('sales-analysis')
  async getSalesAnalysis(
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cashRegisterId') cashRegisterId?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId || 1;
    return await this.reportsService.getSalesAnalysis({
      date,
      startDate,
      endDate,
      cashRegisterId: cashRegisterId ? Number(cashRegisterId) : undefined,
      companyId,
    });
  }

  // ── 2. Detaylı Satış Analizi ──
  @Get('detailed-sales-analysis')
  async getDetailedSalesAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cashRegisterId') cashRegisterId?: string,
    @Query('waiterId') waiterId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId || 1;
    return await this.reportsService.getDetailedSalesAnalysis({
      startDate,
      endDate,
      cashRegisterId: cashRegisterId ? Number(cashRegisterId) : undefined,
      waiterId: waiterId ? Number(waiterId) : undefined,
      paymentMethod,
      companyId,
    });
  }

  // ── 3. Z Raporu ──
  @Post('z-reports')
  async generateZReport(
    @Body() body: { cashRegisterId: number; businessDate: string },
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const companyId = req.user.companyId || 1;
    return await this.zReportsService.generateZReport(body.cashRegisterId, body.businessDate, userId, companyId);
  }

  @Get('z-reports')
  async getZReport(
    @Query('cashRegisterId') cashRegisterId: string,
    @Query('businessDate') businessDate: string,
    @Request() req: any,
  ) {
    if (!cashRegisterId || !businessDate) return null;
    const companyId = req.user.companyId || 1;
    return await this.zReportsService.getZReport(Number(cashRegisterId), businessDate, companyId);
  }

  @Get('z-reports/list')
  async listZReports(
    @Query('cashRegisterId') cashRegisterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId || 1;
    return await this.zReportsService.listZReports({
      cashRegisterId: cashRegisterId ? Number(cashRegisterId) : undefined,
      startDate,
      endDate,
      companyId,
    });
  }

  // ── 4. Vardiya Raporu ──
  @Get('shift-report/by-user')
  async getShiftReportByUser(
    @Query('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!userId) return null;
    return await this.reportsService.getShiftReportByUser(Number(userId), startDate, endDate);
  }

  @Get('shift-report/:shiftId')
  async getShiftReport(@Param('shiftId') shiftId: string) {
    return await this.reportsService.getShiftReport(Number(shiftId));
  }

  // ── 5. Denetim Raporu ──
  @Get('audit')
  async getAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('cashRegisterId') cashRegisterId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('actionType') actionType?: string,
    @Query('saleId') saleId?: string,
    @Query('tableNo') tableNo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId || 1;
    return await this.auditLogService.getAuditLogs({
      companyId,
      startDate,
      endDate,
      userId: userId ? Number(userId) : undefined,
      cashRegisterId: cashRegisterId ? Number(cashRegisterId) : undefined,
      shiftId: shiftId ? Number(shiftId) : undefined,
      actionType,
      saleId: saleId ? Number(saleId) : undefined,
      tableNo,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
  // ── 6. Transfer Raporu ──
  @Get('transfers')
  async getTransferReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportsService.getTransferReport({ startDate, endDate });
  }
}
