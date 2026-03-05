import { Stock } from '../stocks/stock.entity';
import { Printer } from '../printers/printer.entity';
export declare class Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    category: string;
    isActive: boolean;
    printerId: number;
    printer: Printer;
    stocks: Stock[];
    createdAt: Date;
    updatedAt: Date;
}
