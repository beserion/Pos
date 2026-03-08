import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './partner.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  async findAll(type?: string): Promise<Partner[]> {
    if (type) {
      return await this.partnerRepository.find({ where: { type } });
    }
    return await this.partnerRepository.find();
  }

  async findOne(id: number): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async create(partnerData: Partial<Partner>): Promise<Partner> {
    const newPartner = this.partnerRepository.create(partnerData);
    return await this.partnerRepository.save(newPartner);
  }

  async update(id: number, updateData: Partial<Partner>): Promise<Partner> {
    await this.findOne(id);
    await this.partnerRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.partnerRepository.delete(id);
  }
}
