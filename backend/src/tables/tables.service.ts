import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './table.entity';

@Injectable()
export class TablesService {
    constructor(
        @InjectRepository(Table)
        private tableRepository: Repository<Table>,
    ) { }

    async findAll(): Promise<Table[]> {
        return await this.tableRepository.find({ relations: ['zone', 'zone.location'] });
    }

    async findOne(id: number): Promise<Table> {
        const table = await this.tableRepository.findOne({ where: { id }, relations: ['zone', 'zone.location'] });
        if (!table) {
            throw new NotFoundException(`Table with ID ${id} not found`);
        }
        return table;
    }

    async create(tableData: Partial<Table>): Promise<Table> {
        const newTable = this.tableRepository.create(tableData);
        return await this.tableRepository.save(newTable);
    }

    async update(id: number, updateData: Partial<Table>): Promise<Table> {
        await this.findOne(id); // Check existence
        await this.tableRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.tableRepository.delete(id);
    }
}
