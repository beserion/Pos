import { Repository } from 'typeorm';
import { Location } from './location.entity';
export declare class LocationsService {
    private locationRepository;
    constructor(locationRepository: Repository<Location>);
    findAll(): Promise<Location[]>;
    findOne(id: number): Promise<Location>;
    create(locationData: Partial<Location>): Promise<Location>;
    update(id: number, updateData: Partial<Location>): Promise<Location>;
    remove(id: number): Promise<void>;
}
