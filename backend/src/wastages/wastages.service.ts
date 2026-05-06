import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Wastage } from './wastage.entity';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class WastagesService {
  constructor(
    @InjectRepository(Wastage)
    private wastageRepository: Repository<Wastage>,
    private stocksService: StocksService,
  ) {}

  async findAll(): Promise<Wastage[]> {
    return await this.wastageRepository.find({
      relations: ['stockCard', 'recordedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Wastage> {
    const wastage = await this.wastageRepository.findOne({
      where: { id },
      relations: ['stockCard', 'recordedBy'],
    });
    if (!wastage) {
      throw new NotFoundException(`Wastage record with ID ${id} not found`);
    }
    return wastage;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Wastage[]> {
    return await this.wastageRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['product', 'recordedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(wastageData: Partial<Wastage>): Promise<Wastage> {
    const newWastage = this.wastageRepository.create(wastageData);
    const saved = await this.wastageRepository.save(newWastage);

    // Deduct stock for the wasted product
    if (wastageData.stockCardId && wastageData.quantity) {
      await this.stocksService.deductStock(
        wastageData.stockCardId,
        Number(wastageData.quantity),
      );
    }

    return await this.findOne(saved.id);
  }

  async getWastageSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalWastages: number;
    totalCostLoss: number;
    byProduct: any[];
    byReason: any[];
  }> {
    let query = this.wastageRepository
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.stockCard', 'stockCard');

    if (startDate && endDate) {
      query = query.where('w.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const wastages = await query.getMany();

    const totalWastages = wastages.length;
    let totalCostLoss = 0;

    const productMap = new Map<
      number,
      { productName: string; totalQty: number; totalCost: number }
    >();
    const reasonMap = new Map<string, { count: number; totalCost: number }>();

    for (const w of wastages) {
      const qty = Number(w.quantity);
      const cost = qty * Number(w.stockCard?.costPerBaseUnit || 0);
      totalCostLoss += cost;

      // Group by stockCard
      const prodKey = w.stockCardId;
      if (!productMap.has(prodKey)) {
        productMap.set(prodKey, {
          productName: w.stockCard?.name || '',
          totalQty: 0,
          totalCost: 0,
        });
      }
      const prod = productMap.get(prodKey)!;
      prod.totalQty += qty;
      prod.totalCost += cost;

      // Group by reason
      const reason = w.reason || 'Belirtilmemiş';
      if (!reasonMap.has(reason)) {
        reasonMap.set(reason, { count: 0, totalCost: 0 });
      }
      const r = reasonMap.get(reason)!;
      r.count++;
      r.totalCost += cost;
    }

    return {
      totalWastages,
      totalCostLoss: Math.round(totalCostLoss * 100) / 100,
      byProduct: Array.from(productMap.entries()).map(([id, data]) => ({
        stockCardId: id,
        ...data,
      })),
      byReason: Array.from(reasonMap.entries()).map(([reason, data]) => ({
        reason,
        ...data,
      })),
    };
  }
}
