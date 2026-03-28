import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  /** Open a new shift */
  @Post('open')
  openShift(
    @Body() body: { cashRegisterId: number; openingCash: number },
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const companyId = req.user.companyId || 1;
    return this.shiftsService.openShift(
      userId,
      body.cashRegisterId,
      body.openingCash,
      companyId,
    );
  }

  /** Close a shift */
  @Post(':id/close')
  closeShift(
    @Param('id') id: string,
    @Body() body: { closingCash: number; note?: string },
  ) {
    return this.shiftsService.closeShift(+id, body.closingCash, body.note);
  }

  /** Transfer a shift to another user */
  @Post(':id/transfer')
  transferShift(
    @Param('id') id: string,
    @Body() body: { toUserId: number; closingCash: number; note?: string },
  ) {
    return this.shiftsService.transferShift(
      +id,
      body.toUserId,
      body.closingCash,
      body.note,
    );
  }

  /** Get current business date based on parameters */
  @Get('current-business-date')
  getCurrentBusinessDate() {
    return this.shiftsService.getCurrentBusinessDate();
  }

  /** Get the active shift for the logged-in user */
  @Get('active')
  getActiveShift(@Request() req: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.shiftsService.getActiveShift(userId);
  }

  /** Get the active shift for a specific cash register */
  @Get('active/register/:cashRegisterId')
  getActiveShiftByRegister(@Param('cashRegisterId') cashRegisterId: string) {
    return this.shiftsService.getActiveShiftByRegister(+cashRegisterId);
  }

  /** Get shift history with optional filters */
  @Get('history')
  getShiftHistory(
    @Query('cashRegisterId') cashRegisterId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const companyId = req?.user?.companyId || 1;
    return this.shiftsService.getShiftHistory({
      cashRegisterId: cashRegisterId ? +cashRegisterId : undefined,
      userId: userId ? +userId : undefined,
      startDate,
      endDate,
      companyId,
    });
  }
}
