import { Zone } from '../zones/zone.entity';
export declare class Table {
    id: number;
    name: string;
    capacity: number;
    status: string;
    zone: Zone;
    isActive: boolean;
    waiterName: string;
    orderStartTime: Date;
    createdAt: Date;
    updatedAt: Date;
}
