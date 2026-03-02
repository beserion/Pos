import { Location } from '../locations/location.entity';
export declare class Warehouse {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isActive: boolean;
    location: Location;
    createdAt: Date;
    updatedAt: Date;
}
