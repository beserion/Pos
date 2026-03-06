import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StocksService } from '../stocks/stocks.service';
export declare class OrdersService {
    private orderRepository;
    private orderItemRepository;
    private recipesService;
    private stocksService;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, recipesService: RecipesService, stocksService: StocksService);
    findAll(): Promise<Order[]>;
    findKitchenOrders(): Promise<Order[]>;
    findOne(id: number): Promise<Order>;
    create(orderData: Partial<Order>): Promise<Order>;
    updateStatus(id: number, status: string): Promise<Order>;
    remove(id: number): Promise<void>;
    private deductStockForOrder;
}
