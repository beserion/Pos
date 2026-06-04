import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './partner.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  async findAll(
    type?: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: Partner[]; total: number; lastPage: number; totalAlacak: number; totalBorc: number; totalBalance: number; customerCount: number; supplierCount: number }> {
    const query = this.partnerRepository.createQueryBuilder('partner');

    if (type && type !== 'ALL') {
      query.andWhere('partner.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(partner.name LIKE :search OR partner.contactName LIKE :search OR partner.taxNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Clone query for totals calculation before applying pagination
    const totalsQuery = query.clone();

    const [data, total] = await query
      .orderBy('partner.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Calculate global totals for filtered results
    const totals = await totalsQuery
      .select('SUM(CASE WHEN partner.currentBalance > 0 THEN partner.currentBalance ELSE 0 END)', 'totalAlacak')
      .addSelect('SUM(CASE WHEN partner.currentBalance < 0 THEN ABS(partner.currentBalance) ELSE 0 END)', 'totalBorc')
      .addSelect('SUM(partner.currentBalance)', 'totalBalance')
      .getRawOne();

    const customerCount = await this.partnerRepository.count({ where: { type: 'CUSTOMER' } });
    const supplierCount = await this.partnerRepository.count({ where: { type: 'SUPPLIER' } });

    return {
      data,
      total,
      lastPage: Math.ceil(total / limit),
      totalAlacak: Number(totals?.totalAlacak || 0),
      totalBorc: Number(totals?.totalBorc || 0),
      totalBalance: Number(totals?.totalBalance || 0),
      customerCount,
      supplierCount,
    };
  }

  async findOne(id: number): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    return partner;
  }

  async create(partnerData: Partial<Partner>): Promise<Partner> {
    if (partnerData.name) {
      const existing = await this.partnerRepository.findOne({ where: { name: partnerData.name } });
      if (existing) throw new BadRequestException(`"${partnerData.name}" isimli cari zaten mevcut.`);
    }
    if (partnerData.taxNumber && partnerData.taxNumber !== '') {
      const existing = await this.partnerRepository.findOne({ where: { taxNumber: partnerData.taxNumber } });
      if (existing) throw new BadRequestException(`"${partnerData.taxNumber}" vergi numaralı cari zaten mevcut.`);
    }
    const newPartner = this.partnerRepository.create(partnerData);
    return await this.partnerRepository.save(newPartner);
  }

  async update(id: number, updateData: Partial<Partner>): Promise<Partner> {
    const partner = await this.findOne(id);
    if (updateData.name && updateData.name !== partner.name) {
      const dup = await this.partnerRepository.findOne({ where: { name: updateData.name } });
      if (dup) throw new BadRequestException(`"${updateData.name}" isimli cari zaten mevcut.`);
    }
    if (updateData.taxNumber && updateData.taxNumber !== partner.taxNumber && updateData.taxNumber !== '') {
      const dup = await this.partnerRepository.findOne({ where: { taxNumber: updateData.taxNumber } });
      if (dup) throw new BadRequestException(`"${updateData.taxNumber}" vergi numaralı cari zaten mevcut.`);
    }
    await this.partnerRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const partner = await this.findOne(id);

    if (partner.name === 'PERAKENDE MÜŞTERİ' || partner.name === 'PAREKENDE MÜŞTERİ') {
      throw new BadRequestException('PERAKENDE MÜŞTERİ silinemez.');
    }

    const txCount = await this.partnerRepository.manager.count('AccountTransaction', {
      where: { partnerId: id },
    });
    if (txCount > 0) {
      throw new BadRequestException(
        'Bu cariye ait hesap hareketleri (işlemler) bulunmaktadır. Silinemez.',
      );
    }

    const invoiceCount = await this.partnerRepository.manager.count('Invoice', {
      where: { partnerId: id },
    });
    if (invoiceCount > 0) {
      throw new BadRequestException('Bu cariye ait faturalar bulunmaktadır. Silinemez.');
    }

    const saleCount = await this.partnerRepository.manager.count('Sale', {
      where: { partnerId: id },
    });
    if (saleCount > 0) {
      throw new BadRequestException(
        'Bu cariye ait satış veya adisyon kayıtları bulunmaktadır. Silinemez.',
      );
    }

    await this.partnerRepository.delete(id);
  }
  
  async getOrCreateRetailCustomer(): Promise<Partner> {
    let retail = await this.partnerRepository.findOne({ where: { name: 'PERAKENDE MÜŞTERİ' } });
    if (retail) return retail;

    // Check if the old misspelled one exists and rename it
    const oldRetail = await this.partnerRepository.findOne({ where: { name: 'PAREKENDE MÜŞTERİ' } });
    if (oldRetail) {
      oldRetail.name = 'PERAKENDE MÜŞTERİ';
      return await this.partnerRepository.save(oldRetail);
    }

    return await this.create({
      name: 'PERAKENDE MÜŞTERİ',
      type: 'CUSTOMER',
      isActive: true,
    });
  }

  async updateBalance(id: number, amount: number, type: 'DEBIT' | 'CREDIT' | 'INCOME' | 'EXPENSE', manager?: any): Promise<Partner> {
    const repo = manager ? manager.getRepository(Partner) : this.partnerRepository;
    const partner = await (manager ? manager.findOne(Partner, { where: { id } }) : this.findOne(id));
    if (!partner) throw new NotFoundException(`Partner with ID ${id} not found`);
    
    const numericAmount = Number(amount);
    
    // Debit increases what customer owes us (Borçlandırma)
    // Credit reduces what customer owes us (Alacaklandırma/Ödeme Alımı)
    // ERP Convention: INCOME (Payment received) -> CREDIT (reduces debt), EXPENSE (Purchase/Payment sent) -> DEBIT (increases debt)
    
    if (type === 'INCOME' || type === 'CREDIT') {
      partner.currentBalance = Number(partner.currentBalance) - numericAmount;
    } else if (type === 'EXPENSE' || type === 'DEBIT') {
      partner.currentBalance = Number(partner.currentBalance) + numericAmount;
    }
    
    return await repo.save(partner);
  }
}
