import { Repository } from 'typeorm';
import { Stock } from './stock.entity';
import { Product } from '../products/product.entity';
export declare class StocksService {
    private stockRepository;
    private productRepository;
    constructor(stockRepository: Repository<Stock>, productRepository: Repository<Product>);
    findAll(): Promise<Stock[]>;
    findOne(id: number): Promise<Stock>;
    create(stockData: Partial<Stock>): Promise<Stock>;
    update(id: number, updateData: Partial<Stock>): Promise<Stock>;
    remove(id: number): Promise<void>;
    deductStock(productId: number, quantity: number, location?: string): Promise<void>;
    addStock(productId: number, quantity: number, location?: string): Promise<void>;
    checkLowStock(): Promise<{
        productId: number;
        productName: string;
        currentStock: number;
        minStockLevel: number;
        costPrice: number;
        unit: string;
    }[]>;
}
