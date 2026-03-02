import { Repository } from 'typeorm';
import { Partner } from './partner.entity';
export declare class PartnersService {
    private partnerRepository;
    constructor(partnerRepository: Repository<Partner>);
    findAll(type?: string): Promise<Partner[]>;
    findOne(id: number): Promise<Partner>;
    create(partnerData: Partial<Partner>): Promise<Partner>;
    update(id: number, updateData: Partial<Partner>): Promise<Partner>;
    remove(id: number): Promise<void>;
}
