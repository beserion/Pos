import { StocksService } from './stocks.service';
import { Stock } from './stock.entity';
export declare class StocksController {
    private readonly stocksService;
    constructor(stocksService: StocksService);
    findAll(): Promise<Stock[]>;
    findOne(id: string): Promise<Stock>;
    create(stockData: Partial<Stock>): Promise<Stock>;
    update(id: string, updateData: Partial<Stock>): Promise<Stock>;
    remove(id: string): Promise<void>;
}
