import { PartnersService } from './partners.service';
import { Partner } from './partner.entity';
export declare class PartnersController {
    private readonly partnersService;
    constructor(partnersService: PartnersService);
    findAll(type?: string): Promise<Partner[]>;
    findOne(id: string): Promise<Partner>;
    create(partnerData: Partial<Partner>): Promise<Partner>;
    update(id: string, updateData: Partial<Partner>): Promise<Partner>;
    remove(id: string): Promise<void>;
}
