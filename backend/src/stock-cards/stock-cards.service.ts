import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCard } from './stock-card.entity';
import { UnitConversion } from './unit-conversion.entity';

@Injectable()
export class StockCardsService {
  constructor(
    @InjectRepository(StockCard)
    private stockCardRepository: Repository<StockCard>,
    @InjectRepository(UnitConversion)
    private unitConversionRepository: Repository<UnitConversion>,
  ) {}

  // ─── Stock Card CRUD ─────────────────────────────────

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string,
    warehouseId?: number,
  ): Promise<{ data: StockCard[]; total: number; lastPage: number }> {
    const query = this.stockCardRepository
      .createQueryBuilder('sc')
      .leftJoinAndSelect('sc.warehouse', 'warehouse')
      .leftJoinAndSelect('sc.stockGroupRelation', 'stockGroup');

    if (search) {
      query.andWhere(
        '(sc.name LIKE :search OR sc.code LIKE :search OR sc.barcode LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      query.andWhere('sc.category = :category', { category });
    }

    if (warehouseId) {
      query.andWhere('sc.warehouseId = :warehouseId', { warehouseId });
    }

    query.orderBy('sc.name', 'ASC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, lastPage: Math.ceil(total / limit) };
  }

  async findAllNoPagination(): Promise<StockCard[]> {
    return this.stockCardRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      relations: ['warehouse', 'stockGroupRelation'],
    });
  }

  async findOne(id: number): Promise<StockCard> {
    const card = await this.stockCardRepository.findOne({
      where: { id },
      relations: ['warehouse', 'stockGroupRelation'],
    });
    if (!card) {
      throw new NotFoundException(`StockCard with ID ${id} not found`);
    }
    return card;
  }

  async create(data: Partial<StockCard>): Promise<StockCard> {
    if (data.id) delete data.id;
    const newCard = this.stockCardRepository.create(data);
    return this.stockCardRepository.save(newCard);
  }

  async update(id: number, data: Partial<StockCard>): Promise<StockCard> {
    if (data.id) delete data.id;
    await this.findOne(id);
    await this.stockCardRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    throw new BadRequestException('Güvenlik kuralı gereği sistemden stok kartı kalıcı olarak silinemez. Lütfen kartı düzenleyerek "Pasif" konuma alınız.');
  }

  async getCategories(): Promise<string[]> {
    const result = await this.stockCardRepository
      .createQueryBuilder('sc')
      .select('DISTINCT sc.category', 'category')
      .where('sc.category IS NOT NULL')
      .getRawMany();
    return result.map((r) => r.category).filter(Boolean);
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    warning: number;
    empty: number;
  }> {
    const all = await this.stockCardRepository.find({ where: { isActive: true } });
    let warning = 0;
    let empty = 0;
    for (const sc of all) {
      const stock = Number(sc.currentStock);
      const min = Number(sc.minStockLevel);
      if (stock <= 0) empty++;
      else if (min > 0 && stock <= min) warning++;
    }
    return { total: all.length, active: all.length, warning, empty };
  }

  // ─── Unit Conversion CRUD ────────────────────────────

  async findConversions(stockCardId?: number): Promise<UnitConversion[]> {
    const where: any = {};
    if (stockCardId) where.stockCardId = stockCardId;
    return this.unitConversionRepository.find({ where, relations: ['stockCard'] });
  }

  async createConversion(data: Partial<UnitConversion>): Promise<UnitConversion> {
    if (data.id) delete data.id;
    const conv = this.unitConversionRepository.create(data);
    return this.unitConversionRepository.save(conv);
  }

  async updateConversion(id: number, data: Partial<UnitConversion>): Promise<UnitConversion> {
    if (data.id) delete data.id;
    const conv = await this.unitConversionRepository.findOne({ where: { id } });
    if (!conv) throw new NotFoundException(`UnitConversion with ID ${id} not found`);
    await this.unitConversionRepository.update(id, data);
    return this.unitConversionRepository.findOne({ where: { id } }) as Promise<UnitConversion>;
  }

  async removeConversion(id: number): Promise<void> {
    await this.unitConversionRepository.delete(id);
  }

  /**
   * Convert a quantity from one unit to the base unit of a stock card.
   */
  async convertToBaseUnit(stockCardId: number, fromUnit: string, quantity: number): Promise<number> {
    const card = await this.findOne(stockCardId);
    if (fromUnit === card.baseUnit) return quantity;

    // Check stock-card specific conversion first
    const conv = await this.unitConversionRepository.findOne({
      where: { stockCardId, fromUnit, toUnit: card.baseUnit },
    });
    if (conv) return quantity * Number(conv.multiplier);

    // Check global conversion
    const globalConv = await this.unitConversionRepository.findOne({
      where: { stockCardId: null as any, fromUnit, toUnit: card.baseUnit },
    });
    if (globalConv) return quantity * Number(globalConv.multiplier);

    // Use the card's own conversionRate (purchaseUnit → baseUnit)
    if (fromUnit === card.purchaseUnit) {
      return quantity * Number(card.conversionRate);
    }

    return quantity; // Fallback: no conversion found
  }

  /**
   * Update stock quantity directly (used for reversals and simple adjustments)
   */
  async adjustStock(id: number, delta: number, manager?: any): Promise<number> {
    const repo = manager ? manager.getRepository(StockCard) : this.stockCardRepository;
    const card = await repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException(`StockCard with ID ${id} not found`);
    card.currentStock = Number(card.currentStock) + delta;
    await repo.save(card);
    return Number(card.currentStock);
  }

  /**
   * Update stock quantity and costs (used by StockMovementsService)
   */
  async updateStockAndCost(
    id: number,
    delta: number,
    costs: { lastPurchasePrice?: number; averageCost?: number; costPerBaseUnit?: number },
    manager?: any,
  ): Promise<number> {
    const repo = manager ? manager.getRepository(StockCard) : this.stockCardRepository;
    const card = await repo.findOne({ where: { id } });
    if (!card) throw new NotFoundException(`StockCard with ID ${id} not found`);

    card.currentStock = Number(card.currentStock) + delta;
    if (costs.lastPurchasePrice !== undefined && !isNaN(costs.lastPurchasePrice))
      card.lastPurchasePrice = costs.lastPurchasePrice;
    if (costs.averageCost !== undefined && !isNaN(costs.averageCost))
      card.averageCost = costs.averageCost;
    if (costs.costPerBaseUnit !== undefined && !isNaN(costs.costPerBaseUnit))
      card.costPerBaseUnit = costs.costPerBaseUnit;

    await repo.save(card);
    return Number(card.currentStock);
  }
}
