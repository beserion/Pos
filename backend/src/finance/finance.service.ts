import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountTransaction } from './account-transaction.entity';
import { PartnersService } from '../partners/partners.service';
import { CompanyAccountService } from './company-account.service';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(AccountTransaction)
    private transactionRepository: Repository<AccountTransaction>,
    private partnersService: PartnersService,
    private companyAccountService: CompanyAccountService,
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
    
    (data as any).partnerId = data.partnerId || null;
    (data as any).userId = data.userId || null;
    (data as any).companyAccountId = data.companyAccountId || null;
    (data as any).sourceId = data.sourceId || null;

    const transaction = repo.create(data);
    const saved = await repo.save(transaction);

    // Update Company Account Balance
    if (saved.companyAccountId) {
      await this.companyAccountService.updateBalance(
        saved.companyAccountId,
        saved.amount,
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
          // Purchases increase our debt to supplier (Debit for the ledger account)
          erpType = 'DEBIT';
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
    await this.findOne(id);
    await this.transactionRepository.update(id, data);
    return this.findOne(id);
  }

  /**
   * Aynı gün içinde birden fazla Gün Sonu yapılırsa Finance tablosunda
   * tekrar kayıt açmak yerine mevcut kaydın tutarını günceller.
   */
  async upsertEndOfDay(
    data: { amount: number; paymentMethod: string; description: string; category: string; userId?: number },
    manager?: any,
  ): Promise<AccountTransaction> {
    const repo: Repository<AccountTransaction> = manager
      ? manager.getRepository(AccountTransaction)
      : this.transactionRepository;

    // Bugünün başlangıcı ve sonu
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Aynı gün + END_OF_DAY + aynı ödeme yöntemi kaydı var mı?
    const existing = await repo
      .createQueryBuilder('tx')
      .where('tx.sourceType = :sourceType', { sourceType: 'END_OF_DAY' })
      .andWhere('tx.paymentMethod = :pm', { pm: data.paymentMethod })
      .andWhere('tx.createdAt >= :start', { start: todayStart })
      .andWhere('tx.createdAt <= :end', { end: todayEnd })
      .getOne();

    if (existing) {
      // Mevcut tutara yeni miktarı ekle
      const delta = data.amount;
      const newAmount = Number(existing.amount) + delta;
      await repo.update(existing.id, {
        amount: newAmount,
        description: data.description,
        userId: data.userId ?? existing.userId,
      });

      // Kasa bakiyesini yalnızca delta kadar artır
      if (existing.companyAccountId) {
        await this.companyAccountService.updateBalance(
          existing.companyAccountId,
          delta,
          'INCOME',
          manager,
        );
      }

      return repo.findOne({ where: { id: existing.id } }) as Promise<AccountTransaction>;
    }

    // Kayıt yoksa normal create
    return this.create({ ...data, type: 'INCOME', sourceType: 'END_OF_DAY' }, manager);
  }

  async remove(id: number): Promise<void> {
    const tx = await this.findOne(id);
    
    // Reverse the balance before deleting
    if (tx.companyAccountId) {
      const reverseType = tx.type === 'INCOME' ? 'EXPENSE' : 'INCOME';
      await this.companyAccountService.updateBalance(
        tx.companyAccountId,
        tx.amount,
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
}
