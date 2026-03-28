import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegister } from './cash-register.entity';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,
  ) {}

  async findAll(companyId: number): Promise<CashRegister[]> {
    return this.cashRegisterRepository.find({
      where: { companyId },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number, companyId: number): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOne({ where: { id, companyId } });
    if (!register) throw new NotFoundException('Kasa bulunamadı.');
    return register;
  }

  async create(data: Partial<CashRegister>, companyId: number): Promise<CashRegister> {
    const newRegister = this.cashRegisterRepository.create({ ...data, companyId });
    return this.cashRegisterRepository.save(newRegister);
  }

  async update(id: number, data: Partial<CashRegister>, companyId: number): Promise<CashRegister> {
    const register = await this.findOne(id, companyId);
    Object.assign(register, data);
    return this.cashRegisterRepository.save(register);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const register = await this.findOne(id, companyId);
    await this.cashRegisterRepository.remove(register);
  }
}
