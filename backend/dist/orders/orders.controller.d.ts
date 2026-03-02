import { OrdersService } from './orders.service';
import { Order } from './order.entity';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findAll(): Promise<Order[]>;
    findKitchenOrders(): Promise<Order[]>;
    findOne(id: number): Promise<Order>;
    create(orderData: Partial<Order>): Promise<Order>;
    updateStatus(id: number, status: string): Promise<Order>;
    remove(id: number): Promise<void>;
}
