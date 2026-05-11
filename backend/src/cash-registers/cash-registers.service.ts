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
      relations: ['receiptPrinter', 'receiptProfile'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number, companyId: number): Promise<CashRegister> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id, companyId },
      relations: ['receiptPrinter', 'receiptProfile'],
    });
    if (!register) throw new NotFoundException('Kasa bulunamadı.');
    return register;
  }

  async create(data: Partial<CashRegister>, companyId: number): Promise<CashRegister> {
    const newRegister = this.cashRegisterRepository.create({ ...data, companyId });
    return this.cashRegisterRepository.save(newRegister);
  }

  async update(id: number, data: Partial<CashRegister>, companyId: number): Promise<CashRegister> {
    await this.findOne(id, companyId); // throws if not found / not owned

    // Extract only the plain-column fields we want to persist.
    // We use repository.update() (direct SQL UPDATE) instead of save() because
    // TypeORM's save() can silently skip FK-only changes on ManyToOne relations.
    const updatePayload: Partial<CashRegister> = {
      name: data.name,
      isActive: data.isActive,
      locationId: data.locationId,
      zoneIds: data.zoneIds,
      allowedPaymentMethods: data.allowedPaymentMethods,
      // receiptPrinterId and receiptProfileId are the FK columns
      receiptPrinterId: data.receiptPrinterId,
      receiptProfileId: data.receiptProfileId,
    };

    // Remove undefined keys so we don't accidentally wipe untouched columns
    (Object.keys(updatePayload) as Array<keyof typeof updatePayload>).forEach((key) => {
      if (updatePayload[key] === undefined) delete updatePayload[key];
    });

    await this.cashRegisterRepository.update(id, updatePayload);
    return this.cashRegisterRepository.findOne({
      where: { id },
      relations: ['receiptPrinter', 'receiptProfile'],
    }) as Promise<CashRegister>;
  }

  async remove(id: number, companyId: number): Promise<void> {
    const register = await this.findOne(id, companyId);
    await this.cashRegisterRepository.remove(register);
  }
}
