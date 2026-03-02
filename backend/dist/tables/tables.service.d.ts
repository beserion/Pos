import { Repository } from 'typeorm';
import { Table } from './table.entity';
export declare class TablesService {
    private tableRepository;
    constructor(tableRepository: Repository<Table>);
    findAll(): Promise<Table[]>;
    findOne(id: number): Promise<Table>;
    create(tableData: Partial<Table>): Promise<Table>;
    update(id: number, updateData: Partial<Table>): Promise<Table>;
    remove(id: number): Promise<void>;
}
