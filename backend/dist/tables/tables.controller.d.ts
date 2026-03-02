import { TablesService } from './tables.service';
import { Table } from './table.entity';
export declare class TablesController {
    private readonly tablesService;
    constructor(tablesService: TablesService);
    findAll(): Promise<Table[]>;
    findOne(id: string): Promise<Table>;
    create(tableData: Partial<Table>): Promise<Table>;
    update(id: string, updateData: Partial<Table>): Promise<Table>;
    remove(id: string): Promise<void>;
}
