import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountTransaction } from './account-transaction.entity';
import { CompanyAccount } from './company-account.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { CompanyAccountService } from './company-account.service';
import { CompanyAccountController } from './company-account.controller';
import { PartnersModule } from '../partners/partners.module';
import { ParametersModule } from '../parameters/parameters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountTransaction, CompanyAccount]),
    PartnersModule,
    ParametersModule,
  ],
  providers: [FinanceService, CompanyAccountService],
  controllers: [FinanceController, CompanyAccountController],
  exports: [FinanceService, CompanyAccountService],
})
export class FinanceModule {}

