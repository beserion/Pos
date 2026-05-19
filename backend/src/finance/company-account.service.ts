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
    if (data.id) delete data.id;
    const account = this.accountRepository.create(data);
    return await this.accountRepository.save(account);
  }

  async update(id: number, data: Partial<CompanyAccount>): Promise<CompanyAccount> {
    if (data.id) delete data.id;
    await this.findOne(id);
    await this.accountRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.accountRepository.delete(id);
  }

  async updateBalance(id: number, amount: number, type: 'INCOME' | 'EXPENSE', manager?: any): Promise<CompanyAccount> {
    const repo = manager ? manager.getRepository(CompanyAccount) : this.accountRepository;
    const account = await (manager ? manager.findOne(CompanyAccount, { where: { id } }) : this.findOne(id));
    if (!account) throw new NotFoundException(`Account with ID ${id} not found`);
    const numericAmount = Number(amount);
    
    if (type === 'INCOME') {
      account.balance = Number(account.balance) + numericAmount;
    } else {
      account.balance = Number(account.balance) - numericAmount;
    }
    
    return await repo.save(account);
  }

  async getOrCreateDefaultAccount(type: string, currency: string, manager?: any): Promise<CompanyAccount> {
    const repo = manager ? manager.getRepository(CompanyAccount) : this.accountRepository;
    const upperCurrency = (currency || 'TRY').toUpperCase();
    const cleanType = (type || 'CASH').toUpperCase();
    
    let account = await repo.findOne({
      where: {
        type: cleanType,
        currency: upperCurrency,
        isActive: true,
      }
    });
    
    if (!account) {
      let name = '';
      if (cleanType === 'CASH') {
        if (upperCurrency === 'EUR') name = 'Euro Kasası';
        else if (upperCurrency === 'USD') name = 'Dolar Kasası';
        else if (upperCurrency === 'GBP') name = 'Sterlin Kasası';
        else if (upperCurrency === 'TRY' || upperCurrency === 'TL') name = 'Merkez Kasa';
        else name = `${upperCurrency} Kasası`;
      } else if (cleanType === 'CREDIT_CARD') {
        if (upperCurrency === 'TRY' || upperCurrency === 'TL') name = 'Garanti POS';
        else name = `${upperCurrency} POS Hesabı`;
      } else {
        name = `${upperCurrency} Banka Hesabı`;
      }
      
      account = repo.create({
        name,
        type: cleanType,
        currency: upperCurrency,
        balance: 0,
        isActive: true,
      });
      
      account = await repo.save(account);
    }
    
    return account;
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
