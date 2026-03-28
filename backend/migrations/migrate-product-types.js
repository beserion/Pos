/**
 * Migration: Mevcut product.category değerlerinden product_types tablosunu seed'le
 * ve product.productTypeId eşleştirmesi yap.
 * 
 * Kullanım: node migrations/migrate-product-types.js
 */
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'AntigravityPOS',
  user: process.env.DB_USERNAME || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE || undefined,
  },
};

if (!process.env.DB_INSTANCE) {
  config.port = parseInt(process.env.DB_PORT || '1433', 10);
}

// Varsayılan ürün cinsleri ve category eşleşmeleri
const DEFAULT_TYPES = [
  { name: 'İçecek' },
  { name: 'Yiyecek' },
  { name: 'Tatlı' },
  { name: 'Diğer' },
];

// Category → ProductType eşlemesi
const CATEGORY_MAP = {
  'Sıcak İçecek': 'İçecek',
  'Soğuk İçecek': 'İçecek',
  'Yiyecek': 'Yiyecek',
  'Tatlı': 'Tatlı',
  'Yan Ürün': 'Diğer',
};

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('DB bağlantısı kuruldu.');

    // 1. Varsayılan ürün cinslerini ekle (varsa atla)
    for (const type of DEFAULT_TYPES) {
      const existing = await pool.request()
        .input('name', sql.NVarChar, type.name)
        .query('SELECT id FROM product_types WHERE name = @name');

      if (existing.recordset.length === 0) {
        await pool.request()
          .input('name', sql.NVarChar, type.name)
          .query('INSERT INTO product_types (name, isActive, outputProfileId) VALUES (@name, 1, 0)');
        console.log(`  ✓ Ürün cinsi eklendi: ${type.name}`);
      } else {
        console.log(`  ○ Ürün cinsi zaten var: ${type.name}`);
      }
    }

    // 2. Mevcut product.category → productTypeId eşlemesi
    const typeRows = await pool.request()
      .query('SELECT id, name FROM product_types');
    const typeMap = {};
    for (const row of typeRows.recordset) {
      typeMap[row.name] = row.id;
    }

    for (const [category, typeName] of Object.entries(CATEGORY_MAP)) {
      const typeId = typeMap[typeName];
      if (!typeId) continue;

      const result = await pool.request()
        .input('category', sql.NVarChar, category)
        .input('typeId', sql.Int, typeId)
        .query(`UPDATE products SET productTypeId = @typeId WHERE category = @category AND (productTypeId IS NULL OR productTypeId = 0)`);

      console.log(`  ✓ "${category}" → "${typeName}" (typeId: ${typeId}): ${result.rowsAffected[0]} ürün güncellendi`);
    }

    // 3. "Yazdırma Yok" varsayılan profilini oluştur
    const existingProfile = await pool.request()
      .input('name', sql.NVarChar, 'Yazdırma Yok')
      .query('SELECT id FROM output_profiles WHERE name = @name');

    if (existingProfile.recordset.length === 0) {
      await pool.request()
        .input('name', sql.NVarChar, 'Yazdırma Yok')
        .query(`INSERT INTO output_profiles (name, noOutput, isActive, kdsEnabled, infoOnly, warnIfNoPrinter, copyCount, mainPrinterId, infoPrinterId) 
                VALUES (@name, 1, 1, 0, 0, 0, 1, 0, 0)`);
      console.log('  ✓ "Yazdırma Yok" profili oluşturuldu.');
    } else {
      console.log('  ○ "Yazdırma Yok" profili zaten var.');
    }

    console.log('\n✅ Migration tamamlandı!');
  } catch (err) {
    console.error('Migration hatası:', err);
  } finally {
    if (pool) await pool.close();
  }
}

run();
