import { SaleItem } from './sale-item.entity';
export declare class Sale {
    id: number;
    customerId: number;
    userId: number;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    items: SaleItem[];
    createdAt: Date;
    updatedAt: Date;
}
