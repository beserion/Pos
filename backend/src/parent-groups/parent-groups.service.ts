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

  private categoriesCache: ParentGroup[] | null = null;

  async findAll(): Promise<ParentGroup[]> {
    if (this.categoriesCache) {
      return this.categoriesCache;
    }
    const data = await this.repository.find({ order: { orderIndex: 'ASC', name: 'ASC' } });
    this.categoriesCache = data;
    return data;
  }

  private clearCache() {
    this.categoriesCache = null;
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
    const saved = await this.repository.save(newGroup);
    this.clearCache();
    return saved;
  }

  async update(id: number, data: Partial<ParentGroup>): Promise<ParentGroup> {
    await this.findOne(id);
    await this.repository.update(id, data);
    this.clearCache();
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const group = await this.findOne(id);
    await this.repository.delete(id);
    this.clearCache();
  }

  async reorder(items: { id: number, orderIndex: number }[]): Promise<void> {
    if (!items || items.length === 0) return;
    for (const item of items) {
      await this.repository.update(item.id, { orderIndex: item.orderIndex });
    }
    this.clearCache();
  }
}
