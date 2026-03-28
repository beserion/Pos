import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from './product-type.entity';

@Injectable()
export class ProductTypesService {
  constructor(
    @InjectRepository(ProductType)
    private readonly repo: Repository<ProductType>,
  ) {}

  async findAll(): Promise<ProductType[]> {
    return this.repo.find({
      relations: ['outputProfile'],
    });
  }

  async findOne(id: number): Promise<ProductType> {
    const type = await this.repo.findOne({
      where: { id },
      relations: ['outputProfile'],
    });
    if (!type) {
      throw new NotFoundException(`ProductType #${id} not found`);
    }
    return type;
  }

  async create(data: Partial<ProductType>): Promise<ProductType> {
    if (data.id) delete data.id;
    const type = this.repo.create(data);
    return this.repo.save(type);
  }

  async update(id: number, data: Partial<ProductType>): Promise<ProductType> {
    if (data.id) delete data.id;
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const type = await this.findOne(id);
    await this.repo.remove(type);
  }
}
