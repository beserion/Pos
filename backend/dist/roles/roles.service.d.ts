import { Repository } from 'typeorm';
import { Role } from './role.entity';
export declare class RolesService {
    private roleRepository;
    constructor(roleRepository: Repository<Role>);
    findAll(): Promise<Role[]>;
    findOne(id: number): Promise<Role>;
    create(roleData: Partial<Role>): Promise<Role>;
    update(id: number, updateData: Partial<Role>): Promise<Role>;
    remove(id: number): Promise<void>;
}
