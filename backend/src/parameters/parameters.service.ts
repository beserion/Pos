import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parameter } from './parameter.entity';

@Injectable()
export class ParametersService implements OnModuleInit {
  private readonly logger = new Logger(ParametersService.name);

  constructor(
    @InjectRepository(Parameter)
    private readonly repo: Repository<Parameter>,
  ) {}

  async onModuleInit() {
    await this.ensureSchema();
    await this.seedDefaults();
  }

  private async ensureSchema() {
    try {
      const queryRunner = this.repo.manager.connection.createQueryRunner();
      await queryRunner.connect();
      const table = await queryRunner.getTable('system_parameters');
      if (!table) {
        this.logger.log('Creating system_parameters table...');
        await queryRunner.query(`
          CREATE TABLE system_parameters (
            id INT IDENTITY(1,1) PRIMARY KEY,
            [module] NVARCHAR(100) NOT NULL,
            [key] NVARCHAR(100) NOT NULL,
            [value] NVARCHAR(MAX) NULL,
            [type] NVARCHAR(50) NOT NULL DEFAULT 'text',
            [label] NVARCHAR(200) NULL,
            [description] NVARCHAR(500) NULL,
            createdAt DATETIME2 DEFAULT GETDATE(),
            updatedAt DATETIME2 DEFAULT GETDATE(),
            CONSTRAINT UQ_system_parameters_module_key UNIQUE ([module], [key])
          )
        `);
        this.logger.log('system_parameters table created.');
      }
      await queryRunner.release();
    } catch (err) {
      this.logger.error('ensureSchema error:', err);
    }
  }

  private async seedDefaults() {
    try {
      const defaultParams = [
        { module: 'pos', key: 'half_price_multiplier', value: '0.50', label: 'Yarım Fiyat Katsayısı', type: 'number', description: 'Yarım satışlarda fiyat çarpanı' },
        { module: 'pos', key: 'double_price_multiplier', value: '1.70', label: 'Duble Fiyat Katsayısı', type: 'number', description: 'Duble satışlarda fiyat çarpanı' },
        { module: 'pos', key: 'half_recipe_multiplier', value: '0.50', label: 'Yarım Reçete Katsayısı', type: 'number', description: 'Yarım satışlarda stok düşüm çarpanı' },
        { module: 'pos', key: 'double_recipe_multiplier', value: '2.00', label: 'Duble Reçete Katsayısı', type: 'number', description: 'Duble satışlarda stok düşüm çarpanı' }
      ];

      for (const p of defaultParams) {
        const existing = await this.repo.findOne({ where: { module: p.module, key: p.key } });
        if (!existing) {
          await this.repo.save(this.repo.create(p));
          this.logger.log(`Seeded parameter: ${p.module}.${p.key}`);
        }
      }
    } catch (err) {
      this.logger.error('seedDefaults error:', err);
    }
  }

  // Tüm parametreleri getir
  async findAll(): Promise<Parameter[]> {
    return this.repo.find({ order: { module: 'ASC', key: 'ASC' } });
  }

  // Modüle göre parametreleri getir
  async findByModule(module: string): Promise<Parameter[]> {
    return this.repo.find({ where: { module }, order: { key: 'ASC' } });
  }

  // Tekil parametre getir
  async getValue(module: string, key: string): Promise<string | null> {
    const p = await this.repo.findOne({ where: { module, key } });
    return p?.value ?? null;
  }

  // Parametreyi kaydet (upsert)
  async upsert(module: string, key: string, value: string, label?: string, type?: string, description?: string): Promise<Parameter> {
    let param = await this.repo.findOne({ where: { module, key } });
    if (param) {
      param.value = value;
      if (label) param.label = label;
      if (type) param.type = type;
      if (description) param.description = description;
    } else {
      param = this.repo.create({ module, key, value, label, type: type || 'text', description });
    }
    return this.repo.save(param);
  }

  // Toplu kaydet — tek SQL MERGE ile (hız optimizasyonu)
  async bulkUpsert(items: { module: string; key: string; value: string; label?: string; type?: string; description?: string }[]): Promise<void> {
    if (!items.length) return;

    // Her item için parametre oluştur ve tek MERGE sorgusu yaz
    const params: any[] = [];
    const rows = items.map((item, i) => {
      const base = i * 6;
      params.push(
        item.module,
        item.key,
        item.value ?? '',
        item.type ?? 'text',
        item.label ?? '',
        item.description ?? '',
      );
      return `(@${base}, @${base + 1}, @${base + 2}, @${base + 3}, @${base + 4}, @${base + 5})`;
    }).join(',\n');

    const sql = `
      MERGE system_parameters AS target
      USING (VALUES ${rows}) AS source([module],[key],[value],[type],[label],[description])
      ON target.[module] = source.[module] AND target.[key] = source.[key]
      WHEN MATCHED THEN
        UPDATE SET
          target.[value]       = source.[value],
          target.[type]        = source.[type],
          target.[label]       = source.[label],
          target.[description] = source.[description],
          target.updatedAt     = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT ([module],[key],[value],[type],[label],[description],createdAt,updatedAt)
        VALUES (source.[module],source.[key],source.[value],source.[type],source.[label],source.[description],GETDATE(),GETDATE());
    `;

    await this.repo.manager.query(sql, params);
  }

  // Parametre sil
  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
