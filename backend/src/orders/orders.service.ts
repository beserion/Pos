import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StocksService } from '../stocks/stocks.service';
import { Table } from '../tables/table.entity';
import { User } from '../users/user.entity';
import { KitchenGateway } from './kitchen.gateway';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,
        private recipesService: RecipesService,
        private stocksService: StocksService,
        private kitchenGateway: KitchenGateway,
    ) { }

    async findAll(): Promise<Order[]> {
        return await this.orderRepository.find({
            relations: ['items', 'items.product', 'table', 'waiter'],
            order: { createdAt: 'DESC' }
        });
    }

    async findKitchenOrders(): Promise<Order[]> {
        return await this.orderRepository.find({
            where: { status: In(['NEW', 'IN_PREPARATION']) },
            relations: ['items', 'items.product', 'table'],
            order: { createdAt: 'ASC' }
        });
    }

    async findOne(id: number): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['items', 'items.product', 'table', 'waiter']
        });
        if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
        return order;
    }

    async create(orderData: Partial<Order>): Promise<Order> {
        try {
            console.log('Creating order with data:', JSON.stringify(orderData));
            const { items, ...data } = orderData;

            // 1. Save the order first
            const newOrder = this.orderRepository.create(data);
            const savedOrder = await this.orderRepository.save(newOrder);

            // 2. Save items if present
            if (items && items.length > 0) {
                for (const item of items) {
                    const orderItem = this.orderItemRepository.create({
                        product: item.product,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice || (item as any).price,
                        note: item.note,
                        order: savedOrder
                    });
                    await this.orderItemRepository.save(orderItem);
                }
            }

            // 3. Update table status if it's linked
            const tableId = orderData.table?.id || (orderData.table as any);
            if (tableId) {
                const table = await this.orderRepository.manager.findOne(Table, {
                    where: { id: tableId }
                });

                if (table) {
                    const waiterId = (orderData.waiter as any).id || (orderData.waiter as any).sub || orderData.waiter;
                    console.log('Looking up waiter with ID:', waiterId);
                    const waiter = await this.orderRepository.manager.findOne(User, {
                        where: { id: waiterId }
                    });

                    // For a new order, we update the table
                    await this.orderRepository.manager.update(Table, tableId, {
                        status: 'DOLU',
                        waiterName: waiter ? `${waiter.firstName} ${waiter.lastName}` : 'Sistem',
                        orderStartTime: table.status === 'BOŞ' ? new Date() : table.orderStartTime,
                        currentTotal: Number(table.currentTotal || 0) + Number(savedOrder.totalAmount)
                    });
                }
            }

            // 4. Auto-deduct stock based on recipes
            await this.deductStockForOrder(savedOrder);

            const fullOrderConfig = await this.findOne(savedOrder.id);
            this.kitchenGateway.notifyNewOrder(fullOrderConfig);

            return fullOrderConfig;
        } catch (error: any) {
            console.error('ORDER CREATE ERROR:', error.message);
            if (error.query) console.error('SQL QUERY:', error.query);
            if (error.parameters) console.error('SQL PARAMS:', error.parameters);
            throw error;
        }
    }

    async updateStatus(id: number, status: string): Promise<Order> {
        const order = await this.findOne(id);
        order.status = status;
        const updatedOrder = await this.orderRepository.save(order);

        if (status === 'READY') {
            this.kitchenGateway.notifyOrderReady(updatedOrder);
        }

        return updatedOrder;
    }

    async remove(id: number): Promise<void> {
        const order = await this.findOne(id);
        await this.orderRepository.remove(order);
    }

    /**
     * For each item in the order, look up its recipe and deduct ingredient stocks.
     * If a product has no recipe, deduct the product itself from stock.
     */
    private async deductStockForOrder(order: Order): Promise<void> {
        const fullOrder = await this.findOne(order.id);

        for (const item of fullOrder.items) {
            const productId = item.product?.id;
            if (!productId) continue;

            const recipes = await this.recipesService.findByProduct(productId);

            if (recipes.length > 0) {
                // Product has a recipe — deduct ingredients
                for (const recipe of recipes) {
                    const deductQty = Number(recipe.quantity) * Number(item.quantity);
                    await this.stocksService.deductStock(recipe.ingredientId, deductQty);
                }
            } else {
                // No recipe — deduct the product itself
                await this.stocksService.deductStock(productId, Number(item.quantity));
            }
        }
    }
}

