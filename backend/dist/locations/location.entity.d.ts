import { Zone } from '../zones/zone.entity';
import { Employee } from '../employees/employee.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
export declare class Location {
    id: number;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    zones: Zone[];
    employees: Employee[];
    warehouses: Warehouse[];
    createdAt: Date;
    updatedAt: Date;
}
