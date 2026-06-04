import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modifier } from './modifier.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ModifiersService {
    constructor(
        @InjectRepository(Modifier)
        private modifierRepository: Repository<Modifier>,
        private productsService: ProductsService,
    ) { }

    findAll(): Promise<Modifier[]> {
        return this.modifierRepository.find({ relations: ['group'], order: { name: 'ASC' } });
    }

    async findOne(id: number): Promise<Modifier> {
        const modifier = await this.modifierRepository.findOne({ where: { id }, relations: ['group'] });
        if (!modifier) {
            throw new NotFoundException(`Modifier with ID ${id} not found`);
        }
        return modifier;
    }

    async create(modifierData: Partial<Modifier>): Promise<Modifier> {
        const modifier = this.modifierRepository.create(modifierData);
        const saved = await this.modifierRepository.save(modifier);
        this.productsService.clearCache();
        return saved;
    }

    async update(id: number, modifierData: Partial<Modifier>): Promise<Modifier> {
        await this.findOne(id); // Check existence
        await this.modifierRepository.update(id, modifierData);
        this.productsService.clearCache();
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const modifier = await this.findOne(id);
        await this.modifierRepository.remove(modifier);
        this.productsService.clearCache();
    }
}
