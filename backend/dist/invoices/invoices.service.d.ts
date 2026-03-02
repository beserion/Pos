import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
export declare class InvoicesService {
    private invoiceRepository;
    constructor(invoiceRepository: Repository<Invoice>);
    findAll(): Promise<Invoice[]>;
    findOne(id: number): Promise<Invoice>;
    create(invoiceData: Partial<Invoice>): Promise<Invoice>;
    update(id: number, updateData: Partial<Invoice>): Promise<Invoice>;
    remove(id: number): Promise<void>;
}
