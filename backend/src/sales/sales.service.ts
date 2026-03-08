import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
  ) {}

  async findAll(): Promise<Sale[]> {
    return await this.saleRepository.find({ relations: ['items'] });
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  async create(saleData: Partial<Sale>): Promise<Sale> {
    const newSale = this.saleRepository.create(saleData);
    return await this.saleRepository.save(newSale);
  }

  async update(id: number, updateData: Partial<Sale>): Promise<Sale> {
    await this.findOne(id);
    await this.saleRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.saleRepository.delete(id);
  }
}
