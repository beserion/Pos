import { SalesService } from './sales.service';
import { Sale } from './sale.entity';
export declare class SalesController {
    private readonly salesService;
    constructor(salesService: SalesService);
    findAll(): Promise<Sale[]>;
    findOne(id: string): Promise<Sale>;
    create(saleData: Partial<Sale>): Promise<Sale>;
    update(id: string, updateData: Partial<Sale>): Promise<Sale>;
    remove(id: string): Promise<void>;
}
