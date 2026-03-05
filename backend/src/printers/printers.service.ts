import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer } from './printer.entity';

@Injectable()
export class PrintersService {
    constructor(
        @InjectRepository(Printer)
        private readonly printerRepository: Repository<Printer>,
    ) { }

    async findAll(): Promise<Printer[]> {
        return this.printerRepository.find();
    }

    async findOne(id: number): Promise<Printer> {
        const printer = await this.printerRepository.findOne({ where: { id } });
        if (!printer) {
            throw new NotFoundException(`Printer #${id} not found`);
        }
        return printer;
    }

    async create(createData: Partial<Printer>): Promise<Printer> {
        const printer = this.printerRepository.create(createData);
        return this.printerRepository.save(printer);
    }

    async update(id: number, updateData: Partial<Printer>): Promise<Printer> {
        await this.findOne(id);
        await this.printerRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const printer = await this.findOne(id);
        await this.printerRepository.remove(printer);
    }
}
