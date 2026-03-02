import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
export declare class OrdersService {
    private orderRepository;
    private orderItemRepository;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>);
    findAll(): Promise<Order[]>;
    findKitchenOrders(): Promise<Order[]>;
    findOne(id: number): Promise<Order>;
    create(orderData: Partial<Order>): Promise<Order>;
    updateStatus(id: number, status: string): Promise<Order>;
    remove(id: number): Promise<void>;
}
