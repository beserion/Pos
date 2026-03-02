import { WarehousesService } from './warehouses.service';
import { Warehouse } from './warehouse.entity';
export declare class WarehousesController {
    private readonly warehousesService;
    constructor(warehousesService: WarehousesService);
    findAll(): Promise<Warehouse[]>;
    findOne(id: string): Promise<Warehouse>;
    create(warehouseData: Partial<Warehouse>): Promise<Warehouse>;
    update(id: string, updateData: Partial<Warehouse>): Promise<Warehouse>;
    remove(id: string): Promise<void>;
}
