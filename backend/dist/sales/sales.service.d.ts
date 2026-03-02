import { Repository } from 'typeorm';
import { Sale } from './sale.entity';
export declare class SalesService {
    private saleRepository;
    constructor(saleRepository: Repository<Sale>);
    findAll(): Promise<Sale[]>;
    findOne(id: number): Promise<Sale>;
    create(saleData: Partial<Sale>): Promise<Sale>;
    update(id: number, updateData: Partial<Sale>): Promise<Sale>;
    remove(id: number): Promise<void>;
}
