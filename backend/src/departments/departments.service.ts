import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repository: Repository<Department>,
  ) {}

  findAll() {
    return this.repository.find({ 
      relations: ['location', 'parentGroup', 'extraDepartment', 'outputProfile'],
      order: { orderIndex: 'ASC', name: 'ASC' }
    });
  }

  findOne(id: number) {
    return this.repository.findOne({ where: { id }, relations: ['location', 'parentGroup', 'extraDepartment', 'outputProfile'] });
  }

  async create(data: Partial<Department>) {
    if (data.id) delete data.id;
    if (data.name) {
      const existing = await this.repository.findOne({ where: { name: data.name } });
      if (existing) throw new BadRequestException(`"${data.name}" isimli grup zaten mevcut.`);
    }
    const dep = this.repository.create(data);
    return this.repository.save(dep);
  }

  async update(id: number, data: Partial<Department>) {
    if (data.id) delete data.id;
    const dep = await this.findOne(id);
    if (!dep) throw new NotFoundException(`Department #${id} not found`);
    
    if (data.name && data.name !== dep.name) {
      const dup = await this.repository.findOne({ where: { name: data.name } });
      if (dup) throw new BadRequestException(`"${data.name}" isimli grup zaten mevcut.`);
    }

    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.repository.delete(id);
  }

  async reorder(items: { id: number, orderIndex: number }[]): Promise<void> {
    if (!items || items.length === 0) return;
    for (const item of items) {
      await this.repository.update(item.id, { orderIndex: item.orderIndex });
    }
  }
}
