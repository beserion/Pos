import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './table.entity';
import { UsersService } from '../users/users.service';
import { getCachedPerms } from '../auth/permissions.guard';
import { Sale } from '../sales/sale.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) {}

  private tablesCache: Table[] | null = null;

  async findAll(userId?: number): Promise<Table[]> {
    let allTables: Table[];
    
    if (this.tablesCache) {
        allTables = this.tablesCache;
    } else {
        allTables = await this.tableRepository.find({
            where: { isDeleted: false },
            relations: ['zone', 'zone.location'],
        });
        this.tablesCache = allTables;
    }

    let allowedZoneIds: number[] | 'ALL' = 'ALL';

    if (userId) {
      let roleName: string | undefined;
      let extraPerms: string[] = [];

      const cached = getCachedPerms(userId);
      if (cached) {
        roleName = cached.roleName;
        extraPerms = cached.allUserPerms;
      } else {
        const user = await this.usersService.findOne(userId);
        roleName = user?.role?.name?.toUpperCase();
        extraPerms = user?.extraPermissions || [];
      }

      if (roleName !== 'ADMIN' && roleName !== 'ADMINISTRATOR') {
        allowedZoneIds = extraPerms
          .filter(p => p.startsWith('ZONE:'))
          .map(p => parseInt(p.split(':')[1]))
          .filter(id => !isNaN(id));
      }
    }

    if (allowedZoneIds === 'ALL') {
      return allTables;
    }

    if (allowedZoneIds.length === 0) {
      return []; // Return empty array if not authorized for any zone
    }

    return allTables.filter(t => (allowedZoneIds as number[]).includes(t.zone?.id));
  }

  public clearCache() {
    this.tablesCache = null;
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['zone', 'zone.location'],
    });
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }
    return table;
  }

  async create(tableData: Partial<Table>): Promise<Table> {
    if (tableData.name) {
      const existing = await this.tableRepository.findOne({
        where: { name: tableData.name, isDeleted: false },
      });
      // SQL Server (MSSQL) is usually case-insensitive, so we check for exact case match in code
      if (existing && existing.name === tableData.name) {
        throw new BadRequestException('Bu isimde bir masa zaten mevcut.');
      }
    }
    const newTable = this.tableRepository.create(tableData);
    const saved = await this.tableRepository.save(newTable);
    this.clearCache();
    return saved;
  }

  async update(id: number, updateData: Partial<Table>): Promise<Table> {
    const table = await this.findOne(id); // Check existence
    
    if (updateData.isActive === false && table.status !== 'BOŞ') {
      throw new BadRequestException('Masa dolu durumdayken pasife alınamaz.');
    }

    if (updateData.name) {
      const existing = await this.tableRepository.findOne({
        where: { name: updateData.name, isDeleted: false },
      });
      if (existing && existing.id !== id && existing.name === updateData.name) {
        throw new BadRequestException('Bu isimde bir masa zaten mevcut.');
      }
    }

    await this.tableRepository.update(id, updateData);
    this.clearCache();
    return this.findOne(id);
  }

  async bulkCreate(data: { zoneId: number, count: number, prefix: string, capacity: number }): Promise<Table[]> {
    const { zoneId, count, prefix, capacity } = data;
    const newTables: Table[] = [];
    let i = 1;
    let createdCount = 0;

    while (createdCount < count) {
      const name = `${prefix} ${i}`;
      
      const existing = await this.tableRepository.findOne({
        where: { name, isDeleted: false }
      });

      if (!existing) {
        const table = this.tableRepository.create({
          name,
          capacity,
          status: 'BOŞ',
          isActive: true,
          zone: { id: zoneId } as any,
          isDeleted: false
        });
        newTables.push(table);
        createdCount++;
      }
      i++;
      
      // Safety break to prevent infinite loop
      if (i > 1000) break;
    }

    const saved = await this.tableRepository.save(newTables);
    this.clearCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const table = await this.findOne(id);
    
    if (table.status !== 'BOŞ') {
      throw new BadRequestException('Masa boş durumdayken silinebilir.');
    }

    const saleCount = await this.saleRepository.count({ where: { tableId: id } });
    if (saleCount > 0) {
      throw new BadRequestException('Bu masaya ait işlem bulunduğu için silinemez.');
    }

    await this.tableRepository.update(id, { isDeleted: true });
    this.clearCache();
  }
}
