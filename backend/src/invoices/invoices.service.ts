import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepository: Repository<Invoice>,
    ) { }

    async findAll(): Promise<Invoice[]> {
        return await this.invoiceRepository.find();
    }

    async findOne(id: number): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({ where: { id } });
        if (!invoice) {
            throw new NotFoundException(`Invoice with ID ${id} not found`);
        }
        return invoice;
    }

    async create(invoiceData: Partial<Invoice>): Promise<Invoice> {
        const newInvoice = this.invoiceRepository.create(invoiceData);
        return await this.invoiceRepository.save(newInvoice);
    }

    async update(id: number, updateData: Partial<Invoice>): Promise<Invoice> {
        await this.findOne(id);
        await this.invoiceRepository.update(id, updateData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.invoiceRepository.delete(id);
    }

    async findByPartner(partnerId: number): Promise<Invoice[]> {
        return await this.invoiceRepository.find({
            where: { customerId: partnerId },
            order: { createdAt: 'DESC' }
        });
    }
}
