import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Injectable()
export class WarehousesService {
    constructor(
        @InjectRepository(Warehouse)
        private warehouseRepository: Repository<Warehouse>,
    ) { }

    async findAll(): Promise<Warehouse[]> {
        return await this.warehouseRepository.find({ relations: ['location'] });
    }

    async findOne(id: number): Promise<Warehouse> {
        const warehouse = await this.warehouseRepository.findOne({ where: { id }, relations: ['location'] });
        if (!warehouse) {
            throw new NotFoundException(`Warehouse with ID ${id} not found`);
        }
        return warehouse;
    }

    async create(warehouseData: Partial<Warehouse>): Promise<Warehouse> {
        const newWarehouse = this.warehouseRepository.create(warehouseData);
        return await this.warehouseRepository.save(newWarehouse);
    }

    async update(id: number, updateData: Partial<Warehouse>): Promise<Warehouse> {
        const warehouse = await this.findOne(id);
        Object.assign(warehouse, updateData);
        return await this.warehouseRepository.save(warehouse);
    }

    async remove(id: number): Promise<void> {
        const warehouse = await this.findOne(id);
        await this.warehouseRepository.remove(warehouse);
    }
}
