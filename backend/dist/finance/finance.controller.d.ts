import { FinanceService } from './finance.service';
import { AccountTransaction } from './account-transaction.entity';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    getTransactions(): Promise<AccountTransaction[]>;
    getSummary(): Promise<{
        totalIncome: number;
        totalExpense: number;
        balance: number;
        kasa: number;
        banka: number;
        kart: number;
        count: number;
    }>;
    getTransaction(id: string): Promise<AccountTransaction>;
    createTransaction(data: Partial<AccountTransaction>): Promise<AccountTransaction>;
    updateTransaction(id: string, data: Partial<AccountTransaction>): Promise<AccountTransaction>;
    deleteTransaction(id: string): Promise<void>;
}
