import { Location } from '../locations/location.entity';
import { Table } from '../tables/table.entity';
export declare class Zone {
    id: number;
    name: string;
    description: string;
    location: Location;
    tables: Table[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
