import { Repository } from 'typeorm';
import { AccountTransaction } from './account-transaction.entity';
export declare class FinanceService {
    private transactionRepository;
    constructor(transactionRepository: Repository<AccountTransaction>);
    findAll(): Promise<AccountTransaction[]>;
    findOne(id: number): Promise<AccountTransaction>;
    create(data: Partial<AccountTransaction>): Promise<AccountTransaction>;
    update(id: number, data: Partial<AccountTransaction>): Promise<AccountTransaction>;
    remove(id: number): Promise<void>;
    getSummary(): Promise<{
        totalIncome: number;
        totalExpense: number;
        balance: number;
        kasa: number;
        banka: number;
        kart: number;
        count: number;
    }>;
}
