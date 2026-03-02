import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountTransaction } from './account-transaction.entity';

@Injectable()
export class FinanceService {
    constructor(
        @InjectRepository(AccountTransaction)
        private transactionRepository: Repository<AccountTransaction>,
    ) { }

    async findAll(): Promise<AccountTransaction[]> {
        return await this.transactionRepository.find({ relations: ['user'], order: { createdAt: 'DESC' } });
    }

    async findOne(id: number): Promise<AccountTransaction> {
        const tx = await this.transactionRepository.findOne({ where: { id }, relations: ['user'] });
        if (!tx) throw new NotFoundException(`Transaction with ID ${id} not found`);
        return tx;
    }

    async create(data: Partial<AccountTransaction>): Promise<AccountTransaction> {
        const transaction = this.transactionRepository.create(data);
        return await this.transactionRepository.save(transaction);
    }

    async update(id: number, data: Partial<AccountTransaction>): Promise<AccountTransaction> {
        await this.findOne(id);
        await this.transactionRepository.update(id, data);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.transactionRepository.delete(id);
    }

    async getSummary() {
        const transactions = await this.transactionRepository.find();
        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const kasa = transactions.filter(t => t.paymentMethod === 'KASA').reduce((s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);
        const banka = transactions.filter(t => t.paymentMethod === 'BANKA').reduce((s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);
        const kart = transactions.filter(t => t.paymentMethod === 'KREDI_KARTI').reduce((s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);

        return {
            totalIncome: income,
            totalExpense: expense,
            balance: income - expense,
            kasa, banka, kart,
            count: transactions.length
        };
    }

    async findByPartner(partnerId: number): Promise<AccountTransaction[]> {
        return await this.transactionRepository.find({
            where: { partnerId },
            order: { createdAt: 'DESC' }
        });
    }
}
