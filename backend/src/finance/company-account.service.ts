import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyAccount } from './company-account.entity';
import { AccountTransaction } from './account-transaction.entity';

@Injectable()
export class CompanyAccountService {
  constructor(
    @InjectRepository(CompanyAccount)
    private accountRepository: Repository<CompanyAccount>,
    @InjectRepository(AccountTransaction)
    private transactionRepository: Repository<AccountTransaction>,
  ) {}

  async findAll(): Promise<CompanyAccount[]> {
    return await this.accountRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<CompanyAccount> {
    const account = await this.accountRepository.findOne({ where: { id } });
    if (!account) throw new NotFoundException(`Account with ID ${id} not found`);
    return account;
  }

  async create(data: Partial<CompanyAccount>): Promise<CompanyAccount> {
    const account = this.accountRepository.create(data);
    return await this.accountRepository.save(account);
  }

  async update(id: number, data: Partial<CompanyAccount>): Promise<CompanyAccount> {
    await this.findOne(id);
    await this.accountRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.accountRepository.delete(id);
  }

  async updateBalance(id: number, amount: number, type: 'INCOME' | 'EXPENSE'): Promise<CompanyAccount> {
    const account = await this.findOne(id);
    const numericAmount = Number(amount);
    
    if (type === 'INCOME') {
      account.balance = Number(account.balance) + numericAmount;
    } else {
      account.balance = Number(account.balance) - numericAmount;
    }
    
    return await this.accountRepository.save(account);
  }

  async getTransactions(accountId: number, page: number = 1, limit: number = 20, search?: string) {
    const query = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.partner', 'partner')
      .where('transaction.companyAccountId = :accountId', { accountId });

    if (search) {
      query.andWhere(
        '(transaction.description LIKE :search OR partner.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await query
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    };
  }
}
