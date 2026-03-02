import { Order } from './order.entity';
import { Product } from '../products/product.entity';
export declare class OrderItem {
    id: number;
    order: Order;
    product: Product;
    quantity: number;
    unitPrice: number;
    note: string;
}
