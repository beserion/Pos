import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { RecipesService } from '../recipes/recipes.service';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,
        private recipesService: RecipesService,
        private stocksService: StocksService,
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
        const newOrder = this.orderRepository.create(orderData);
        const savedOrder = await this.orderRepository.save(newOrder);

        // Update table status if it's linked
        if (orderData.table && orderData.table.id) {
            const tableId = orderData.table.id;
            const table = await this.orderRepository.manager.findOne('Table', {
                where: { id: tableId },
                relations: ['waiterName']
            } as any);

            if (table && table.status === 'BOŞ') {
                const waiter = await this.orderRepository.manager.findOne('User', {
                    where: { id: (orderData.waiter as any).id }
                } as any);

                await this.orderRepository.manager.update('Table', tableId, {
                    status: 'DOLU',
                    waiterName: waiter ? `${waiter.firstName} ${waiter.lastName}` : 'Sistem',
                    orderStartTime: new Date()
                });
            }
        }

        // Auto-deduct stock based on recipes
        await this.deductStockForOrder(savedOrder);

        return savedOrder;
    }

    async updateStatus(id: number, status: string): Promise<Order> {
        const order = await this.findOne(id);
        order.status = status;
        return await this.orderRepository.save(order);
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

