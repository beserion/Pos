import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
export declare class ZonesService {
    private zoneRepository;
    constructor(zoneRepository: Repository<Zone>);
    findAll(): Promise<Zone[]>;
    findOne(id: number): Promise<Zone>;
    create(zoneData: Partial<Zone>): Promise<Zone>;
    update(id: number, updateData: Partial<Zone>): Promise<Zone>;
    remove(id: number): Promise<void>;
}
