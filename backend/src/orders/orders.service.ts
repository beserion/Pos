import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,
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
        return await this.orderRepository.save(newOrder);
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
}
