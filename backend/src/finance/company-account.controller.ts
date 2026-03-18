import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompanyAccountService } from './company-account.service';
import { CompanyAccount } from './company-account.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance/accounts')
@UseGuards(JwtAuthGuard)
export class CompanyAccountController {
  constructor(private readonly accountService: CompanyAccountService) {}

  @Get()
  findAll() {
    return this.accountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(+id);
  }

  @Post()
  create(@Body() data: Partial<CompanyAccount>) {
    return this.accountService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<CompanyAccount>) {
    return this.accountService.update(+id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountService.remove(+id);
  }

  @Get(':id/transactions')
  getTransactions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return this.accountService.getTransactions(+id, +page, +limit, search);
  }
}
