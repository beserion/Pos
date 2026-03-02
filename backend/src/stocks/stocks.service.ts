import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from './stock.entity';

@Injectable()
export class StocksService {
    constructor(
        @InjectRepository(Stock)
        private stockRepository: Repository<Stock>,
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
}
