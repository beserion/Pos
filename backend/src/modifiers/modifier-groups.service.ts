import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModifierGroup } from './modifier-group.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ModifierGroupsService {
    constructor(
        @InjectRepository(ModifierGroup)
        private modifierGroupRepository: Repository<ModifierGroup>,
        private productsService: ProductsService,
    ) { }

    findAll(): Promise<ModifierGroup[]> {
        return this.modifierGroupRepository.find({ order: { name: 'ASC' } });
    }

    async findOne(id: number): Promise<ModifierGroup> {
        const group = await this.modifierGroupRepository.findOne({ where: { id } });
        if (!group) {
            throw new NotFoundException(`Modifier Group with ID ${id} not found`);
        }
        return group;
    }

    async create(groupData: Partial<ModifierGroup>): Promise<ModifierGroup> {
        const group = this.modifierGroupRepository.create(groupData);
        const saved = await this.modifierGroupRepository.save(group);
        this.productsService.clearCache();
        return saved;
    }

    async update(id: number, groupData: Partial<ModifierGroup>): Promise<ModifierGroup> {
        await this.findOne(id);
        await this.modifierGroupRepository.update(id, groupData);
        this.productsService.clearCache();
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const group = await this.findOne(id);
        await this.modifierGroupRepository.remove(group);
        this.productsService.clearCache();
    }
}
