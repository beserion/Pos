import { OrderItem } from './order-item.entity';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
export declare class Order {
    id: number;
    status: string;
    totalAmount: number;
    table: Table;
    waiter: User;
    items: OrderItem[];
    note: string;
    createdAt: Date;
    updatedAt: Date;
}
