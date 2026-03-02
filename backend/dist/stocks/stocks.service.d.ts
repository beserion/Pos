import { Repository } from 'typeorm';
import { Stock } from './stock.entity';
export declare class StocksService {
    private stockRepository;
    constructor(stockRepository: Repository<Stock>);
    findAll(): Promise<Stock[]>;
    findOne(id: number): Promise<Stock>;
    create(stockData: Partial<Stock>): Promise<Stock>;
    update(id: number, updateData: Partial<Stock>): Promise<Stock>;
    remove(id: number): Promise<void>;
}
