import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParentGroup } from './parent-group.entity';

@Injectable()
export class ParentGroupsService {
  constructor(
    @InjectRepository(ParentGroup)
    private readonly repository: Repository<ParentGroup>,
  ) {}

  async findAll(): Promise<ParentGroup[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<ParentGroup> {
    const group = await this.repository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`Üst grup bulunamadı (ID: ${id})`);
    }
    return group;
  }

  async create(data: Partial<ParentGroup>): Promise<ParentGroup> {
    const newGroup = this.repository.create(data);
    return this.repository.save(newGroup);
  }

  async update(id: number, data: Partial<ParentGroup>): Promise<ParentGroup> {
    await this.findOne(id);
    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const group = await this.findOne(id);
    await this.repository.delete(id);
  }
}
