import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './table.entity';
import { Sale } from '../sales/sale.entity';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
  ) {}

  async findAll(): Promise<Table[]> {
    return await this.tableRepository.find({
      where: { isDeleted: false },
      relations: ['zone', 'zone.location'],
    });
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
    return await this.tableRepository.save(newTable);
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

    return await this.tableRepository.save(newTables);
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
  }
}
