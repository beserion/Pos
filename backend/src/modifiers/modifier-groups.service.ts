import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModifierGroup } from './modifier-group.entity';

@Injectable()
export class ModifierGroupsService {
    constructor(
        @InjectRepository(ModifierGroup)
        private modifierGroupRepository: Repository<ModifierGroup>,
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

    create(groupData: Partial<ModifierGroup>): Promise<ModifierGroup> {
        const group = this.modifierGroupRepository.create(groupData);
        return this.modifierGroupRepository.save(group);
    }

    async update(id: number, groupData: Partial<ModifierGroup>): Promise<ModifierGroup> {
        await this.findOne(id);
        await this.modifierGroupRepository.update(id, groupData);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        const group = await this.findOne(id);
        await this.modifierGroupRepository.remove(group);
    }
}
