import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
export declare class WarehousesService {
    private warehouseRepository;
    constructor(warehouseRepository: Repository<Warehouse>);
    findAll(): Promise<Warehouse[]>;
    findOne(id: number): Promise<Warehouse>;
    create(warehouseData: Partial<Warehouse>): Promise<Warehouse>;
    update(id: number, updateData: Partial<Warehouse>): Promise<Warehouse>;
    remove(id: number): Promise<void>;
}
