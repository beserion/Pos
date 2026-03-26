import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutputProfile } from './output-profile.entity';

@Injectable()
export class OutputProfilesService {
  constructor(
    @InjectRepository(OutputProfile)
    private readonly repo: Repository<OutputProfile>,
  ) {}

  async findAll(): Promise<OutputProfile[]> {
    return this.repo.find({
      relations: ['mainPrinter', 'infoPrinter'],
    });
  }

  async findOne(id: number): Promise<OutputProfile> {
    const profile = await this.repo.findOne({
      where: { id },
      relations: ['mainPrinter', 'infoPrinter'],
    });
    if (!profile) {
      throw new NotFoundException(`OutputProfile #${id} not found`);
    }
    return profile;
  }

  async create(data: Partial<OutputProfile>): Promise<OutputProfile> {
    if (data.mainPrinterId === 0 || (data.mainPrinterId as any) === '') data.mainPrinterId = null as any;
    if (data.infoPrinterId === 0 || (data.infoPrinterId as any) === '') data.infoPrinterId = null as any;
    
    // SQL Server'da identity column hatası almamak için
    if (data.id) delete data.id;

    const profile = this.repo.create(data);
    return this.repo.save(profile);
  }

  async update(id: number, data: Partial<OutputProfile>): Promise<OutputProfile> {
    if (data.mainPrinterId === 0 || (data.mainPrinterId as any) === '') data.mainPrinterId = null as any;
    if (data.infoPrinterId === 0 || (data.infoPrinterId as any) === '') data.infoPrinterId = null as any;

    // SQL Server'da identity column hatası almamak için
    if (data.id) delete data.id;

    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const profile = await this.findOne(id);
    await this.repo.remove(profile);
  }
}
