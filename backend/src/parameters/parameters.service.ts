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
        { module: 'pos', key: 'double_recipe_multiplier', value: '2.00', label: 'Duble Reçete Katsayısı', type: 'number', description: 'Duble satışlarda stok düşüm çarpanı' },
        { module: 'inventory', key: 'stock_restore_on_cancel', value: 'true', label: 'İptal/İade Stok Geri Yükleme', type: 'boolean', description: 'İptal veya iade durumunda stok otomatik geri yüklensin mi?' },
        { module: 'inventory', key: 'default_warehouse_id', value: '0', label: 'Varsayılan Depo', type: 'number', description: 'Varsayılan depo ID (0 = belirtilmemiş)' },
        { module: 'inventory', key: 'blind_count_default', value: 'false', label: 'Kör Sayım Varsayılanı', type: 'boolean', description: 'Sayım başlatılırken kör sayım seçili mi?' },
        // ── Döviz Kurları ──
        { module: 'pos', key: 'eur_rate', value: '37.50', label: 'EUR Kuru', type: 'number', description: 'Müşteri fişindeki Euro dönüşüm kuru' },
        { module: 'pos', key: 'usd_rate', value: '35.20', label: 'USD Kuru', type: 'number', description: 'Müşteri fişindeki Dolar dönüşüm kuru' },
        { module: 'pos', key: 'gbp_rate', value: '44.10', label: 'GBP Kuru', type: 'number', description: 'Müşteri fişindeki Sterlin dönüşüm kuru' },
        // ── İş Günü Yönetimi Parametreleri ──
        { module: 'pos', key: 'active_business_date', value: '', label: 'Aktif Program Tarihi', type: 'text', description: 'Mevcut çalışma günü tarihi (YYYY-MM-DD). Boş ise otomatik hesaplanır.' },
        { module: 'pos', key: 'last_end_of_day_at', value: '', label: 'Son Gün Sonu Zamanı', type: 'text', description: 'Son başarılı gün sonu tarih/saati (ISO format).' },
        { module: 'pos', key: 'shift_closure_mode', value: 'warn_only', label: 'Vardiya Kapanış Modu', type: 'select', description: 'Gün sonu öncesi açık vardiya kontrolü: warn_only / authorized_approval / mandatory_close' },
        { module: 'pos', key: 'z_report_print_mode', value: 'auto_print', label: 'Z Raporu Yazdırma Modu', type: 'select', description: 'Gün sonu sonrası Z raporu: auto_print / manual_print / disabled' },
        { module: 'pos', key: 'shift_system_enabled', value: 'true', label: 'Vardiyalı Kasiyer Sistemi', type: 'boolean', description: 'Vardiyalı kasiyer sistemi aktif mi?' },
        { module: 'pos', key: 'end_of_day_min_hours', value: '6', label: 'Gün Sonu Min. Saat Aralığı', type: 'number', description: 'İki gün sonu arasında minimum kaç saat geçmeli?' },
        { module: 'pos', key: 'vat_rates', value: '0,1,10,20', label: 'KDV Oranları', type: 'text', description: 'Virgülle ayrılmış KDV oranları' },
        { module: 'pos', key: 'block_eod_if_tables_open', value: 'false', label: 'Açık Masa Varken Gün Sonunu Engelle', type: 'boolean', description: 'Eğer açık (ödenmemiş) masa varsa gün sonu alınmasını engeller.' },
        { module: 'pos', key: 'auto_close_shifts_on_eod', value: 'true', label: 'Gün Sonunda Vardiyaları Otomatik Kapat', type: 'boolean', description: 'Gün sonu alındığında hala açık olan vardiyalar otomatik olarak beklenen tutar ile kapatılsın mı?' },
        { module: 'printer', key: 'print_on_refund', value: 'true', label: 'İade de fiş yazdır', type: 'boolean', description: 'Bir ürün iade edildiğinde ilgili yazıcıdan iade fişi çıkartılsın mı?' },
        { module: 'printer', key: 'print_on_cancel', value: 'true', label: 'İptal de fiş yazdır', type: 'boolean', description: 'Bir ürün iptal edildiğinde ilgili yazıcıdan iptal fişi çıkartılsın mı?' },
        { module: 'printer', key: 'print_receipt_on_payment', value: 'true', label: 'Ödeme Alındığında Fiş Yazdır', type: 'boolean', description: 'Kasa POS ekranında ödeme tamamlandığında otomatik müşteri fişi çıkartılsın mı?' },
        { module: 'kitchen', key: 'auto_open_product_options', value: 'true', label: 'Ürün Seçince Detay Ekranını Otomatik Aç', type: 'boolean', description: 'Ürün seçildiğinde ekstra ve mutfak notu ekranının otomatik açılıp açılmayacağını belirler.' },
        { module: 'pos', key: 'waiters_can_order_to_any_table', value: 'true', label: 'Garsonlar Tüm Masalara Sipariş Ekleyebilsin', type: 'boolean', description: 'Pasif edilirse garsonlar sadece kendi açtıkları veya kendilerine atanan masalara sipariş ekleyebilir.' },
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
