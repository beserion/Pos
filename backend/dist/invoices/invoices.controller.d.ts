import { InvoicesService } from './invoices.service';
import { Invoice } from './invoice.entity';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    findAll(): Promise<Invoice[]>;
    findOne(id: string): Promise<Invoice>;
    create(invoiceData: Partial<Invoice>): Promise<Invoice>;
    update(id: string, updateData: Partial<Invoice>): Promise<Invoice>;
    remove(id: string): Promise<void>;
}
