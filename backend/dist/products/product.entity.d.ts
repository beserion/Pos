import { Stock } from '../stocks/stock.entity';
export declare class Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    category: string;
    isActive: boolean;
    stocks: Stock[];
    createdAt: Date;
    updatedAt: Date;
}
