import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockGroup } from './stock-group.entity';
import { StockCard } from '../stock-cards/stock-card.entity';

@Injectable()
export class StockGroupsService {
  constructor(
    @InjectRepository(StockGroup)
    private stockGroupRepository: Repository<StockGroup>,
    @InjectRepository(StockCard)
    private stockCardRepository: Repository<StockCard>,
  ) {}

  async findAll(): Promise<StockGroup[]> {
    return this.stockGroupRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<StockGroup> {
    const group = await this.stockGroupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException(`StockGroup with ID ${id} not found`);
    }
    return group;
  }

  async create(data: Partial<StockGroup>): Promise<StockGroup> {
    if (data.name) {
      const existing = await this.stockGroupRepository.findOne({ where: { name: data.name } });
      if (existing) throw new BadRequestException(`"${data.name}" isimli stok grubu zaten mevcut.`);
    }
    const newGroup = this.stockGroupRepository.create(data);
    return this.stockGroupRepository.save(newGroup);
  }

  async update(id: number, data: Partial<StockGroup>): Promise<StockGroup> {
    const group = await this.findOne(id);
    if (data.name && data.name !== group.name) {
      const dup = await this.stockGroupRepository.findOne({ where: { name: data.name } });
      if (dup) throw new BadRequestException(`"${data.name}" isimli stok grubu zaten mevcut.`);
    }
    await this.stockGroupRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const group = await this.findOne(id);
    const count = await this.stockCardRepository.count({ where: { stockGroupId: id } });
    if (count > 0) {
      throw new BadRequestException('Bu gruba bağlı hareketler olduğu için silemezsiniz!');
    }
    await this.stockGroupRepository.delete(id);
  }
}
