import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ZReportsService } from './z-reports.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly zReportsService: ZReportsService
  ) {}

  @Get('dashboard')
  async getDashboard() {
    return await this.reportsService.getDashboardData();
  }

  @Post('z-reports')
  async generateZReport(
    @Body() body: { cashRegisterId: number; businessDate: string },
    @Request() req: any
  ) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const companyId = req.user.companyId || 1;
    return await this.zReportsService.generateZReport(body.cashRegisterId, body.businessDate, userId, companyId);
  }

  @Get('z-reports')
  async getZReport(
    @Query('cashRegisterId') cashRegisterId: string,
    @Query('businessDate') businessDate: string,
    @Request() req: any
  ) {
    const companyId = req.user.companyId || 1;
    return await this.zReportsService.getZReport(Number(cashRegisterId), businessDate, companyId);
  }
}
