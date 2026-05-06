import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockCard } from './stock-card.entity';
import { UnitConversion } from './unit-conversion.entity';
import { StockGroup } from '../stock-groups/stock-group.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import * as xlsx from 'xlsx';

@Injectable()
export class StockCardsService {
  constructor(
    @InjectRepository(StockCard)
    private stockCardRepository: Repository<StockCard>,
    @InjectRepository(UnitConversion)
    private unitConversionRepository: Repository<UnitConversion>,
    @InjectRepository(StockGroup)
    private stockGroupRepository: Repository<StockGroup>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
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

    if (data.code) {
      const existingCode = await this.stockCardRepository.findOne({ where: { code: data.code } });
      if (existingCode) throw new BadRequestException(`"${data.code}" kodu zaten kullanımda.`);
    }
    if (data.name) {
      const existingName = await this.stockCardRepository.findOne({ where: { name: data.name } });
      if (existingName) throw new BadRequestException(`"${data.name}" isminde bir kart zaten mevcut.`);
    }
    if (data.barcode) {
      const existingBarcode = await this.stockCardRepository.findOne({ where: { barcode: data.barcode } });
      if (existingBarcode) throw new BadRequestException(`"${data.barcode}" barkodu zaten kullanımda.`);
    }

    const newCard = this.stockCardRepository.create(data);
    return this.stockCardRepository.save(newCard);
  }

  async update(id: number, data: Partial<StockCard>): Promise<StockCard> {
    if (data.id) delete data.id;
    const existing = await this.findOne(id);

    if (data.code && data.code !== existing.code) {
      const dup = await this.stockCardRepository.findOne({ where: { code: data.code } });
      if (dup) throw new BadRequestException(`"${data.code}" kodu zaten kullanımda.`);
    }
    if (data.name && data.name !== existing.name) {
      const dup = await this.stockCardRepository.findOne({ where: { name: data.name } });
      if (dup) throw new BadRequestException(`"${data.name}" isminde bir kart zaten mevcut.`);
    }
    if (data.barcode && data.barcode !== existing.barcode && data.barcode !== '') {
      const dup = await this.stockCardRepository.findOne({ where: { barcode: data.barcode } });
      if (dup) throw new BadRequestException(`"${data.barcode}" barkodu zaten kullanımda.`);
    }

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

  async importStockCards(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const defaultWarehouse = await this.warehouseRepository.findOne({ where: { isActive: true } });

    const stockGroupMap = new Map<string, number>();
    const uniqueGroups = [...new Set(data.map((row: any) => row['grup'] || row['Grup'] || row['STOK GRUBU']).filter(Boolean))] as string[];

    for (const groupName of uniqueGroups) {
      let group = await this.stockGroupRepository.findOne({ where: { name: groupName } });
      if (!group) {
        group = this.stockGroupRepository.create({ name: groupName });
        group = await this.stockGroupRepository.save(group);
      }
      stockGroupMap.set(groupName, group.id);
    }

    const natureMap: Record<string, string> = {
      'Ticari Mal (Al-Sat)': 'traded_good',
      'Hammadde / Sarf Malzeme': 'raw_material',
      'Yarı Mamül': 'semi_finished',
      'Sarf Malzeme': 'consumable',
      'Paketleme': 'packaging',
    };

    let addedCount = 0;
    let updatedCount = 0;

    const mapToIsoUnit = (unit: string): string => {
      if (!unit) return 'NIU';
      const u = unit.toUpperCase().trim();
      if (u === 'ADET' || u === 'TANE' || u === 'PCS' || u === 'PIECE') return 'NIU';
      if (u === 'KG' || u === 'KİLO' || u === 'KILOGRAM' || u === 'KILO') return 'KGM';
      if (u === 'GR' || u === 'GRAM') return 'GRM';
      if (u === 'LT' || u === 'LİTRE' || u === 'LITER') return 'LTR';
      if (u === 'ML' || u === 'MİLİLİTRE' || u === 'MILLILITER') return 'MLT';
      if (u === 'CL' || u === 'SANTİLİTRE' || u === 'CENTILITER') return 'CLT';
      if (u === 'PK' || u === 'PAKET' || u === 'PACKET' || u === 'PACKAGE') return 'PA';
      if (u === 'KOLİ' || u === 'KUTU' || u === 'BOX') return 'BX';
      if (u === 'ÇUVAL' || u === 'SACK') return 'SA';
      if (u === 'METRE' || u === 'M') return 'MTR';
      return u; // Bilinmiyorsa olduğu gibi bırak
    };

    for (const row of data as any[]) {
      // Find keys flexibly
      const findKey = (keywords: string[]) => {
        const keys = Object.keys(row);
        return keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
      };

      const codeKey = findKey(['kodu', 'code', 'stok kodu']) || 'kodu';
      const nameKey = findKey(['adi', 'name', 'stok adı']) || 'adi';
      const barcodeKey = findKey(['barkod', 'barcode']) || 'barkod';
      const groupKey = findKey(['grup', 'group']) || 'grup';
      const vatKey = findKey(['kdvalis', 'vat']) || 'kdvalis';
      const priceKey = findKey(['son_alis_fiyati', 'price']) || 'son_alis_fiyati';
      const natureKey = findKey(['stok doğası', 'nature']) || 'stok doğası';
      const pUnitKey = findKey(['Alış Birimi', 'Purchase Unit']) || 'Alış Birimi (Purchase Unit)';
      const bUnitKey = findKey(['Takip Birimi', 'Base Unit']) || 'Takip Birimi (Base Unit)';
      const convKey = findKey(['Dönüşüm', 'Conversion']) || 'Dönüşüm (1 Alış = ? Takip)';

      const code = String(row[codeKey] || '').trim();
      const name = String(row[nameKey] || '').trim();
      if (!code || !name) continue;

      const barcode = row[barcodeKey] ? String(row[barcodeKey]).trim() : undefined;
      const groupName = row[groupKey] || undefined;
      const stockGroupId = (groupName ? stockGroupMap.get(groupName) : undefined) || undefined;
      const purchaseVat = parseFloat(row[vatKey]) || 0;
      const lastPurchasePrice = parseFloat(row[priceKey]) || 0;
      const stockNatureRaw = row[natureKey];
      const stockNature = natureMap[stockNatureRaw] || 'traded_good';
      
      const purchaseUnit = mapToIsoUnit(String(row[pUnitKey] || '').trim());
      const baseUnit = mapToIsoUnit(String(row[bUnitKey] || 'adet').trim());
      const conversionRate = parseFloat(row[convKey]) || 1;

      const existingCard = await this.stockCardRepository.findOne({ where: { code } });

      const cardData: Partial<StockCard> = {
        name,
        code,
        barcode,
        stockGroup: groupName,
        stockGroupId,
        purchaseVat,
        lastPurchasePrice,
        stockNature,
        purchaseUnit: purchaseUnit || undefined,
        baseUnit: baseUnit || 'adet',
        conversionRate,
        warehouseId: defaultWarehouse?.id,
        updatedAt: new Date(),
      };

      if (existingCard) {
        await this.stockCardRepository.update(existingCard.id, cardData);
        updatedCount++;
      } else {
        const newCard = this.stockCardRepository.create({
          ...cardData,
          isActive: true,
          currentStock: 0,
          minStockLevel: 0,
          maxStockLevel: 0,
          costPerBaseUnit: 0,
          averageCost: 0,
          createdAt: new Date(),
        });
        await this.stockCardRepository.save(newCard);
        addedCount++;
      }
    }

    return { addedCount, updatedCount, totalCount: data.length };
  }
}
