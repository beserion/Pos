import { ZonesService } from './zones.service';
import { Zone } from './zone.entity';
export declare class ZonesController {
    private readonly zonesService;
    constructor(zonesService: ZonesService);
    findAll(): Promise<Zone[]>;
    findOne(id: string): Promise<Zone>;
    create(zoneData: Partial<Zone>): Promise<Zone>;
    update(id: string, updateData: Partial<Zone>): Promise<Zone>;
    remove(id: string): Promise<void>;
}
