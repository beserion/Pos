import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find({ relations: ['users'] });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async create(roleData: Partial<Role>): Promise<Role> {
    const newRole = this.roleRepository.create(roleData);
    return await this.roleRepository.save(newRole);
  }

  async update(id: number, updateData: Partial<Role>): Promise<Role> {
    const role = await this.findOne(id);
    const { id: _, users, createdAt, updatedAt, ...data } = updateData as any;
    this.roleRepository.merge(role, data);
    return await this.roleRepository.save(role);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.roleRepository.delete(id);
  }
}
