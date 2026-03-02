import { Zone } from '../zones/zone.entity';
export declare class Table {
    id: number;
    name: string;
    capacity: number;
    status: string;
    zone: Zone;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
