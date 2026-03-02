import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AccountTransaction } from './account-transaction.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    @Get('transactions')
    getTransactions() {
        return this.financeService.findAll();
    }

    @Get('summary')
    getSummary() {
        return this.financeService.getSummary();
    }

    @Get('transactions/:id')
    getTransaction(@Param('id') id: string) {
        return this.financeService.findOne(+id);
    }

    @Post('transactions')
    createTransaction(@Body() data: Partial<AccountTransaction>) {
        return this.financeService.create(data);
    }

    @Put('transactions/:id')
    updateTransaction(@Param('id') id: string, @Body() data: Partial<AccountTransaction>) {
        return this.financeService.update(+id, data);
    }

    @Delete('transactions/:id')
    remove(@Param('id') id: string) {
        return this.financeService.remove(+id);
    }

    @Get('partner/:id')
    findByPartner(@Param('id') id: string) {
        return this.financeService.findByPartner(+id);
    }
}
