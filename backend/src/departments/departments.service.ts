import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repository: Repository<Department>,
  ) {}

  findAll() {
    return this.repository.find({ relations: ['location'] });
  }

  findOne(id: number) {
    return this.repository.findOne({ where: { id }, relations: ['location'] });
  }

  async create(data: Partial<Department>) {
    if (data.id) delete data.id;
    const dep = this.repository.create(data);
    return this.repository.save(dep);
  }

  async update(id: number, data: Partial<Department>) {
    if (data.id) delete data.id;
    await this.repository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.repository.delete(id);
  }
}
