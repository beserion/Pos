import { Sale } from './sale.entity';
export declare class SaleItem {
    id: number;
    sale: Sale;
    productId: number;
    quantity: number;
    unitPrice: number;
    total: number;
}
