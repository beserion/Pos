import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';

@Injectable()
export class LocationsService {
    constructor(
        @InjectRepository(Location)
        private locationRepository: Repository<Location>,
    ) { }

    async findAll(): Promise<Location[]> {
        return await this.locationRepository.find({ relations: ['zones', 'employees'] });
    }

    async findOne(id: number): Promise<Location> {
        const location = await this.locationRepository.findOne({ where: { id }, relations: ['zones', 'employees'] });
        if (!location) {
            throw new NotFoundException(`Location with ID ${id} not found`);
        }
        return location;
    }

    async create(locationData: Partial<Location>): Promise<Location> {
        const newLocation = this.locationRepository.create(locationData);
        return await this.locationRepository.save(newLocation);
    }

    async update(id: number, updateData: Partial<Location>): Promise<Location> {
        const location = await this.findOne(id);
        const { id: _, zones, employees, warehouses, ...data } = updateData as any;
        this.locationRepository.merge(location, data);
        return await this.locationRepository.save(location);
    }

    async remove(id: number): Promise<void> {
        await this.findOne(id);
        await this.locationRepository.delete(id);
    }
}
