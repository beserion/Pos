import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modifier } from './modifier.entity';

@Injectable()
export class ModifiersService {
    constructor(
        @InjectRepository(Modifier)
        private modifierRepository: Repository<Modifier>,
    ) { }

    findAll(): Promise<Modifier[]> {
        return this.modifierRepository.find({ order: { name: 'ASC' } });
    }

    async findOne(id: number): Promise<Modifier> {
        const modifier = await this.modifierRepository.findOne({ where: { id } });
        if (!modifier) {
            throw new NotFoundException(`Modifier with ID ${id} not found`);
        }
        return modifier;
    }

    create(modifierData: Partial<Modifier>): Promise<Modifier> {
        const modifier = this.modifierRepository.create(modifierData);
        return this.modifierRepository.save(modifier);
    }

    async update(id: number, modifierData: Partial<Modifier>): Promise<Modifier> {
        await this.findOne(id); // Check existence
        await this.modifierRepository.update(id, modifierData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const modifier = await this.findOne(id);
        await this.modifierRepository.remove(modifier);
    }
}
