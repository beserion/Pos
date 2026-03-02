import { LocationsService } from './locations.service';
import { Location } from './location.entity';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    findAll(): Promise<Location[]>;
    findOne(id: string): Promise<Location>;
    create(locationData: Partial<Location>): Promise<Location>;
    update(id: string, updateData: Partial<Location>): Promise<Location>;
    remove(id: string): Promise<void>;
}
