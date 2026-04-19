import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from './product-type.entity';

@Injectable()
export class ProductTypesService implements OnModuleInit {
  private readonly logger = new Logger(ProductTypesService.name);

  constructor(
    @InjectRepository(ProductType)
    private readonly repo: Repository<ProductType>,
  ) {}

  /**
   * §4: Varsayılan ürün cinsleri (seed)
   */
  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const defaults = [
      { name: 'Alkollü İçecek', code: 'alkol_icecek', sortOrder: 1, skipPrinterOutput: false },
      { name: 'Alkolsüz İçecek', code: 'alkolsuz_icecek', sortOrder: 2, skipPrinterOutput: false },
      { name: 'Sıcak İçecek', code: 'sicak_icecek', sortOrder: 3, skipPrinterOutput: false },
      { name: 'Yiyecek', code: 'yiyecek', sortOrder: 4, skipPrinterOutput: false },
      { name: 'Tatlı', code: 'tatli', sortOrder: 5, skipPrinterOutput: false },
      { name: 'Kahvaltı', code: 'kahvalti', sortOrder: 6, skipPrinterOutput: false },
      { name: 'Market Ürünü', code: 'market_urunu', sortOrder: 7, skipPrinterOutput: false },
      { name: 'Servis / Ücret', code: 'servis_ucret', sortOrder: 8, skipPrinterOutput: true },
      { name: 'Diğer', code: 'diger', sortOrder: 9, skipPrinterOutput: true },
    ];

    try {
      for (const def of defaults) {
        const existing = await this.repo.findOne({ where: { name: def.name } });
        if (!existing) {
          await this.repo.save(this.repo.create(def));
          this.logger.log(`Seeded product type: ${def.name} (${def.code})`);
        } else {
          // §5: skipPrinterOutput ve code güncelle (mevcut kaydı bozmadan)
          let updated = false;
          if (!existing.code && def.code) {
            existing.code = def.code;
            updated = true;
          }
          if (existing.sortOrder === 0 && def.sortOrder > 0) {
            existing.sortOrder = def.sortOrder;
            updated = true;
          }
          if (updated) {
            await this.repo.save(existing);
          }
        }
      }
    } catch (err) {
      this.logger.error('seedDefaults error:', err);
    }
  }

  async findAll(): Promise<ProductType[]> {
    return this.repo.find({
      relations: ['outputProfile'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ProductType> {
    const type = await this.repo.findOne({
      where: { id },
      relations: ['outputProfile'],
    });
    if (!type) {
      throw new NotFoundException(`ProductType #${id} not found`);
    }
    return type;
  }

  async create(data: Partial<ProductType>): Promise<ProductType> {
    if (data.id) delete data.id;
    const type = this.repo.create(data);
    return this.repo.save(type);
  }

  async update(id: number, data: Partial<ProductType>): Promise<ProductType> {
    if (data.id) delete data.id;
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const type = await this.findOne(id);
    await this.repo.remove(type);
  }
}
