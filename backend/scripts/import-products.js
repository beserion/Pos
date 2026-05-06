require('dotenv').config();
const sql = require('mssql');
const xlsx = require('xlsx');
const path = require('path');

const config = {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function importProducts() {
  let pool;
  try {
    console.log('Veritabanına bağlanılıyor...');
    pool = await sql.connect(config);
    console.log('Bağlantı başarılı.');

    const filePath = 'c:/Github/Pos/.PROMPTS/ürüler list.xls';
    console.log(`Excel dosyası okunuyor: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`${data.length} adet satır okundu. İşlem başlıyor...`);

    // 1. Ürün Cinslerini (Product Types) hazırla
    const productTypeMap = new Map();
    const uniqueTypes = [...new Set(data.map(row => row['ürüncins_adi']).filter(Boolean))];

    for (const typeName of uniqueTypes) {
      // Mevcut mu kontrol et
      const checkRes = await pool.request()
        .input('name', sql.NVarChar, typeName)
        .query('SELECT id FROM product_types WHERE name = @name');

      if (checkRes.recordset.length > 0) {
        productTypeMap.set(typeName, checkRes.recordset[0].id);
      } else {
        // Yeni ekle
        const insertRes = await pool.request()
          .input('name', sql.NVarChar, typeName)
          .input('isActive', sql.Bit, 1)
          .input('now', sql.DateTime, new Date())
          .query('INSERT INTO product_types (name, isActive, createdAt, updatedAt) OUTPUT INSERTED.id VALUES (@name, @isActive, @now, @now)');
        
        productTypeMap.set(typeName, insertRes.recordset[0].id);
        console.log(`Yeni ürün cinsi eklendi: ${typeName}`);
      }
    }

    // 2. Ürünleri (Products) işle
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const row of data) {
      const sku = String(row['ürün kodu'] || '').trim();
      const name = String(row['ürün adi'] || '').trim();
      if (!sku || !name) continue;

      const category = String(row['ürün grup'] || '').trim();
      const barcode = row['barkod'] ? String(row['barkod']).trim() : null;
      const unit = String(row['birim'] || 'ADET').trim();
      const price = parseFloat(row['fiyat1']) || 0;
      const vatRate = parseFloat(row['kdvsatis']) || 0;
      const typeName = row['ürüncins_adi'];
      const productTypeId = typeName ? productTypeMap.get(typeName) : null;

      try {
        // Mevcut ürünü kontrol et
        const checkProduct = await pool.request()
          .input('sku', sql.NVarChar, sku)
          .query('SELECT id FROM products WHERE sku = @sku');

        if (checkProduct.recordset.length > 0) {
          // GÜNCELLE
          await pool.request()
            .input('id', sql.Int, checkProduct.recordset[0].id)
            .input('name', sql.NVarChar, name)
            .input('sku', sql.NVarChar, sku)
            .input('posName', sql.NVarChar, name)
            .input('kitchenName', sql.NVarChar, name)
            .input('barcode', sql.NVarChar, barcode)
            .input('price', sql.Decimal(10, 2), price)
            .input('vatRate', sql.Decimal(10, 2), vatRate)
            .input('category', sql.NVarChar, category)
            .input('unit', sql.NVarChar, unit)
            .input('productTypeId', sql.Int, productTypeId)
            .input('now', sql.DateTime, new Date())
            .query(`
              UPDATE products 
              SET name = @name, 
                  posName = @posName, 
                  kitchenName = @kitchenName, 
                  barcode = @barcode, 
                  price = @price, 
                  vatRate = @vatRate, 
                  category = @category, 
                  unit = @unit, 
                  productTypeId = @productTypeId,
                  updatedAt = @now
              WHERE id = @id
            `);
          updatedCount++;
        } else {
          // EKLE
          await pool.request()
            .input('name', sql.NVarChar, name)
            .input('sku', sql.NVarChar, sku)
            .input('posName', sql.NVarChar, name)
            .input('kitchenName', sql.NVarChar, name)
            .input('barcode', sql.NVarChar, barcode)
            .input('price', sql.Decimal(10, 2), price)
            .input('vatRate', sql.Decimal(10, 2), vatRate)
            .input('category', sql.NVarChar, category)
            .input('isActive', sql.Bit, 1)
            .input('posVisible', sql.Bit, 1)
            .input('takeawayVisible', sql.Bit, 1)
            .input('deliveryVisible', sql.Bit, 1)
            .input('qrVisible', sql.Bit, 1)
            .input('kioskVisible', sql.Bit, 1)
            .input('unit', sql.NVarChar, unit)
            .input('productTypeId', sql.Int, productTypeId)
            .input('now', sql.DateTime, new Date())
            .query(`
              INSERT INTO products (
                name, sku, posName, kitchenName, barcode, price, vatRate, category, 
                isActive, posVisible, takeawayVisible, deliveryVisible, qrVisible, kioskVisible, 
                unit, productTypeId, createdAt, updatedAt, orderIndex, openPriceEnabled, 
                discountAllowed, compAllowed, isQuickSale, isIngredient, isSet
              ) VALUES (
                @name, @sku, @posName, @kitchenName, @barcode, @price, @vatRate, @category, 
                @isActive, @posVisible, @takeawayVisible, @deliveryVisible, @qrVisible, @kioskVisible, 
                @unit, @productTypeId, @now, @now, 0, 0, 1, 1, 0, 0, 0
              )
            `);
          addedCount++;
        }
      } catch (err) {
        console.error(`Ürün işlenirken hata (SKU: ${sku}):`, err.message);
        errorCount++;
      }
    }

    console.log('--- İşlem Tamamlandı ---');
    console.log(`Yeni Eklenen: ${addedCount}`);
    console.log(`Güncellenen: ${updatedCount}`);
    console.log(`Hatalı: ${errorCount}`);

  } catch (err) {
    console.error('Genel Hata:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

importProducts();
