import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Stock } from './stock.entity';
import { Product } from '../products/product.entity';

@Injectable()
export class StocksService {
    constructor(
        @InjectRepository(Stock)
        private stockRepository: Repository<Stock>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
    ) { }

    async findAll(): Promise<Stock[]> {
        return await this.stockRepository.find({ relations: ['product'] });
    }

    async findOne(id: number): Promise<Stock> {
        const stock = await this.stockRepository.findOne({ where: { id }, relations: ['product'] });
        if (!stock) {
            throw new NotFoundException(`Stock with ID ${id} not found`);
        }
        return stock;
    }

    async create(stockData: Partial<Stock>): Promise<Stock> {
        const newStock = this.stockRepository.create(stockData);
        return await this.stockRepository.save(newStock);
    }

    async update(id: number, updateData: Partial<Stock>): Promise<Stock> {
        await this.findOne(id);
        await this.stockRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.stockRepository.delete(id);
    }

    /**
     * Deduct stock quantity for a given product. Finds the first available stock record and reduces it.
     */
    async deductStock(productId: number, quantity: number, location?: string): Promise<void> {
        const where: any = { product: { id: productId } };
        if (location) where.location = location;

        const stocks = await this.stockRepository.find({
            where,
            order: { quantity: 'DESC' },
        });

        if (stocks.length === 0) {
            // No stock record found — create one with negative value as a warning
            const newStock = this.stockRepository.create({
                product: { id: productId } as Product,
                quantity: -quantity,
                location: location || 'default',
            });
            await this.stockRepository.save(newStock);
            return;
        }

        let remaining = quantity;
        for (const stock of stocks) {
            if (remaining <= 0) break;

            const available = Number(stock.quantity);
            const deduct = Math.min(available, remaining);
            stock.quantity = available - deduct;
            remaining -= deduct;
            await this.stockRepository.save(stock);
        }

        // If there's still remaining, deduct from the first stock (can go negative)
        if (remaining > 0) {
            stocks[0].quantity = Number(stocks[0].quantity) - remaining;
            await this.stockRepository.save(stocks[0]);
        }
    }

    /**
     * Add stock quantity for a given product (e.g., when receiving a purchase order).
     */
    async addStock(productId: number, quantity: number, location?: string): Promise<void> {
        const where: any = { product: { id: productId } };
        if (location) where.location = location;

        const stock = await this.stockRepository.findOne({ where });

        if (stock) {
            stock.quantity = Number(stock.quantity) + quantity;
            await this.stockRepository.save(stock);
        } else {
            const newStock = this.stockRepository.create({
                product: { id: productId } as Product,
                quantity,
                location: location || 'default',
            });
            await this.stockRepository.save(newStock);
        }
    }

    /**
     * Check for products whose total stock is below their minStockLevel.
     */
    async checkLowStock(): Promise<{
        productId: number;
        productName: string;
        currentStock: number;
        minStockLevel: number;
        costPrice: number;
        unit: string;
    }[]> {
        const products = await this.productRepository.find({
            where: { isActive: true },
            relations: ['stocks'],
        });

        const lowStockItems: {
            productId: number;
            productName: string;
            currentStock: number;
            minStockLevel: number;
            costPrice: number;
            unit: string;
        }[] = [];

        for (const product of products) {
            const minLevel = Number(product.minStockLevel || 0);
            if (minLevel <= 0) continue; // Skip products without minStockLevel set

            const totalStock = (product.stocks || []).reduce(
                (sum, s) => sum + Number(s.quantity),
                0,
            );

            if (totalStock < minLevel) {
                lowStockItems.push({
                    productId: product.id,
                    productName: product.name,
                    currentStock: totalStock,
                    minStockLevel: minLevel,
                    costPrice: Number(product.costPrice || 0),
                    unit: product.unit || 'adet',
                });
            }
        }

        return lowStockItems;
    }
}

