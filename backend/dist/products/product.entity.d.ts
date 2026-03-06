import { Stock } from '../stocks/stock.entity';
import { Printer } from '../printers/printer.entity';
import { Recipe } from '../recipes/recipe.entity';
export declare class Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    category: string;
    isActive: boolean;
    printerId: number;
    costPrice: number;
    minStockLevel: number;
    unit: string;
    printer: Printer;
    stocks: Stock[];
    recipes: Recipe[];
    createdAt: Date;
    updatedAt: Date;
}
