import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountTransaction } from './account-transaction.entity';
import { PartnersService } from '../partners/partners.service';
import { CompanyAccountService } from './company-account.service';
import { ParametersService } from '../parameters/parameters.service';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(AccountTransaction)
    private transactionRepository: Repository<AccountTransaction>,
    private partnersService: PartnersService,
    private companyAccountService: CompanyAccountService,
    private parametersService: ParametersService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    startDate?: string,
    endDate?: string,
    type?: string,
    paymentMethod?: string,
  ): Promise<{ data: AccountTransaction[]; total: number; page: number; lastPage: number }> {
    const query = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .orderBy('transaction.createdAt', 'DESC');

    if (search) {
      query.andWhere(
        '(transaction.description LIKE :search OR transaction.category LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (startDate) {
      query.andWhere('transaction.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('transaction.createdAt <= :endDate', { endDate: end });
    }

    if (type && type !== 'ALL') {
      query.andWhere('transaction.type = :type', { type });
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      query.andWhere('transaction.paymentMethod = :paymentMethod', { paymentMethod });
    }

    const [transactions, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: transactions,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<AccountTransaction> {
    const tx = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!tx) throw new NotFoundException(`Transaction with ID ${id} not found`);
    return tx;
  }

  async create(data: Partial<AccountTransaction>, manager?: any): Promise<AccountTransaction> {
    const repo = manager ? manager.getRepository(AccountTransaction) : this.transactionRepository;
    
    if (data.id) delete data.id;
    (data as any).partnerId = data.partnerId || null;
    (data as any).userId = data.userId || null;
    (data as any).companyAccountId = data.companyAccountId || null;
    (data as any).sourceId = data.sourceId || null;

    const transaction = repo.create(data);
    const saved = await repo.save(transaction);

    // Update Company Account Balance
    if (saved.companyAccountId) {
      const balanceAmount = (saved.currency && saved.currency !== 'TRY' && saved.currency !== 'TL')
        ? Number(saved.foreignAmount || 0)
        : Number(saved.amount || 0);

      await this.companyAccountService.updateBalance(
        saved.companyAccountId,
        balanceAmount,
        saved.type as 'INCOME' | 'EXPENSE',
        manager,
      );
    }

    if (saved.partnerId) {
      try {
        // ERP Logic mapping:
        // A Sale (Gelir) increases what the customer owes (Borçlandırma -> DEBIT)
        // A Payment (Gelir) decreases what the customer owes (Tahsilat -> CREDIT)
        // A Purchase (Gider) increases what we owe the supplier (Borçlanma -> DEBIT)
        
        let erpType: 'DEBIT' | 'CREDIT' | 'INCOME' | 'EXPENSE' = saved.type as any;
        
        if (saved.type === 'INCOME') {
          // If it's a Sale, it's a Debit to the customer
          if (saved.category === 'Satış' || saved.sourceType === 'ORDER' || saved.sourceType === 'SALE') {
            erpType = 'DEBIT';
          } else {
            // Otherwise assume it's a collection/payment received
            erpType = 'CREDIT';
          }
        } else if (saved.type === 'EXPENSE') {
          // Purchases increase our debt to supplier (Credit for the ledger account decreases currentBalance)
          erpType = 'CREDIT';
        }

        await this.partnersService.updateBalance(
          saved.partnerId,
          saved.amount,
          erpType,
          manager,
        );
      } catch (err) {
        console.error('Error updating partner balance:', err);
      }
    }

    return saved;
  }

  async update(
    id: number,
    data: Partial<AccountTransaction>,
  ): Promise<AccountTransaction> {
    if (data.id) delete data.id;
    await this.findOne(id);
    await this.transactionRepository.update(id, data);
    return this.findOne(id);
  }

  /**
   * Aynı gün içinde birden fazla Gün Sonu yapılırsa Finance tablosunda
   * tekrar kayıt açmak yerine mevcut kaydın tutarını günceller.
   */
  async upsertEndOfDay(
    data: {
      amount: number;
      paymentMethod: string;
      description: string;
      category: string;
      userId?: number;
      businessDate?: string;
      currency?: string;
      exchangeRate?: number;
      foreignAmount?: number;
      companyAccountId?: number;
    },
    manager?: any,
  ): Promise<AccountTransaction> {
    const repo: Repository<AccountTransaction> = manager
      ? manager.getRepository(AccountTransaction)
      : this.transactionRepository;

    // Aktif program tarihini al (gerçek tarih yerine iş günü tarihi)
    let activeBusinessDate = data.businessDate;
    if (!activeBusinessDate) {
      try {
        const stored = await this.parametersService.getValue('pos', 'active_business_date');
        activeBusinessDate = (stored && stored.trim().length === 10) ? stored : new Date().toISOString().split('T')[0];
      } catch {
        activeBusinessDate = new Date().toISOString().split('T')[0];
      }
    }

    const targetCurrency = (data.currency || 'TRY').toUpperCase();

    // Aynı iş günü + END_OF_DAY + aynı ödeme yöntemi + aynı döviz kaydı var mı?
    const existing = await repo
      .createQueryBuilder('tx')
      .where('tx.sourceType = :sourceType', { sourceType: 'END_OF_DAY' })
      .andWhere('tx.paymentMethod = :pm', { pm: data.paymentMethod })
      .andWhere('tx.businessDate = :bd', { bd: activeBusinessDate })
      .andWhere('tx.currency = :currency', { currency: targetCurrency })
      .getOne();

    if (existing) {
      // Mevcut tutara yeni miktarı ekle
      const deltaAmount = Number(data.amount || 0);
      const deltaForeign = Number(data.foreignAmount || 0);
      
      const newAmount = Number(existing.amount) + deltaAmount;
      const newForeignAmount = Number(existing.foreignAmount || 0) + deltaForeign;
      
      await repo.update(existing.id, {
        amount: newAmount,
        foreignAmount: newForeignAmount,
        exchangeRate: data.exchangeRate ?? existing.exchangeRate,
        description: data.description,
        userId: data.userId ?? existing.userId,
      });

      // Kasa bakiyesini yalnızca delta kadar artır
      if (existing.companyAccountId) {
        const balanceDelta = (existing.currency && existing.currency !== 'TRY' && existing.currency !== 'TL')
          ? deltaForeign
          : deltaAmount;

        await this.companyAccountService.updateBalance(
          existing.companyAccountId,
          balanceDelta,
          'INCOME',
          manager,
        );
      }

      return repo.findOne({ where: { id: existing.id } }) as Promise<AccountTransaction>;
    }

    // Resolve companyAccountId automatically if not provided
    let companyAccountId = data.companyAccountId;
    if (!companyAccountId) {
      let accountType = 'CASH';
      if (data.paymentMethod === 'KREDI_KARTI' || data.paymentMethod === 'CREDIT_CARD') {
        accountType = 'CREDIT_CARD';
      } else if (data.paymentMethod === 'BANKA' || data.paymentMethod === 'BANK') {
        accountType = 'BANK';
      }
      
      try {
        const account = await this.companyAccountService.getOrCreateDefaultAccount(
          accountType,
          targetCurrency,
          manager,
        );
        companyAccountId = account.id;
      } catch (err) {
        this.logger.error('Failed to get or create company account for End of Day:', err);
      }
    }

    // Kayıt yoksa normal create (businessDate ve otomatik companyAccountId ile)
    return this.create({
      ...data,
      companyAccountId,
      type: 'INCOME',
      sourceType: 'END_OF_DAY',
      businessDate: activeBusinessDate,
      currency: targetCurrency,
      exchangeRate: data.exchangeRate ?? 1.0,
      foreignAmount: data.foreignAmount ?? 0.0,
    }, manager);
  }

  async remove(id: number): Promise<void> {
    const tx = await this.findOne(id);
    
    // Reverse the balance before deleting
    if (tx.companyAccountId) {
      const reverseType = tx.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
      const balanceAmount = (tx.currency && tx.currency !== 'TRY' && tx.currency !== 'TL')
        ? Number(tx.foreignAmount || 0)
        : Number(tx.amount || 0);

      await this.companyAccountService.updateBalance(
        tx.companyAccountId,
        balanceAmount,
        reverseType
      );
    }

    await this.transactionRepository.delete(id);
  }

  async getSummary() {
    const transactions = await this.transactionRepository.find();
    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const kasa = transactions
      .filter((t) => t.paymentMethod === 'KASA')
      .reduce(
        (s, t) =>
          s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
        0,
      );
    const banka = transactions
      .filter((t) => t.paymentMethod === 'BANKA')
      .reduce(
        (s, t) =>
          s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
        0,
      );
    const kart = transactions
      .filter((t) => t.paymentMethod === 'KREDI_KARTI')
      .reduce(
        (s, t) =>
          s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
        0,
      );

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      kasa,
      banka,
      kart,
      count: transactions.length,
    };
  }

  async findByPartner(partnerId: number): Promise<AccountTransaction[]> {
    return await this.transactionRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  async removeBySource(sourceType: string, sourceId: number): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { sourceType, sourceId },
    });
    
    if (transaction) {
      // Reverse balance before removing
      if (transaction.companyAccountId) {
        const reverseType = transaction.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
        await this.companyAccountService.updateBalance(
          transaction.companyAccountId,
          transaction.amount,
          reverseType
        );
      }

      if (transaction.partnerId) {
        // Reverse partner balance
        // Current implementation of updateBalance handles reversal if we pass the opposite type
        // But let's be explicit: if it was INCOME (Credit), we give DEBIT to reverse it.
        // If it was EXPENSE (Credit), we give DEBIT to reverse it? No, mapping was complex.
        
        let reverseErpType: 'DEBIT' | 'CREDIT' | 'INCOME' | 'EXPENSE';
        
        if (transaction.type === 'INCOME') {
          // It was a Sale (DEBIT) or Payment (CREDIT). 
          // If it was a Sale (which uses DEBIT), its reverse is CREDIT.
          // If it was a Payment (which uses CREDIT), its reverse is DEBIT.
          if (transaction.category === 'Satış' || transaction.sourceType === 'ORDER' || transaction.sourceType === 'SALE' || transaction.sourceType === 'INVOICE') {
             reverseErpType = 'CREDIT';
          } else {
             reverseErpType = 'DEBIT';
          }
        } else {
          // It was an Expense (Purchase), which used CREDIT. So reverse is DEBIT.
          reverseErpType = 'DEBIT';
        }

        await this.partnersService.updateBalance(
          transaction.partnerId,
          transaction.amount,
          reverseErpType
        );
      }

      await this.transactionRepository.delete(transaction.id);
    }
  }
}
