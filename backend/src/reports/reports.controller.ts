import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ZReportsService } from './z-reports.service';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly zReportsService: ZReportsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Dashboard ──
  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    return await this.reportsService.getDashboardData(companyId);
  }

  // ── 1. Satış Analizi ──
  @Get('sales-analysis')
  async getSalesAnalysis(@Query() query: any, @Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    return await this.reportsService.getSalesAnalysis({ ...query, companyId });
  }

  // ── 2. Detaylı Satış Analizi ──
  @Get('detailed-sales-analysis')
  async getDetailedSalesAnalysis(@Query() query: any, @Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    return await this.reportsService.getDetailedSalesAnalysis({ ...query, companyId });
  }

  // ── 3. Z Raporları ──
  @Get('z-reports/list')
  async listZReports(@Query() query: any, @Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    return await this.zReportsService.listZReports({ ...query, companyId });
  }

  @Post('z-reports')
  async generateZReport(@Body() body: any, @Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    const userId = req?.user?.id;
    return await this.zReportsService.generateZReport(
      body.cashRegisterId,
      body.businessDate,
      userId,
      companyId,
    );
  }

  @Get('z-report')
  async getZReport(@Query('cashRegisterId') crid: number, @Query('date') date: string, @Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    return await this.zReportsService.getZReport(crid, date, companyId);
  }

  // ── 4. Vardiya Raporu ──
  @Get('shift-report/detail')
  async getShiftReport(@Query('shiftId') shiftId: number) {
    return await this.reportsService.getShiftReport(shiftId);
  }

  @Get('shift-report/by-user')
  async getShiftReportByUser(@Query('userId') userId: number, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return await this.reportsService.getShiftReportByUser(userId, startDate, endDate);
  }

  // ── 5. Transfer Raporu ──
  @Get('transfer-report')
  async getTransferReport(@Query() query: any) {
    return await this.reportsService.getTransferReport(query);
  }

  // ── 6. Denetim Raporu ──
  @Get('audit')
  async getAuditLogs(@Query() query: any, @Request() req: any) {
    const companyId = req?.user?.companyId || 1;
    return await this.auditLogService.getAuditLogs({ ...query, companyId });
  }
}
