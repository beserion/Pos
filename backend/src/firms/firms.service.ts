import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Firm } from './firm.entity';

@Injectable()
export class FirmsService {
  constructor(
    @InjectRepository(Firm)
    private readonly firmRepository: Repository<Firm>,
  ) {}

  findAll(): Promise<Firm[]> {
    return this.firmRepository.find();
  }

  async findOne(id: number): Promise<Firm> {
    const firm = await this.firmRepository.findOne({ where: { id } });
    if (!firm) {
      throw new NotFoundException(`Firm #${id} not found`);
    }
    return firm;
  }

  create(data: Partial<Firm>): Promise<Firm> {
    const firm = this.firmRepository.create(data);
    return this.firmRepository.save(firm);
  }

  async update(id: number, data: Partial<Firm>): Promise<Firm> {
    const firm = await this.findOne(id);
    Object.assign(firm, data);
    return this.firmRepository.save(firm);
  }

  async remove(id: number): Promise<void> {
    const firm = await this.findOne(id);
    await this.firmRepository.remove(firm);
  }
}
