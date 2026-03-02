import { Product } from '../products/product.entity';
export declare class Stock {
    id: number;
    location: string;
    quantity: number;
    product: Product;
    lotNumber: string;
    expirationDate: Date;
    createdAt: Date;
    updatedAt: Date;
}
