import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';

@Injectable()
export class ZonesService {
    constructor(
        @InjectRepository(Zone)
        private zoneRepository: Repository<Zone>,
    ) { }

    async findAll(): Promise<Zone[]> {
        return await this.zoneRepository.find({ relations: ['location', 'tables'] });
    }

    async findOne(id: number): Promise<Zone> {
        const zone = await this.zoneRepository.findOne({ where: { id }, relations: ['location', 'tables'] });
        if (!zone) {
            throw new NotFoundException(`Zone with ID ${id} not found`);
        }
        return zone;
    }

    async create(zoneData: Partial<Zone>): Promise<Zone> {
        const newZone = this.zoneRepository.create(zoneData);
        return await this.zoneRepository.save(newZone);
    }

    async update(id: number, updateData: Partial<Zone>): Promise<Zone> {
        const zone = await this.findOne(id);
        const { id: _, location, tables, ...data } = updateData as any;
        this.zoneRepository.merge(zone, data);
        return await this.zoneRepository.save(zone);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.zoneRepository.delete(id);
    }
}
